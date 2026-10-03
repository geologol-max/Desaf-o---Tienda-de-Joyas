import format from 'pg-format';
import { executeQuery, Joya } from './db.js';

export interface HateoasResultItem {
  name: string;
  href: string;
}

export interface HateoasResponse {
  totalJoyas: number;
  stockTotal: number;
  results: HateoasResultItem[];
}

export interface QueryJoyasOptions {
  limits?: number;
  page?: number;
  order_by?: string;
}

export interface FiltrosJoyasOptions {
  precio_min?: number;
  precio_max?: number;
  categoria?: string;
  metal?: string;
}

/**
 * Función que genera la estructura HATEOAS requerida según la especificación del Desafío
 * Imagen 1 de referencia:
 * {
 *   "totalJoyas": 3,
 *   "stockTotal": 19,
 *   "results": [
 *     { "name": "Anillo Wish", "href": "/joyas/joya/5" }, ...
 *   ]
 * }
 */
export const prepararHATEOAS = (joyas: Joya[]): HateoasResponse => {
  const results: HateoasResultItem[] = joyas.map((joya) => ({
    name: joya.nombre,
    href: `/joyas/joya/${joya.id}`,
  }));

  const totalJoyas = joyas.length;
  const stockTotal = joyas.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);

  return {
    totalJoyas,
    stockTotal,
    results,
  };
};

/**
 * Obtener joyas con paginación, límites y ordenamiento dinámico
 * Requerimiento 1.b:
 * - limits: limita cantidad devuelta
 * - page: número de página
 * - order_by: ej. 'stock_ASC', 'precio_DESC'
 */
export async function obtenerJoyas({
  limits = 10,
  page = 1,
  order_by = 'id_ASC',
}: QueryJoyasOptions): Promise<{ joyas: Joya[]; hateoas: HateoasResponse; querySql: string }> {
  // Parsing y validación segura de order_by
  let campo = 'id';
  let direccion = 'ASC';

  if (order_by) {
    const partes = order_by.split('_');
    if (partes.length === 2) {
      const campoCandidato = partes[0].toLowerCase();
      const dirCandidata = partes[1].toUpperCase();

      const columnasPermitidas = ['id', 'nombre', 'categoria', 'metal', 'precio', 'stock'];
      const direccionesPermitidas = ['ASC', 'DESC'];

      if (columnasPermitidas.includes(campoCandidato)) {
        campo = campoCandidato;
      }
      if (direccionesPermitidas.includes(dirCandidata)) {
        direccion = dirCandidata;
      }
    }
  }

  const limitNum = Math.max(1, Number(limits) || 10);
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * limitNum;

  // Consulta formateada de manera segura con pg-format
  const consultaFormateada = format(
    'SELECT * FROM inventario ORDER BY %s %s LIMIT %s OFFSET %s',
    campo,
    direccion,
    limitNum,
    offset
  );

  const { rows: joyas } = await executeQuery(consultaFormateada);
  const hateoas = prepararHATEOAS(joyas);

  return {
    joyas,
    hateoas,
    querySql: consultaFormateada,
  };
}

/**
 * Obtener joyas aplicando filtros dinámicos con consultas parametrizadas
 * Requerimiento 2 & 5:
 * - precio_min
 * - precio_max
 * - categoria
 * - metal
 * - Consultas parametrizadas con $1, $2, ... para prevenir inyección SQL
 */
export async function obtenerJoyasConFiltros({
  precio_min,
  precio_max,
  categoria,
  metal,
}: FiltrosJoyasOptions): Promise<{ joyas: Joya[]; querySql: string; values: unknown[] }> {
  const filtros: string[] = [];
  const values: unknown[] = [];

  const agregarFiltro = (campo: string, comparador: string, valor: unknown) => {
    values.push(valor);
    const posicion = values.length;
    filtros.push(`${campo} ${comparador} $${posicion}`);
  };

  if (precio_min !== undefined && !isNaN(Number(precio_min))) {
    agregarFiltro('precio', '>=', Number(precio_min));
  }

  if (precio_max !== undefined && !isNaN(Number(precio_max))) {
    agregarFiltro('precio', '<=', Number(precio_max));
  }

  if (categoria && typeof categoria === 'string' && categoria.trim() !== '') {
    agregarFiltro('categoria', '=', categoria.trim().toLowerCase());
  }

  if (metal && typeof metal === 'string' && metal.trim() !== '') {
    agregarFiltro('metal', '=', metal.trim().toLowerCase());
  }

  let consulta = 'SELECT * FROM inventario';
  if (filtros.length > 0) {
    consulta += ` WHERE ${filtros.join(' AND ')}`;
  }

  const { rows: joyas } = await executeQuery(consulta, values);

  return {
    joyas,
    querySql: consulta,
    values,
  };
}

/**
 * Obtener detalle individual de una joya por ID (recurso HATEOAS)
 * Utiliza consulta parametrizada
 */
export async function obtenerJoyaPorId(id: number | string): Promise<Joya | null> {
  const consulta = 'SELECT * FROM inventario WHERE id = $1';
  const { rows } = await executeQuery(consulta, [Number(id)]);
  return rows.length > 0 ? rows[0] : null;
}
