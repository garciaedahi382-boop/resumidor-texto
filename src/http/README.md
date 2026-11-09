# HTTP — referencia técnica

Expone la API: crea Express, monta las vistas y arranca el servidor. No valida datos ni accede a la base; eso queda en `src/controladores` y `src/modelos`.

## `ServidorHttp.ts`

| Miembro | Para qué sirve |
|---|---|
| `PUERTO` | Puerto por defecto (3000). |
| `iniciar(puerto)` | Crea la app, activa `express.json`, monta `VistaConversaciones` y `VistaAgente`, registra `responderError` y escucha. |
| `responderError` (privado) | Middleware de errores: responde `{ error }` con el `status` del error o 500, y evita responder dos veces si ya se enviaron cabeceras. |

## Vistas

Cada vista declara sus endpoints y los conecta con su controlador; no contiene lógica.

### `vistas/VistaConversaciones.ts`

| Método | Ruta | Controlador |
|---|---|---|
| GET | `/api/conversaciones` | `CtrlConversaciones.listar` |
| POST | `/api/conversaciones` | `CtrlConversaciones.crear` |
| GET | `/api/conversaciones/:id` | `CtrlConversaciones.obtener` |
| PATCH | `/api/conversaciones/:id` | `CtrlConversaciones.renombrar` |
| DELETE | `/api/conversaciones/:id` | `CtrlConversaciones.borrar` |
| POST | `/api/conversaciones/:id/mensajes` | `CtrlConversaciones.mandarMensaje` |

### `vistas/VistaAgente.ts`

| Método | Ruta | Controlador | Respuesta |
|---|---|---|---|
| POST | `/api/procesar` | `CtrlAgente.procesar` | `{ niveles, archivos }` |
| POST | `/resumen` | `CtrlAgente.resumir` | `{ nivel, resumen }` |
| POST | `/diagrama` | `CtrlAgente.enviarDiagrama` | PNG como adjunto |
| POST | `/documento` | `CtrlAgente.enviarDocumento` | DOCX como adjunto |
| POST | `/ejecutar` | `CtrlAgente.ejecutar` | `{ niveles, archivos }` |
| GET | `/download/*ruta` | `CtrlAgente.descargar` | Archivo del proyecto |

`registrar()` devuelve el `Router`; `ServidorHttp.iniciar` lo monta en la raíz.
