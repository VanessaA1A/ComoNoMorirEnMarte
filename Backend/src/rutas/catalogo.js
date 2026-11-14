import { Router } from 'express';
import { pool } from '../db.js';
import { filtroDatos } from '../validar.js';

export const catalogo = Router();

catalogo.get('/capas', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM capas ORDER BY id');
  res.json(rows);
});

catalogo.get('/pois', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM pois ORDER BY id');
  res.json(rows);
});

// ?uso=C → solo datos para pantallas de carga (uso puede ser "C", "C, F", etc.)
catalogo.get('/datos', async (req, res) => {
  const { uso } = filtroDatos.parse(req.query);
  const { rows } = await pool.query(
    'SELECT * FROM datos WHERE $1::text IS NULL OR position($1 IN uso) > 0 ORDER BY id',
    [uso ?? null],
  );
  res.json(rows);
});
