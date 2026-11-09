# Modelos — referencia técnica

Acceso a datos. Solo consultas: no validan entrada ni conocen HTTP.

## `Historial.ts`

Persiste conversaciones y mensajes en SQLite (`bun:sqlite` + Drizzle) en `~/.secti_addons/historial.sqlite`; crea las tablas e índices en el primer uso.

| Miembro | Para qué sirve |
|---|---|
| `Conversacion` | `id`, `titulo`, `creada`, `actualizada` (ms). |
| `Mensaje` | `id`, `conversacionId`, `rol` (`user`/`assistant`), `contenido`, `creada` (ms). |
| `CONVERSACIONES` / `MENSAJES` | Definición de las tablas para Drizzle. |
| `crear(titulo)` | Inserta una conversación con `randomUUID()` y devuelve la fila creada. |
| `listar()` | Conversaciones ordenadas por última actividad, descendente. |
| `obtener(id)` | Una conversación, o `undefined`. |
| `renombrar(id, titulo)` | Actualiza el título. |
| `borrar(id)` | Borra los mensajes y luego la conversación. |
| `mensajesDe(id)` | Mensajes de la conversación en orden de inserción. |
| `agregar(conversacionId, rol, contenido)` | Inserta el mensaje y actualiza `actualizada`. |

La ruta del archivo y el esquema están fijos en la clase; `abrir()` y `crearBase()` son privados y cachean la conexión.
