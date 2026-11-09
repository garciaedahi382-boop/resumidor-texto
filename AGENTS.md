# Reglas del Agente

Herramienta: **Koala Cowork** (instrucciones en `~/.koalacowork`).

## Principios
- Nunca crear algo que no se haya pedido expl\u00edcitamente
- Nunca generar archivos adicionales no solicitados (docs, tests, etc.); la única excepción es el `README.md` de cada módulo, que es obligatorio (ver **Documentación**)
- Solo hacer lo que el usuario dicta
- Ninguna funcionalidad extra no solicitada
- Todo c\u00f3digo auxiliar va dentro de clases, nunca funciones sueltas fuera de clase
- No sobreingenieria en el codigo, dejarlo lo más reducido
- Comentarios únicamente en formato JSDoc, nunca comentarios inline
- Siempre patrones y principios mencionados por el usuario (Builder, DRY, responsabilidad)

## Contexto del proyecto
- Consultar siempre los `README.md` de los módulos implicados antes de leer o cambiar código; son la fuente de contexto del proyecto
- Si falta el README de un módulo o no coincide con el código, señalarlo antes de continuar

## Funciones y código
- Todo método es una **acción**: nombre corto en verbo que diga qué hace y no sea ambiguo (`generar`, `resumir`, `procesar`, `responder`, `calcularRuta`, `verificar`)
- Nunca nombrar un método con un sustantivo (`tipos`, `niveles`, `archivo`, `renderer`, `documento`); un dato o una consulta va como **propiedad** (`RENDERERS.tipos`, `tiposDiagrama`)
- Un método = una acción concreta; si el nombre necesita explicar dos cosas, se parte en dos
- Prohibido repetir métodos entre clases: lo común va en una clase de `src/utilerias` (`Registro`, `Archivos`)
- Prohibidas las capas de reenvío: un método no existe solo para llamar a otro con los mismos parámetros (fachadas intermedias, singletons paralelos)
- Una clase, una responsabilidad: registros y datos en el agente dueño; acciones compartidas en `src/utilerias`
- Nada de código muerto: método, propiedad o parámetro que no se usa se borra
- Lo auxiliar nunca va suelto: siempre dentro de una clase, estático si no necesita estado
- Archivos y clases siempre en **PascalCase** (`KoalaAgente.ts`, `CtrlAgente`, `VistaAgente`); nunca camelCase ni kebab-case en archivos (única excepción: `index.ts` como entrada)
- Métodos y propiedades siempre en **camelCase** (`resumirNiveles`, `calcularRuta`, `tiposDiagrama`, `leerCuerpo`); nunca PascalCase ni snake_case

## MVC
- `src/modelos`: solo consultas a datos; sin validaciones ni HTTP
- `src/controladores`: validan la entrada, deciden el estado HTTP y orquestan modelo + agente
- `src/http`: solo expone la API (app Express y vistas); no valida ni accede a datos
- `src/http/vistas`: declaran los endpoints con `Router` (`registrar()`) y los conectan al controlador
- La vista no valida, el controlador no consulta la base y el modelo no conoce Express
- Un endpoint nuevo = ruta en la vista + método del controlador; nunca lógica en `src/http`

## Documentación
- Cada módulo de `src` lleva su `README.md` técnico, corto y actualizado
- Cada miembro (clase, método, propiedad, tipo) dice **para qué sirve**, no solo su firma
- El README describe solo su módulo; las dependencias externas se mencionan, no se documentan
- Nombres del README idénticos a los del código

## Arquitectura

`index.ts`:Clase Cli(cmd config|summarize|serve)->ConfigStore|KoalaAgente|ServidorHttp
`src/config/ConfigStore.ts`:static load/save ~/.secti_addons/modelr.json{provider,url,apiKey,model}
`src/http/ServidorHttp.ts`:express;iniciar(puerto=3000)=crea app, monta VistaConversaciones+VistaAgente, responderError JSON (status del error o 500) y listen; solo expone la API
`src/http/vistas/VistaConversaciones.ts`:Router GET/POST /api/conversaciones, GET/PATCH/DELETE /api/conversaciones/:id, POST /api/conversaciones/:id/mensajes->CtrlConversaciones
`src/http/vistas/VistaAgente.ts`:Router POST /api/procesar|/resumen|/diagrama|/documento|/ejecutar, GET /download/*ruta->CtrlAgente
`src/controladores/CtrlConversaciones.ts`:valida cuerpo/parametros y orquesta Historial+KoalaAgente.responder;calcularTitulo
`src/controladores/CtrlAgente.ts`:valida entrada y llama KoalaAgente.resumir|procesar|generar;entregar(clase) envia PNG/DOCX;descargar
`src/controladores/Peticion.ts`:leerCuerpo(req)/leerId(req)
`src/modelos/Historial.ts`:modelo SQLite+Drizzle;crear/listar/obtener/renombrar/borrar/mensajesDe/agregar;sin validaciones

`src/agente/KoalaAgente.ts`:singleton agente unificado Mastra;compone ModeloLlm+Resumidor+Diagramador+Documentador;registra sub-agentes+koala+workflow flujo-resumen(step resumir->then step diagrama-<tipo>->then step documento-<tipo>;si conDiagramas=falso se salta);delegar(diagramador,documentador)=tools diagrama_<tipo>/documento_<tipo>;api responder|procesar|resumir|generar;props tiposDiagrama|tiposDocumento
`src/agente/ModeloLlm.ts`:static resolver(cfg)=proveedor/modelo(openai|openrouter)
`src/agente/Contexto.ts`:static contarTokens/dividir;detectarLimite()=/models cacheado(fallback 8192)
`src/agente/subagents/Resumidor.ts`:Agent resumidor;EXTENSIONES 4 niveles;resumir(nivel)|resumirNiveles();si>contexto fragmenta via resumirTexto/dividir
`src/agente/subagents/Diagramador.ts`:Agent diagramador;static RENDERERS=Registro{17},tool renderizar_diagrama;generar(tipo,texto)=Archivos.preparar(calcularRuta)+prompt(DiagramRenderer.prompt)+generate+verificar
`src/agente/subagents/Documentador.ts`:Agent documentador;static DOCUMENTOS=Registro{1},tool renderizar_documento;generar(tipo,texto)=igual con prompt(...,"renderizar_documento")->documentos/<tipo>.docx

`src/skills/SkillsStore.ts`:DIR=~/.koalacowork;escribir(nombre,descripcion,instrucciones)-><nombre>/SKILL.md validado con validateSkillContent(mastra);listar()/instrucciones(nombre)


`src/diagramas/DiagramRenderer.ts`:abstract;abstract type,schema,draw();extension="png",dir="diagramas";opt ancho/alto;render()->canvas png;static prompt({type,schema},texto,herramienta="renderizar_diagrama");helpers roundRect,box,wrap,arrow,line,smallText
`src/diagramas/{Ishikawa,Venn,Sinoptico,MapaConceptual,Flujo,Arbol,Pert,Gantt,Radar,MapaCalor,Tendencia,Pareto,FlujoProceso,ArbolDecision,FlujoActualizacion,Sipoc,MapaFlujoValor}Renderer.ts`:extends,17 tipos PNG
`src/documentos/TablaCambiosDocx.ts`:no extiende;type tabla-cambios,extension="docx",dir="documentos";registrado en Documentador.DOCUMENTOS;render()->docx con libreria `docx`(tabla,encabezado resaltado);salida fuera de diagramas
Nuevo diagrama=nueva subclase en diagramas + registrar en Diagramador.RENDERERS; nuevo documento=clase en documentos + registrar en Documentador.DOCUMENTOS

`src/utilerias/Registro.ts`:clase Registro<T extends Entidad>;prop tipos;tomar(t)/calcularRuta(t)/ajustarDirectorio(dir)
`src/utilerias/Archivos.ts`:static preparar(ruta)(mkdir)/escribir(registro,tipo,datos)(render)/verificar(ruta,mensaje)

## Ejecuci\u00f3n
- Te ejecutas en wsl, pero yo desarrollo (el proyecto está en windows) en windows
- En bash siempre usá rutas WSL `/mnt/c/...`, nunca rutas Windows `C:\...` (los comandos fallan por eso)

## Compilación
- Compilar SIEMPRE con `bun run build` (`scripts/compilar.ts`), nunca `bun build --compile` a mano: genera `dist/koala-cowork.exe` y además deja al lado los datos que Skia necesita
- `bun build --compile` NO incluye `icudtl.dat`, los datos ICU que `@napi-rs/canvas` lee del disco en tiempo de ejecución; dentro del ejecutable `SkIcuLoader` no lo encuentra, falla `ParagraphBuilderImpl.cpp check(fUnicode)` y el proceso muere con `Illegal instruction` al dibujar texto (los diagramas PNG revientan, el resumen y los documentos siguen funcionando)
- Solución: copiar `node_modules/@napi-rs/canvas-<plataforma>/icudtl.dat` junto al ejecutable (`dist/icudtl.dat`); ya lo hace `Compilar.datos()` en `scripts/compilar.ts`, que busca la carpeta de la plataforma dentro de `node_modules/@napi-rs`, así que no hay que fijar el nombre del paquete
- Si el ejecutable falla al dibujar, revisar primero que exista `dist/icudtl.dat` y probarlo con `dist/koala-cowork.exe summarize "texto"` (genera los diagramas)
- Smoke: `bun debug/smoke.ts` usa `dist/koala-cowork.exe` automáticamente si existe (pasos `exe uso` y `exe summarize` con el binario); si no existe, prueba con `bun index.ts`
