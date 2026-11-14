import { Router } from 'express';
import { pool } from '../db.js';
import { paramsJugador, paramsRanura, partida } from '../validar.js';

export const saves = Router();

const BARRAS = `jsonb_build_object('oxigeno', oxigeno, 'bateria', bateria, 'alimentacion', alimentacion,
  'integridad', integridad, 'radiacion', radiacion) AS barras`;
const COMPLETA = `slot, capitulo, escena, ${BARRAS}, minutos, muestras, flags, fichas, actualizado`;

// Resumen de las ranuras (para la pantalla Cargar)
saves.get('/saves/:playerId', async (req, res) => {
  const { playerId } = paramsJugador.parse(req.params);
  const { rows } = await pool.query(
    `SELECT slot, capitulo, escena, ${BARRAS}, actualizado FROM saves WHERE player_id = $1 ORDER BY slot`,
    [playerId],
  );
  res.json(rows);
});

saves.get('/saves/:playerId/:slot', async (req, res) => {
  const { playerId, slot } = paramsRanura.parse(req.params);
  const { rows } = await pool.query(
    `SELECT ${COMPLETA} FROM saves WHERE player_id = $1 AND slot = $2`, [playerId, slot],
  );
  if (!rows.length) return res.status(404).json({ error: 'No hay partida guardada en esa ranura' });
  res.json(rows[0]);
});

saves.put('/saves/:playerId/:slot', async (req, res) => {
  const { playerId, slot } = paramsRanura.parse(req.params);
  const p = partida.parse(req.body ?? {});
  const b = p.barras;
  const { rows } = await pool.query(
    `INSERT INTO saves (player_id, slot, capitulo, escena, oxigeno, bateria, alimentacion, integridad,
       radiacion, minutos, muestras, flags, fichas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (player_id, slot) DO UPDATE SET
       capitulo = EXCLUDED.capitulo, escena = EXCLUDED.escena, oxigeno = EXCLUDED.oxigeno,
       bateria = EXCLUDED.bateria, alimentacion = EXCLUDED.alimentacion, integridad = EXCLUDED.integridad,
       radiacion = EXCLUDED.radiacion, minutos = EXCLUDED.minutos, muestras = EXCLUDED.muestras,
       flags = EXCLUDED.flags, fichas = EXCLUDED.fichas, actualizado = now()
     RETURNING ${COMPLETA}`,
    [playerId, slot, p.capitulo, p.escena, b.oxigeno, b.bateria, b.alimentacion, b.integridad,
      b.radiacion, p.minutos, JSON.stringify(p.muestras), JSON.stringify(p.flags), JSON.stringify(p.fichas)],
  );
  res.json(rows[0]);
});

saves.delete('/saves/:playerId/:slot', async (req, res) => {
  const { playerId, slot } = paramsRanura.parse(req.params);
  const { rowCount } = await pool.query('DELETE FROM saves WHERE player_id = $1 AND slot = $2', [playerId, slot]);
  if (!rowCount) return res.status(404).json({ error: 'No hay partida guardada en esa ranura' });
  res.status(204).end();
});
