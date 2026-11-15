import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { pool } from './db.js';
import { players } from './rutas/players.js';
import { saves } from './rutas/saves.js';
import { catalogo } from './rutas/catalogo.js';
import { juego } from './rutas/juego.js';
import { stats } from './rutas/stats.js';

const app = express();

// Solo los orígenes listados en CORS_ORIGIN (separados por coma)
const origenes = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origenes }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', async (_req, res) => {
  let db = false;
  try { await pool.query('SELECT 1'); db = true; } catch { /* la API responde aunque la base no */ }
  // commit = el que desplegó Render (RENDER_GIT_COMMIT lo pone Render solo); sirve para confirmar cada deploy
  res.json({ ok: true, db, commit: (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7) });
});

// Express 5 manda los errores de las rutas async al manejador central
app.use('/api', players, saves, catalogo, juego, stats);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos no válidos',
      detalles: err.issues.map((i) => `${i.path.join('.') || 'valor'}: ${i.message}`),
    });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande (máximo 100 kb)' });
  if (err.code === '23503') return res.status(404).json({ error: 'El jugador o el dato indicado no existe' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const puerto = Number(process.env.PORT) || 3001;
app.listen(puerto, () => console.log(`API escuchando en http://localhost:${puerto} (CORS: ${origenes.join(', ')})`));
