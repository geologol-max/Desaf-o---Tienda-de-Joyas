import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface Joya {
  id: number;
  nombre: string;
  categoria: string;
  metal: string;
  precio: number;
  stock: number;
}

// Datos iniciales idénticos a los del script SQL oficial de Desafío Latam
export const DATOS_INICIALES: Joya[] = [
  { id: 1, nombre: 'Collar Heart', categoria: 'collar', metal: 'oro', precio: 20000, stock: 2 },
  { id: 2, nombre: 'Collar History', categoria: 'collar', metal: 'plata', precio: 15000, stock: 5 },
  { id: 3, nombre: 'Aros Berry', categoria: 'aros', metal: 'oro', precio: 12000, stock: 10 },
  { id: 4, nombre: 'Aros Hook Blue', categoria: 'aros', metal: 'oro', precio: 25000, stock: 4 },
  { id: 5, nombre: 'Anillo Wish', categoria: 'aros', metal: 'plata', precio: 30000, stock: 4 },
  { id: 6, nombre: 'Anillo Cuarzo Greece', categoria: 'anillo', metal: 'oro', precio: 40000, stock: 2 },
];

let inventarioMemoria: Joya[] = JSON.parse(JSON.stringify(DATOS_INICIALES));

// Configuración del Pool de PostgreSQL según variables de entorno
export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'joyas',
  allowExitOnIdle: true,
  connectionTimeoutMillis: 1500,
});

let isPostgresAvailable = false;
let dbCheckDone = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  if (dbCheckDone) return isPostgresAvailable;
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), NOW()');
    client.release();
    isPostgresAvailable = true;
    dbCheckDone = true;
    console.log(`[DB] Conectado exitosamente a PostgreSQL (Base de datos: ${res.rows[0].current_database})`);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[DB] No se pudo conectar a PostgreSQL local (${message}).`);
    console.warn(`[DB] -> Se utilizará el repositorio en memoria con los 6 registros de prueba oficiales.`);
    console.warn(`[DB] -> Si deseas usar PostgreSQL local: Asegúrate de crear la BD con 'psql -f joyas.sql' y configurar el archivo .env.`);
    isPostgresAvailable = false;
    dbCheckDone = true;
    return false;
  }
}

export function isUsingPostgres(): boolean {
  return isPostgresAvailable;
}

export function reiniciarDatosMemoria(): void {
  inventarioMemoria = JSON.parse(JSON.stringify(DATOS_INICIALES));
}

export function getInventarioMemoria(): Joya[] {
  return inventarioMemoria;
}

/**
 * Ejecutor de queries que consulta PostgreSQL si está activo o resuelve contra el repositorio en memoria
 */
export async function executeQuery(text: string, params: unknown[] = []): Promise<{ rows: Joya[]; rowCount: number }> {
  await checkDatabaseConnection();

  if (isPostgresAvailable) {
    const result = await pool.query(text, params);
    return {
      rows: result.rows as Joya[],
      rowCount: result.rowCount || 0,
    };
  }

  // Fallback transparente en memoria para testing y previsualización
  return executeInMemoryQuery(text, params);
}

function executeInMemoryQuery(sql: string, params: unknown[] = []): { rows: Joya[]; rowCount: number } {
  let items = [...inventarioMemoria];

  const whereIdx = sql.toUpperCase().indexOf(' WHERE ');
  if (whereIdx !== -1) {
    let whereClause = sql.slice(whereIdx + 7);
    const orderIdx = whereClause.toUpperCase().indexOf(' ORDER BY ');
    if (orderIdx !== -1) whereClause = whereClause.slice(0, orderIdx);
    const limitIdx = whereClause.toUpperCase().indexOf(' LIMIT ');
    if (limitIdx !== -1) whereClause = whereClause.slice(0, limitIdx);
    const offsetIdx = whereClause.toUpperCase().indexOf(' OFFSET ');
    if (offsetIdx !== -1) whereClause = whereClause.slice(0, offsetIdx);

    const conditions = whereClause.split(/\s+AND\s+/i);

    items = items.filter((item) => {
      return conditions.every((cond) => {
        const paramMatch = cond.trim().match(/([a-zA-Z0-9_]+)\s*(=|<=|>=|<|>)\s*\$(\d+)/);
        if (paramMatch) {
          const col = paramMatch[1].toLowerCase() as keyof Joya;
          const op = paramMatch[2];
          const paramIndex = parseInt(paramMatch[3], 10) - 1;
          const val = params[paramIndex];

          const itemVal = item[col];
          if (op === '=') {
            return String(itemVal).trim().toLowerCase() === String(val).trim().toLowerCase();
          }
          if (op === '>=') return Number(itemVal) >= Number(val);
          if (op === '<=') return Number(itemVal) <= Number(val);
          if (op === '>') return Number(itemVal) > Number(val);
          if (op === '<') return Number(itemVal) < Number(val);
        }
        return true;
      });
    });
  }

  // Parsing ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+([a-zA-Z0-9_]+)\s+(ASC|DESC)/i);
  if (orderMatch) {
    const col = orderMatch[1].toLowerCase() as keyof Joya;
    const direction = orderMatch[2].toUpperCase();
    items.sort((a, b) => {
      const valA = a[col];
      const valB = b[col];
      if (valA < valB) return direction === 'ASC' ? -1 : 1;
      if (valA > valB) return direction === 'ASC' ? 1 : -1;
      return 0;
    });
  }

  // Parsing OFFSET y LIMIT
  const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);

  const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : items.length;

  const paginated = items.slice(offset, offset + limit);

  return {
    rows: paginated,
    rowCount: paginated.length,
  };
}
