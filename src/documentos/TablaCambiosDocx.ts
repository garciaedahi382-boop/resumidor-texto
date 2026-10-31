import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { writeFileSync } from "node:fs";

/**
 * Genera una tabla de análisis de cambios como documento Word (.docx).
 */
export class TablaCambiosDocx {
  /** Tipo de diagrama. */
  readonly type = "tabla-cambios";
  /** Esquema de datos: columnas de encabezado y filas de celdas. */
  readonly schema = '{"columnas":["texto"],"filas":[["texto"]]} (máximo 8 columnas y 15 filas; cada fila debe tener una celda por columna)';
  /** Extensión del archivo generado. */
  readonly extension = "docx";
  /** Directorio de salida de los documentos Word. */
  readonly dir = "documentos";

  /**
   * Construye el documento y lo escribe en disco.
   * @param archivo Ruta del archivo `.docx` a escribir.
   * @param data Datos de la tabla.
   */
  async render(archivo: string, data: any): Promise<void> {
    const columnas: string[] = data.columnas ?? [];
    const filas: string[][] = data.filas ?? [];
    const documento = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Tabla de análisis de cambios", heading: HeadingLevel.HEADING_1 }),
            this.tabla(columnas, filas),
          ],
        },
      ],
    });
    writeFileSync(archivo, await Packer.toBuffer(documento));
  }

  /**
   * Crea la tabla con encabezado resaltado.
   * @param columnas Textos del encabezado.
   * @param filas Filas de celdas.
   * @returns Tabla de docx.
   */
  private tabla(columnas: string[], filas: string[][]): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: columnas.map((columna) => this.celda(columna, true)) }),
        ...filas.map((fila) => new TableRow({ children: fila.map((celda) => this.celda(String(celda ?? ""), false)) })),
      ],
    });
  }

  /**
   * Crea una celda con su párrafo.
   * @param texto Texto de la celda.
   * @param encabezado Si es celda de encabezado (negrita y fondo resaltado).
   * @returns Celda de docx.
   */
  private celda(texto: string, encabezado: boolean): TableCell {
    return new TableCell({
      shading: encabezado ? { type: ShadingType.CLEAR, fill: "D9E2F3", color: "auto" } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: texto, bold: encabezado })] })],
    });
  }
}
