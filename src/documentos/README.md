# Documentos — referencia técnica

Generadores de archivos Word (`.docx`) con la librería `docx`. Cada tipo se registra en `Documentador.DOCUMENTOS` y comparte el contrato de `Registro.Entidad` (`type`, `schema`, `extension`, `dir`, `render`).

## `TablaCambiosDocx.ts`

| Miembro | Para qué sirve |
|---|---|
| `type` | `"tabla-cambios"`; nombra el archivo (`tabla-cambios.docx`). |
| `schema` | Estructura esperada: `{"columnas":["texto"],"filas":[["texto"]]}` (máx. 8 columnas y 15 filas). |
| `extension` / `dir` | `"docx"` y `"documentos"` (ajustable). |
| `render(archivo, data)` | Construye el documento con el título y la tabla, y escribe el `.docx`. |
| `tabla(columnas, filas)` (privado) | Tabla al 100% de ancho con la primera fila como encabezado. |
| `celda(texto, encabezado)` (privado) | Celda con negrita y fondo resaltado si es encabezado. |

## Añadir un tipo

1. Crear la clase con `type`, `schema`, `extension = "docx"`, `dir` y `render(archivo, data)`.
2. Registrarla en `Documentador.DOCUMENTOS` (`src/agente/subagents/Documentador.ts`).

Queda disponible en la tool `renderizar_documento`, en el workflow y en la API.
