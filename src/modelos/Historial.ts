import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { desc, eq } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

/** Conversación persistida en el historial. */
export interface Conversacion {
  /** Identificador único de la conversación. */
  id: string;
  /** Título editable de la conversación. */
  titulo: string;
  /** Momento de creación (ms). */
  creada: number;
  /** Última actividad (ms). */
  actualizada: number;
}

/** Mensaje dentro de una conversación. */
export interface Mensaje {
  /** Identificador secuencial del mensaje. */
  id: number;
  /** Conversación a la que pertenece el mensaje. */
  conversacionId: string;
  /** Autor del mensaje. */
  rol: "user" | "assistant";
  /** Contenido del mensaje. */
  contenido: string;
  /** Momento (ms). */
  creada: number;
}

/**
 * Modelo del historial: consultas de conversaciones y mensajes en SQLite (`bun:sqlite`) con Drizzle.
 */
export class Historial {
  /** Base de datos Drizzle, creada en el primer uso. */
  private static base: ReturnType<typeof Historial.crearBase> | null = null;

  /** Tabla de conversaciones. */
  static readonly CONVERSACIONES = sqliteTable("conversaciones", {
    id: text("id").primaryKey(),
    titulo: text("titulo").notNull(),
    creada: integer("creada").notNull(),
    actualizada: integer("actualizada").notNull(),
  });

  /** Tabla de mensajes. */
  static readonly MENSAJES = sqliteTable("mensajes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    conversacionId: text("conversacion_id").notNull().references(() => Historial.CONVERSACIONES.id, { onDelete: "cascade" }),
    rol: text("rol").notNull(),
    contenido: text("contenido").notNull(),
    creada: integer("creada").notNull(),
  });

  /**
   * Crea una conexión a la base de datos en `~/.secti_addons/historial.sqlite` (la crea si no existe).
   * @returns Base de datos Drizzle con el esquema.
   */
  private static crearBase() {
    const sqlite = new Database(join(homedir(), ".secti_addons", "historial.sqlite"), { create: true });
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS conversaciones (id TEXT PRIMARY KEY, titulo TEXT NOT NULL, creada INTEGER NOT NULL, actualizada INTEGER NOT NULL);
       CREATE TABLE IF NOT EXISTS mensajes (id INTEGER PRIMARY KEY AUTOINCREMENT, conversacion_id TEXT NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE, rol TEXT NOT NULL, contenido TEXT NOT NULL, creada INTEGER NOT NULL);
       CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id);`,
    );
    return drizzle(sqlite, { schema: { conversaciones: Historial.CONVERSACIONES, mensajes: Historial.MENSAJES } });
  }

  /**
   * Devuelve la base de datos, creándola en el primer uso.
   * @returns Base de datos Drizzle con el esquema.
   */
  private static abrir() {
    if (!Historial.base) Historial.base = Historial.crearBase();
    return Historial.base;
  }

  /**
   * Inserta una conversación.
   * @param titulo Título inicial.
   * @returns La conversación creada.
   */
  static crear(titulo: string): Conversacion {
    const ahora = Date.now();
    const id = randomUUID();
    Historial.abrir().insert(Historial.CONVERSACIONES).values({ id, titulo, creada: ahora, actualizada: ahora }).run();
    return { id, titulo, creada: ahora, actualizada: ahora };
  }

  /**
   * Lista las conversaciones más recientes primero.
   * @returns Conversaciones guardadas.
   */
  static listar(): Conversacion[] {
    return Historial.abrir().select().from(Historial.CONVERSACIONES).orderBy(desc(Historial.CONVERSACIONES.actualizada)).all();
  }

  /**
   * Busca una conversación por identificador.
   * @param id Identificador de la conversación.
   * @returns La conversación o `undefined` si no existe.
   */
  static obtener(id: string): Conversacion | undefined {
    return Historial.abrir().select().from(Historial.CONVERSACIONES).where(eq(Historial.CONVERSACIONES.id, id)).get();
  }

  /**
   * Actualiza el título de una conversación.
   * @param id Identificador de la conversación.
   * @param titulo Nuevo título.
   */
  static renombrar(id: string, titulo: string): void {
    Historial.abrir().update(Historial.CONVERSACIONES).set({ titulo }).where(eq(Historial.CONVERSACIONES.id, id)).run();
  }

  /**
   * Borra una conversación y todos sus mensajes.
   * @param id Identificador de la conversación.
   */
  static borrar(id: string): void {
    Historial.abrir().delete(Historial.MENSAJES).where(eq(Historial.MENSAJES.conversacionId, id)).run();
    Historial.abrir().delete(Historial.CONVERSACIONES).where(eq(Historial.CONVERSACIONES.id, id)).run();
  }

  /**
   * Lista los mensajes de una conversación en orden de llegada.
   * @param id Identificador de la conversación.
   * @returns Mensajes guardados.
   */
  static mensajesDe(id: string): Mensaje[] {
    return Historial.abrir().select().from(Historial.MENSAJES).where(eq(Historial.MENSAJES.conversacionId, id)).orderBy(Historial.MENSAJES.id).all() as Mensaje[];
  }

  /**
   * Inserta un mensaje y actualiza la última actividad de su conversación.
   * @param conversacionId Identificador de la conversación.
   * @param rol Autor del mensaje.
   * @param contenido Contenido del mensaje.
   */
  static agregar(conversacionId: string, rol: Mensaje["rol"], contenido: string): void {
    const ahora = Date.now();
    Historial.abrir().insert(Historial.MENSAJES).values({ conversacionId, rol, contenido, creada: ahora }).run();
    Historial.abrir().update(Historial.CONVERSACIONES).set({ actualizada: ahora }).where(eq(Historial.CONVERSACIONES.id, conversacionId)).run();
  }
}
