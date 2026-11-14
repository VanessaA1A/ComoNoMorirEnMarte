// Carga capas.json, pois.json y datos.json de Frontend/src/data con UPSERT (se puede repetir)
import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

const CARPETA = new URL('../../Frontend/src/data/', import.meta.url);

const TABLAS = {
  capas: ['id', 'nombre', 'tipo', 'mision', 'instrumento', 'imagen', 'descripcion', 'limitacion', 'fuente'],
  pois: ['id', 'nombre', 'tipo', 'x', 'y', 'nota', 'dato', 'mision', 'fuente', 'pov'],
  datos: ['id', 'texto', 'uso', 'capitulo', 'fuente', 'verificado'],
};

async function leer(tabla) {
  try {
    const filas = JSON.parse(await readFile(new URL(`${tabla}.json`, CARPETA), 'utf8'));
    if (!Array.isArray(filas)) throw new Error('debe ser una lista [ ... ]');
    return filas;
  } catch (err) {
    if (err.code === 'ENOENT') console.warn(`- ${tabla}.json no existe todavía; se omite.`);
    else throw new Error(`${tabla}.json no es válido: ${err.message}`);
    return [];
  }
}

const cliente = await pool.connect();
try {
  await cliente.query('BEGIN');
  for (const [tabla, cols] of Object.entries(TABLAS)) {
    const filas = await leer(tabla);
    // Los nombres de columnas son fijos (de TABLAS); los valores van parametrizados
    const sql = `INSERT INTO ${tabla} (${cols.join(', ')})
      VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (id) DO UPDATE SET ${cols.slice(1).map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`;
    for (const fila of filas) {
      const valores = cols.map((c) => {
        const v = fila[c];
        if (Array.isArray(v)) return v.join(', ');      // ej. uso: ["C","F"] → "C, F"
        if (c === 'verificado') return v === true;
        return v ?? null;
      });
      try {
        await cliente.query(sql, valores);
      } catch (err) {
        throw new Error(`${tabla} → fila "${fila.id}": ${err.message}`);
      }
    }
    if (filas.length) console.log(`- ${tabla}: ${filas.length} filas cargadas.`);
  }
  await cliente.query('COMMIT');
  console.log('Seed terminado.');
} catch (err) {
  await cliente.query('ROLLBACK');
  console.error('Seed cancelado (no se guardó nada):', err.message);
  process.exitCode = 1;
} finally {
  cliente.release();
  await pool.end();
}
