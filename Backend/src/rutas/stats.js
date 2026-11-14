import { Router } from 'express';
import { pool } from '../db.js';

export const stats = Router();

// Evidencia para el PDF: cuántos juegan, cómo terminan y qué eligen
stats.get('/stats', async (_req, res) => {
  const [partidas, finales, causas, opciones, fichas] = await Promise.all([
    pool.query('SELECT count(*)::int AS n FROM players'),
    pool.query('SELECT final, count(*)::int AS n FROM finales GROUP BY final'),
    pool.query('SELECT causa, count(*)::int AS n FROM finales GROUP BY causa'),
    pool.query(`
      SELECT DISTINCT ON (capitulo) capitulo, escena, opcion, veces
      FROM (SELECT capitulo, escena, opcion, count(*)::int AS veces
            FROM decisiones GROUP BY capitulo, escena, opcion) t
      ORDER BY capitulo, veces DESC`),
    pool.query(`
      SELECT dato_id AS "datoId", count(*)::int AS veces
      FROM fichas_jugador GROUP BY dato_id ORDER BY veces DESC, dato_id LIMIT 10`),
  ]);

  res.json({
    partidas: partidas.rows[0].n,
    finales: { bueno: 0, intermedio: 0, malo: 0, ...Object.fromEntries(finales.rows.map((r) => [r.final, r.n])) },
    causas: Object.fromEntries(causas.rows.map((r) => [r.causa, r.n])),
    opcionMasElegidaPorCapitulo: opciones.rows,
    fichasMasDesbloqueadas: fichas.rows,
  });
});
