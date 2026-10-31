import { Seccion } from "./Seccion";
import "./SeccionResumen";
import "./SeccionLista";
import "./SeccionTabla";

/**
 * Punto de entrada de las secciones: cargar este módulo aplica el decorador
 * `Seccion.tipo` de cada tipo y expone la base {@link Seccion}.
 */
export { Seccion };
export type { DatosSeccion, Punto } from "./Seccion";
