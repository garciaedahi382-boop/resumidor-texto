# Configuración — referencia técnica

Resuelve de dónde salen el proveedor, la URL, la API key y el modelo que usan los agentes. Es la única fuente que lee `KoalaAgente.getInstance()`.

## `ConfigStore.ts`

Persiste la configuración propia en `~/.secti_addons/modelr.json`.

| Miembro | Para qué sirve |
|---|---|
| `ModelrConfig` | Forma de la configuración: `provider?`, `url?`, `apiKey?`, `model?`. |
| `load()` | Devuelve la configuración vigente; prioriza la de Oselotl Cowork y, si no existe, lee el archivo propio. Sin archivo devuelve `{}`. |
| `save(config)` | Escribe la configuración completa en `modelr.json`, creando `~/.secti_addons` si falta. |

`load` no valida: si falta un campo, el error lo da `ModeloLlm.resolver` al construir el modelo.

## `OselotlConfig.ts`

Lee la configuración que Oselotl Cowork guarda en `~/.oselotl/providers.json` y la traduce al formato propio.

| Miembro | Para qué sirve |
|---|---|
| `ProveedorOselotl` | Forma de un proveedor en ese archivo: `apiKey?`, `model?`, `baseUrl?`. |
| `resolver()` | Toma el primer proveedor con `apiKey` y `model`, y lo devuelve como `ModelrConfig` con `provider: "openai"`. Devuelve `null` si no hay archivo, si es JSON inválido o si ningún proveedor está completo. |

## Orden de resolución

```
ConfigStore.load()
  └─ OselotlConfig.resolver()   -> si devuelve datos, se usan
  └─ ~/.secti_addons/modelr.json -> si no, se usa este
```
