import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import {
  obtenerJoyas,
  obtenerJoyasConFiltros,
  obtenerJoyaPorId,
} from './server/consultas.js';
import {
  middlewareReporte,
  getReportes,
  clearReportes,
} from './server/middlewares/reporte.js';
import {
  checkDatabaseConnection,
  isUsingPostgres,
  getInventarioMemoria,
  reiniciarDatosMemoria,
} from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Requerimiento 3: Implementar middlewares para generar informes o reportes
// de actividad en cada una de las rutas
app.use(middlewareReporte);

// ============================================================================
// RUTAS PRINCIPALES DEL DESAFÍO
// ============================================================================

/**
 * REQUERIMIENTO 1:
 * GET /joyas
 * a. Devuelve la estructura HATEOAS de todas las joyas (1.5 puntos)
 * b. Recibe en la query string los parámetros: (2 puntos)
 *    - limits: Limita la cantidad de joyas a devolver por página
 *    - page: Define la página
 *    - order_by: Ordena las joyas según el valor de este parámetro (ej: stock_ASC)
 * REQUERIMIENTO 4:
 * Usar try catch para capturar los posibles errores (1 punto)
 */
app.get('/joyas', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limits, page, order_by } = req.query;

    const options = {
      limits: limits ? parseInt(String(limits), 10) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      order_by: order_by ? String(order_by) : undefined,
    };

    // Validación básica de parámetros numéricos si fueron provistos
    if (limits && isNaN(Number(limits))) {
      res.status(400).json({ error: 'El parámetro "limits" debe ser un número entero válido.' });
      return;
    }
    if (page && isNaN(Number(page))) {
      res.status(400).json({ error: 'El parámetro "page" debe ser un número entero válido.' });
      return;
    }

    const { hateoas } = await obtenerJoyas(options);

    res.status(200).json(hateoas);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[ERROR /joyas]:', mensaje);
    res.status(500).json({
      error: 'Error interno del servidor al procesar la consulta de joyas con HATEOAS.',
      detalle: mensaje,
    });
  }
});

/**
 * REQUERIMIENTO 2:
 * GET /joyas/filtros
 * Recibe en la query string: (3.5 puntos)
 *  - precio_max: Filtrar joyas por precio máximo
 *  - precio_min: Filtrar joyas por precio mínimo
 *  - categoria: Filtrar joyas por categoría
 *  - metal: Filtrar joyas por metal
 *
 * REQUERIMIENTO 5:
 * Usar consultas parametrizadas para evitar SQL Injection (1 punto)
 *
 * REQUERIMIENTO 4:
 * Usar try catch para capturar los posibles errores (1 punto)
 */
app.get('/joyas/filtros', async (req: Request, res: Response): Promise<void> => {
  try {
    const { precio_min, precio_max, categoria, metal } = req.query;

    if (precio_min && isNaN(Number(precio_min))) {
      res.status(400).json({ error: 'El parámetro "precio_min" debe ser un número válido.' });
      return;
    }
    if (precio_max && isNaN(Number(precio_max))) {
      res.status(400).json({ error: 'El parámetro "precio_max" debe ser un número válido.' });
      return;
    }

    const { joyas } = await obtenerJoyasConFiltros({
      precio_min: precio_min ? Number(precio_min) : undefined,
      precio_max: precio_max ? Number(precio_max) : undefined,
      categoria: categoria ? String(categoria) : undefined,
      metal: metal ? String(metal) : undefined,
    });

    res.status(200).json(joyas);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[ERROR /joyas/filtros]:', mensaje);
    res.status(500).json({
      error: 'Error interno del servidor al filtrar joyas.',
      detalle: mensaje,
    });
  }
});

/**
 * RUTA ADICIONAL DE RECURSO HATEOAS:
 * GET /joyas/joya/:id y GET /joyas/:id
 * Permite acceder directamente al recurso individual referenciado en href (HATEOAS)
 */
app.get(['/joyas/joya/:id', '/joyas/:id'], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID de la joya debe ser numérico.' });
      return;
    }

    const joya = await obtenerJoyaPorId(id);
    if (!joya) {
      res.status(404).json({ error: `No se encontró ninguna joya con el identificador ${id}.` });
      return;
    }

    res.status(200).json(joya);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[ERROR /joyas/joya/:id]:', mensaje);
    res.status(500).json({
      error: 'Error al consultar la joya individual.',
      detalle: mensaje,
    });
  }
});

// ============================================================================
// RUTAS AUXILIARES PARA EL PANEL DE EVALUACIÓN Y PRUEBAS DEL PROFESOR
// ============================================================================

// Obtener logs generados por el middleware de reporte
app.get('/api/reportes', (_req: Request, res: Response) => {
  try {
    res.json({
      total: getReportes().length,
      reportes: getReportes(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// Limpiar historial de reportes
app.post('/api/reportes/limpiar', (_req: Request, res: Response) => {
  clearReportes();
  res.json({ message: 'Historial de reportes reiniciado exitosamente.' });
});

// Estado de conexión a PostgreSQL
app.get('/api/estado-bd', async (_req: Request, res: Response) => {
  const usandoPostgres = isUsingPostgres();
  res.json({
    motor: usandoPostgres ? 'PostgreSQL (Producción/Local)' : 'Almacenamiento Simulado en Memoria (Demo)',
    usandoPostgres,
    totalRegistros: getInventarioMemoria().length,
    configuracion: {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || '5432',
      database: process.env.PGDATABASE || 'joyas',
      user: process.env.PGUSER || 'postgres',
    },
  });
});

// Reiniciar inventario a los 6 registros originales
app.post('/api/inventario/reset', (_req: Request, res: Response) => {
  reiniciarDatosMemoria();
  res.json({ message: 'Inventario reiniciado a los 6 registros de prueba oficiales.' });
});

// ============================================================================
// INTEGRACIÓN CON VITE / SERVIR CLIENTE
// ============================================================================
async function iniciarServidor() {
  await checkDatabaseConnection();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Modo desarrollo: integrar Vite como middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo producción: servir build estático de dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🚀 Servidor My Precious Spa escuchando en http://localhost:${PORT}`);
    console.log(`💎 API REST Tienda de Joyas lista para evaluación`);
    console.log(`   - GET /joyas (HATEOAS, limits, page, order_by)`);
    console.log(`   - GET /joyas/filtros (precio_min, precio_max, categoria, metal)`);
    console.log(`   - GET /joyas/joya/:id (detalle de recurso)`);
    console.log(`   - GET /api/reportes (bitácora de middleware)`);
    console.log(`=============================================================\n`);
  });
}

iniciarServidor();
