import { Router } from 'express';
import { pool } from '../db.js';
import { nuevoJugador } from '../validar.js';

export const players = Router();

players.post('/players', async (req, res) => {
  const { nombre, pronombre } = nuevoJugador.parse(req.body ?? {});
  const { rows } = await pool.query(
    'INSERT INTO players (nombre, pronombre) VALUES ($1, $2) RETURNING id, nombre, pronombre',
    [nombre, pronombre],
  );
  res.status(201).json(rows[0]);
});
