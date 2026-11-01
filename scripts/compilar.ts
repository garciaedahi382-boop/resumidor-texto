import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Compila el ejecutable de Koala Cowork y deja junto a él los datos que la
 * librería de dibujo lee del disco en tiempo de ejecución, porque no viajan
 * dentro del binario.
 */
class Compilar {
  /** Ejecutable generado por la compilación. */
  static readonly SALIDA = join("dist", "koala-cowork.exe");
  /** Argumentos de `bun build`. */
  private static readonly ARGS: string[] = ["build", "index.ts", "--compile", "--outfile", Compilar.SALIDA];

  /**
   * Compila y copia los datos de dibujo.
   * @throws Error si la compilación falla o si faltan los datos.
   */
  static main(): void {
    const compilacion = Bun.spawnSync([process.execPath, ...Compilar.ARGS], { stdout: "inherit", stderr: "inherit" });
    if (compilacion.exitCode !== 0) throw new Error(`La compilación falló con código ${compilacion.exitCode}`);
    Compilar.datos();
    console.log(`Ejecutable listo: ${Compilar.SALIDA}`);
  }

  /**
   * Copia el `icudtl.dat` de la plataforma al lado del ejecutable.
   * @throws Error si no se encuentra el archivo en `node_modules`.
   */
  private static datos(): void {
    const raiz = join("node_modules", "@napi-rs");
    const origen = readdirSync(raiz)
      .map((carpeta) => join(raiz, carpeta, "icudtl.dat"))
      .find((archivo) => existsSync(archivo));
    if (!origen) throw new Error("No se encontró icudtl.dat en node_modules/@napi-rs");
    mkdirSync("dist", { recursive: true });
    copyFileSync(origen, join("dist", "icudtl.dat"));
    console.log(`Datos de dibujo copiados: ${origen} -> dist/icudtl.dat`);
  }
}

Compilar.main();
