# Skills — referencia técnica

Skills del usuario en `~/.koalacowork`, en formato Agent Skills de Mastra: una carpeta por skill con su `SKILL.md` (frontmatter + instrucciones en Markdown).

## `SkillsStore.ts`

| Miembro | Para qué sirve |
|---|---|
| `DIR` | Raíz de las skills (`~/.koalacowork`). |
| `escribir(nombre, descripcion, instrucciones)` | Arma el `SKILL.md`, lo valida con `validateSkillContent` y lo guarda en `<DIR>/<nombre>/SKILL.md`. Devuelve la ruta. |
| `listar()` | Nombres de las carpetas de skills; `[]` si la raíz no existe. |
| `instrucciones(nombre)` | Contenido del `SKILL.md` sin el frontmatter; `null` si no existe. |

`escribir` lanza `"Skill inválida: ..."` con los errores de Mastra si el nombre o el contenido no cumplen el formato.
