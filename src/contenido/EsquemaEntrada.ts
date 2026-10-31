/**
 * Esquema JSON de la entrada de contenido (`ESQUEMA_JSON.md`).
 * Describe las claves que se entregan: `titulo`, `subtitulo`, `pie`
 * y `secciones` (resumen, lista o tabla).
 */
export const ESQUEMA_ENTRADA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Entrada de contenido",
  type: "object",
  properties: {
    titulo: { type: "string" },
    subtitulo: { type: "string" },
    pie: { type: "string" },
    secciones: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              tipo: { const: "resumen" },
              titulo: { type: "string" },
              texto: { type: "string" },
              figura: { type: "string" },
            },
            required: ["tipo", "titulo", "texto"],
          },
          {
            type: "object",
            properties: {
              tipo: { const: "lista" },
              titulo: { type: "string" },
              elementos: {
                type: "array",
                items: {
                  oneOf: [
                    { type: "string" },
                    { type: "array", items: { type: "string" } },
                  ],
                },
              },
              figura: { type: "string" },
            },
            required: ["tipo", "titulo", "elementos"],
          },
          {
            type: "object",
            properties: {
              tipo: { const: "tabla" },
              titulo: { type: "string" },
              celdas: {
                type: "object",
                propertyNames: { pattern: "^[A-Za-z]+[0-9]+$" },
                additionalProperties: { type: ["string", "number"] },
              },
              figura: { type: "string" },
            },
            required: ["tipo", "celdas"],
          },
        ],
      },
    },
  },
} as const;
