# Controladores — referencia técnica

Validan la entrada, deciden el estado HTTP y orquestan el modelo (`Historial`) con el agente (`KoalaAgente`). No tocan la base de datos ni declaran rutas.

## `Peticion.ts`

| Miembro | Para qué sirve |
|---|---|
| `Cuerpo` | Campos aceptados en el JSON: `texto`, `tipo`, `nivel`, `conDiagramas`, `mensaje`, `titulo`. |
| `leerCuerpo(req)` | Devuelve el cuerpo como `Cuerpo`, o `{}` si no es un objeto. |
| `leerId(req)` | Devuelve `req.params.id` como string, o `""` si no es válido. |

## `CtrlConversaciones.ts`

| Método | Para qué sirve |
|---|---|
| `listar` | Devuelve todas las conversaciones. |
| `crear` | Exige `mensaje` (400 si falta) y crea la conversación con su primera respuesta (201). |
| `obtener` | Devuelve la conversación con sus mensajes (404 si no existe). |
| `renombrar` | Exige `titulo` no vacío (400), recorta a 120 caracteres y guarda. |
| `borrar` | Borra la conversación y sus mensajes (204); 404 si no existe. |
| `mandarMensaje` | Agrega el mensaje, pide respuesta al agente y devuelve la conversación actualizada. |
| `responder` (privado) | Crea la conversación si `id` es `null`, guarda el mensaje del usuario, llama `KoalaAgente.responder` con el historial y guarda la respuesta. Devuelve `null` si la conversación no existe. |
| `calcularTitulo` (privado) | Usa la primera línea del mensaje, máx. 50 caracteres; si queda vacía, `"Nueva conversación"`. |

## `CtrlAgente.ts`

| Método | Para qué sirve |
|---|---|
| `procesar` | Con `conDiagramas` falso resume un nivel y responde `{ niveles, archivos: [] }`; si no, ejecuta el flujo completo. Error del agente -> 500. |
| `resumir` | Valida `nivel` entero 1..4 (400) y devuelve `{ nivel, resumen }`; sin nivel usa 1. |
| `enviarDiagrama` | Delega en `entregar(..., "diagrama")`. |
| `enviarDocumento` | Delega en `entregar(..., "documento")`. |
| `ejecutar` | Corre el flujo completo con `conDiagramas` (por defecto `true`). |
| `descargar` | Envía un archivo del proyecto; 400 si la ruta falta o escapa de `process.cwd()`. |
| `entregar` (privado) | Exige `texto` y `tipo` (400), valida el tipo contra `tiposDiagrama`/`tiposDocumento` (400 con la lista de tipos), genera y envía el archivo como adjunto. |

## Códigos de error

- 400 — falta un campo, `nivel` inválido o tipo no registrado.
- 404 — conversación inexistente.
- 500 — fallo del agente o del flujo.
