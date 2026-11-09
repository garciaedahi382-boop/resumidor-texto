# Diagramas — referencia técnica

Renderizadores de diagramas a PNG con `@napi-rs/canvas`. Cada tipo es una subclase de `DiagramRenderer` registrada en `Diagramador.RENDERERS`.

## `DiagramRenderer.ts` (base abstracta)

| Miembro | Para qué sirve |
|---|---|
| `type` | Identificador del diagrama; también nombra el archivo (`<tipo>.png`). |
| `schema` | Descripción textual de los datos que espera `draw`; se envía al agente en el prompt. |
| `extension` | Siempre `"png"`. |
| `dir` | Directorio de salida (`diagramas` por defecto, ajustable). |
| `draw(ctx, data)` | Dibujo propio de cada tipo sobre el contexto. |
| `ancho(data)` / `alto(data)` | Tamaño del lienzo según los datos; mínimo 1600×900. |
| `render(file, data)` | Calcula tamaño, pinta fondo y título, llama `draw` y escribe el PNG. |
| `prompt(entidad, texto, herramienta?)` | Construye la instrucción que pide al agente los datos JSON y la llamada a la tool. |
| `roundRect`, `box`, `wrap`, `arrow`, `line`, `smallText` | Helpers de dibujo disponibles para las subclases. |

## Tipos registrados

| `type` | Clase | Datos que espera |
|---|---|---|
| `ishikawa` | `IshikawaRenderer` | `problema` + `causas[{categoria, causas[]}]` |
| `venn` | `VennRenderer` | `conjuntos[{etiqueta, elementos[]}]` (2–5) |
| `cuadro-sinoptico` | `SinopticoRenderer` | `raiz` + `ramas[{titulo, hojas[]}]` |
| `mapa-conceptual` | `MapaConceptualRenderer` | `nodos[{id, texto}]` + `enlaces[{desde, hacia, etiqueta}]` |
| `flujo` | `FlujoRenderer` | `pasos[]` (3–15) |
| `arbol` | `ArbolRenderer` | `raiz` + `hijos[]` |
| `pert` | `PertRenderer` | `tareas[{id, duracion, dependencias[]}]` |
| `gantt` | `GanttRenderer` | `tareas[{nombre, inicio, duracion}]` |
| `radar` | `RadarRenderer` | `ejes[]` + `series[{nombre, valores[]}]` |
| `mapa-calor` | `MapaCalorRenderer` | `filas`, `columnas`, `celdas[{fila, columna, valor}]` |
| `tendencia` | `TendenciaRenderer` | `etiquetas[]` + `series[{nombre, valores[]}]` |
| `pareto` | `ParetoRenderer` | `causas[{nombre, valor}]` (se ordenan) |
| `flujo-proceso` | `FlujoProcesoRenderer` | `pasos[{id, tipo, texto}]` + `conexiones[]` |
| `arbol-decision` | `ArbolDecisionRenderer` | `nodos[{id, texto}]` + `ramas[{desde, hacia, etiqueta}]` |
| `flujo-actualizacion` | `FlujoActualizacionRenderer` | `fases[{nombre, estado, detalle}]` |
| `sipoc` | `SipocRenderer` | `proveedores`, `entradas`, `proceso`, `salidas`, `clientes` |
| `mapa-flujo-valor` | `MapaFlujoValorRenderer` | `pasos[{nombre, tiempo, espera, valor}]` |

Los límites exactos de cada estructura están en el `schema` de su clase; el agente los recibe en el prompt.

## Añadir un tipo

1. Crear la subclase con `type`, `schema` y `draw`.
2. Registrarla en `Diagramador.RENDERERS` (`src/agente/subagents/Diagramador.ts`).

Con eso queda disponible en la tool `renderizar_diagrama`, en el workflow y en la API, sin tocar nada más.
