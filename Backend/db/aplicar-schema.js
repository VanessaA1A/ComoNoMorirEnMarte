// Crea las tablas en la base de DATABASE_URL (se puede correr varias veces)
import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

try {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Esquema aplicado correctamente.');
} catch (err) {
  console.error('No se pudo aplicar el esquema:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
