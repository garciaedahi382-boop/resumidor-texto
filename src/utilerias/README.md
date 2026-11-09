# Utilerías — referencia técnica

Acciones compartidas por los registros de archivos (diagramas y documentos). No contienen datos propios de un tipo.

## `Registro.ts`

| Miembro | Para qué sirve |
|---|---|
| `Entidad` | Contrato de lo registrable: `dir`, `extension` y `render(archivo, datos)`. |
| `tipos` | Nombres registrados, en el orden en que se declararon. |
| `tomar(tipo)` | Devuelve la entidad; lanza `"Tipo no soportado: <tipo>"` si no existe. |
| `calcularRuta(tipo)` | Devuelve `<dir>/<tipo>.<extension>`; no toca el disco. |
| `ajustarDirectorio(dir)` | Cambia el `dir` de todas las entidades (lo usa la CLI con `--diagramas`/`--documentos`). |

## `Archivos.ts`

| Miembro | Para qué sirve |
|---|---|
| `preparar(archivo)` | Crea el directorio del archivo y devuelve la misma ruta. |
| `escribir(registro, tipo, datos)` | Prepara la ruta, renderiza la entidad y devuelve `{ archivo }`. Es lo que ejecuta la tool del agente. |
| `verificar(archivo, mensaje)` | Lanza `mensaje` si el archivo no existe; comprueba que el agente escribió lo esperado. |

`preparar` y `verificar` son idempotentes; `escribir` es la única que produce el archivo.
