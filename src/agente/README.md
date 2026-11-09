# Agente — referencia técnica

Orquesta Mastra dentro de `src/agente`: registra los agentes y el workflow una sola vez y expone la API que consumen la CLI y el servidor HTTP.

Dependencias externas que este módulo solo consume: `ConfigStore` (configuración persistida), los registros de `src/diagramas`/`src/documentos` y `src/utilerias` (`Registro`, `Archivos`).

## Contratos

- `Mensaje = { rol: "user" | "assistant"; contenido: string }` — historial de chat tal como lo persiste el servidor.
- `Resumen = { niveles: [string, string, string, string]; archivos: string[] }` — lo que devuelve el workflow; `niveles` son los 4 resúmenes y `archivos` las rutas generadas.
- `EsquemaEntrada` (`zod`) — valida la entrada del workflow: `{ texto, conDiagramas }`.
- `EsquemaResumen` (`zod`) — valida lo que pasa entre steps: añade `conDiagramas` para que cada step sepa si debe escribir archivo.

## `KoalaAgente.ts`

Única puerta de entrada del módulo: es el dueño de `Mastra`, del agente de chat y del workflow, y el único que instancia subagentes.

| Miembro | Para qué sirve |
|---|---|
| `getInstance()` | Crea (una sola vez por proceso) la instancia con la configuración de `ConfigStore`. |
| `mastra` | Contenedor de Mastra con los 3 subagentes, el agente `koala` y el workflow registrados. |
| `agent` | Agente `koala`, el que responde el chat orquestando a los subagentes y tomando sus resultados. |
| `tiposDiagrama` / `tiposDocumento` | Listas de tipos válidos, tomadas de los registros; sirven para validar entradas HTTP. |
| `resumidor` / `diagramador` / `documentador` | Subagentes expuestos para que el controlador pida el trabajo concreto. |
| `responder(mensajes)` | Contesta el chat recortando el historial a la ventana del modelo. |
| `procesar(texto, conDiagramas)` | Corre el workflow completo y devuelve niveles + archivos. |
| `armarFlujo(agente)` (privado) | Construye los steps del workflow a partir de los registros. |
| `INSTRUCCIONES` (privado) | Prompt del agente `koala`: qué subagente atiende cada pedido. |

Comportamiento:

- `responder` descarta mensajes desde el inicio hasta que el total quepa en `detectarLimite() - 512`; conserva al menos el último. La respuesta es `agent.generate(...).text`.
- `agent` declara `agents` con los 3 subagentes: no crea tools propias, solo los orquesta y toma sus resultados.
- `procesar` devuelve `resultado.result` si `status === "success"`; si `failed` lanza `"El flujo falló: ..."`; cualquier otro estado lanza `"El flujo terminó con estado: ..."`.
- `resumir` del `Resumidor` comprime internamente; nivel fuera de `1..4` lanza `"El nivel debe estar entre 1 y 4"`.
- `diagramador.generar` y `documentador.generar` propagan `"Tipo no soportado: <tipo>"` y `"El agente no generó el diagrama|documento <tipo>"`.

## `subagents/Resumidor.ts`

Produce los 4 niveles de resumen; su tool `resumir` comprime internamente los textos que no caben en el contexto.

| Miembro | Para qué sirve |
|---|---|
| `EXTENSIONES` | Una instrucción por nivel (detallado → síntesis); define la extensión esperada. |
| `instancia` | Expone el `Agent` de Mastra para registrarlo. |
| `crearHerramienta(resumidor)` (privado) | Tool `resumir`: recibe `{ texto, nivel }`, comprime si hace falta y devuelve el resumen. Es la tool propia del agente. |
| `resumir(texto, nivel)` | Comprime el texto y redacta un nivel. |
| `resumirNiveles(texto)` | Comprime una vez y redacta los 4 niveles sobre esa fuente. |
| `redactar(texto, nivel)` (privado) | Una llamada al modelo para un nivel ya comprimido. |

Comportamiento:

- Cada nivel se genera desde la misma fuente (no uno del otro) para que ninguno pierda información.
- El compresor vive dentro del resumidor: el agente no decide cuándo corre.
- `redactar` llama al modelo con `toolChoice: "none"` para que responda el resumen en lugar de volver a invocar la tool.

## `subagents/Compresor.ts`

Proceso interno del agente resumidor: reduce un texto que excede la ventana del modelo para que su tool `resumir` reciba una fuente que sí cabe. No es un agente registrado: usa el `Agent` del resumidor solo para sus llamadas.

| Miembro | Para qué sirve |
|---|---|
| `RESERVA` | Tokens que se apartan al fragmentar, para la instrucción y el resumen previo. |
| `comprimir(texto)` | Devuelve el texto igual si cabe en el contexto; si no, divide con `dividir(texto, limite - RESERVA)`, encadena `"Resumen previo: ..."` entre fragmentos y devuelve el último. |

## `subagents/Diagramador.ts`

Convierte un texto en el PNG de un tipo de diagrama.

| Miembro | Para qué sirve |
|---|---|
| `RENDERERS` | Registro de los 17 tipos: da los tipos válidos y la ruta de salida de cada uno. |
| `instancia` | Expone el `Agent` de Mastra para registrarlo. |
| `renderizarDiagrama()` (privado) | Tool `renderizar_diagrama`: recibe `{ tipo, datos }` y escribe el PNG. Es lo único que el LLM puede ejecutar. |
| `generar(tipo, texto)` | Flujo completo: prepara la ruta, pide los datos al modelo y verifica el archivo. |

`generar` hace `Archivos.preparar(calcularRuta(tipo))` → `agent.generate(DiagramRenderer.prompt(...))` (el modelo responde llamando la tool) → `Archivos.verificar(...)` → devuelve la ruta.

## `subagents/Documentador.ts`

Mismo patrón que `Diagramador`, para DOCX: `DOCUMENTOS` registra los tipos, `renderizarDocumento()` es la tool `renderizar_documento` y `generar(tipo, texto)` produce el archivo y devuelve su ruta.

## `ModeloLlm.ts`

Traduce la configuración persistida (`provider`, `url`, `apiKey`, `model`) al objeto de modelo que reciben todos los `Agent`.

- `resolver(cfg)` valida y normaliza: en `openai` exige `url`, `apiKey` y `model`; en `openrouter` exige `apiKey` y aplica `openai/gpt-4o-mini` y la base de OpenRouter por defecto.
- `Modelo` es el tipo derivado de ese retorno; evita duplicar la forma del objeto.

## `Contexto.ts`

Mide y reparte texto según la ventana del modelo; lo usa el `Compresor` del resumidor.

| Miembro | Para qué sirve |
|---|---|
| `DEFECTO` | Ventana asumida (8192) cuando el proveedor no responde. |
| `contarTokens(texto)` | Estima tokens (4 caracteres ≈ 1 token) para decidir si algo cabe. |
| `dividir(texto, presupuesto)` | Corta por palabras y parte las que exceden el presupuesto; devuelve los trozos ya utilizables. |
| `detectarLimite()` | Consulta `GET {base}/models` y devuelve la ventana real; cachea el valor y nunca lanza. |

## Workflow `flujo-resumen`

Encadena resumen y generación de archivos sin pasar por el LLM del chat: cada step llama directo al subagente.

```
EsquemaEntrada
 ├─ "resumir"           Resumidor.resumirNiveles    → llena niveles
 ├─ "diagrama-<tipo>"   Diagramador.generar         ×17  (usa niveles[0])
 └─ "documento-<tipo>"  Documentador.generar        ×1   (usa niveles[0])
EsquemaResumen
```

- Los steps se registran en `steps` y se encadenan con `.then` en ese orden.
- `conDiagramas = false` hace que cada step generador devuelva `inputData` sin escribir archivo.
- `archivos` acumula rutas en orden; `niveles` no se modifica después del primer step.
- Los tipos salen de `RENDERERS.tipos` y `DOCUMENTOS.tipos` al construir el flujo, así que un tipo nuevo entra sin tocar el workflow.

## Invariantes

- Un solo `Mastra` y una sola lectura de `ConfigStore` por proceso.
- Los subagentes solo se crean dentro de `KoalaAgente`.
- Ningún método de este módulo escribe archivos: todo pasa por `Archivos`.
