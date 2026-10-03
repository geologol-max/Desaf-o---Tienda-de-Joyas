import { Request, Response, NextFunction } from 'express';

export interface ReporteItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, unknown>;
  ip: string;
  userAgent?: string;
  statusCode?: number;
  durationMs?: number;
}

// Historial en memoria para consulta en la interfaz de pruebas y evaluación
const historialReportes: ReporteItem[] = [];
const MAX_HISTORIAL = 50;

/**
 * Middleware para generar informes o reportes de actividad en cada una de las rutas.
 * Cumple con el Requerimiento 3 del Desafío Tienda de Joyas.
 */
export const middlewareReporte = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const fecha = new Date().toISOString();
  const { method, originalUrl, path, query } = req;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  // Mostrar en consola el reporte inmediato de la solicitud entrante
  console.log(`\n======================================================`);
  console.log(`[REPORTE DE ACTIVIDAD] Solicitud recibida:`);
  console.log(`Fecha/Hora: ${fecha}`);
  console.log(`Método:     ${method}`);
  console.log(`Ruta:       ${originalUrl}`);
  console.log(`Query:      ${JSON.stringify(query)}`);
  console.log(`IP Cliente: ${ip}`);
  console.log(`======================================================\n`);

  const reporteId = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Interceptar la finalización de la respuesta para registrar status y duración
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const item: ReporteItem = {
      id: reporteId,
      timestamp: fecha,
      method,
      url: originalUrl,
      path,
      query,
      ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      durationMs,
    };

    historialReportes.unshift(item);
    if (historialReportes.length > MAX_HISTORIAL) {
      historialReportes.pop();
    }

    console.log(`[REPORTE FINALIZADO] ${method} ${originalUrl} -> Status ${res.statusCode} (${durationMs}ms)`);
  });

  next();
};

export const getReportes = (): ReporteItem[] => {
  return historialReportes;
};

export const clearReportes = (): void => {
  historialReportes.length = 0;
};
