import { Router } from 'express';
import { pool } from '../db.js';
import { decision, final, nuevaFicha, paramsJugador } from '../validar.js';

export const juego = Router();

juego.post('/decisiones', async (req, res) => {
  const d = decision.parse(req.body ?? {});
  const { rows } = await pool.query(
    `INSERT INTO decisiones (player_id, capitulo, escena, opcion, barras)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [d.playerId, d.capitulo, d.escena, d.opcion, d.barras],
  );
  res.status(201).json(rows[0]);
});

juego.post('/finales', async (req, res) => {
  const f = final.parse(req.body ?? {});
  const { rows } = await pool.query(
    `INSERT INTO finales (player_id, final, causa, barras, muestras)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [f.playerId, f.final, f.causa, f.barras, f.muestras],
  );
  res.status(201).json(rows[0]);
});

juego.post('/fichas/:playerId', async (req, res) => {
  const { playerId } = paramsJugador.parse(req.params);
  const { datoId } = nuevaFicha.parse(req.body ?? {});
  const { rowCount } = await pool.query(
    'INSERT INTO fichas_jugador (player_id, dato_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [playerId, datoId],
  );
  res.status(rowCount ? 201 : 200).json({ datoId, nueva: rowCount === 1 });
});

juego.get('/fichas/:playerId', async (req, res) => {
  const { playerId } = paramsJugador.parse(req.params);
  const { rows } = await pool.query(
    'SELECT dato_id FROM fichas_jugador WHERE player_id = $1 ORDER BY fecha', [playerId],
  );
  res.json(rows.map((r) => r.dato_id));
});
