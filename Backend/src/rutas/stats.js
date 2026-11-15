import { Router } from 'express';
import { pool } from '../db.js';
import { asegurarTablaUso } from './zinnia.js';

export const stats = Router();

// Evidencia para el PDF: cuántos juegan, cómo terminan y qué eligen
stats.get('/stats', async (_req, res) => {
  await asegurarTablaUso().catch(() => {});
  const [partidas, finales, causas, opciones, fichas, zinniaUso, zinniaHerr] = await Promise.all([
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
    // Zinn-IA: solo conteos (el texto de los mensajes nunca se guarda)
    pool.query(`SELECT count(*)::int AS mensajes, count(DISTINCT player_id)::int AS jugadores,
      coalesce(sum(tokens_entrada), 0)::int AS entrada, coalesce(sum(tokens_salida), 0)::int AS salida FROM zinnia_uso`)
      .catch(() => ({ rows: [{ mensajes: 0, jugadores: 0, entrada: 0, salida: 0 }] })),
    pool.query('SELECT h AS herramienta, count(*)::int AS veces FROM zinnia_uso, unnest(herramientas_usadas) AS h GROUP BY h ORDER BY veces DESC')
      .catch(() => ({ rows: [] })),
  ]);

  res.json({
    partidas: partidas.rows[0].n,
    finales: { bueno: 0, intermedio: 0, malo: 0, ...Object.fromEntries(finales.rows.map((r) => [r.final, r.n])) },
    causas: Object.fromEntries(causas.rows.map((r) => [r.causa, r.n])),
    opcionMasElegidaPorCapitulo: opciones.rows,
    fichasMasDesbloqueadas: fichas.rows,
    zinnia: {
      mensajesConIA: zinniaUso.rows[0].mensajes,
      jugadores: zinniaUso.rows[0].jugadores,
      tokensEntrada: zinniaUso.rows[0].entrada,
      tokensSalida: zinniaUso.rows[0].salida,
      herramientas: Object.fromEntries(zinniaHerr.rows.map((r) => [r.herramienta, r.veces])),
    },
  });
});
