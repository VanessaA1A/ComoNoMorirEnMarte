import { Router } from 'express';
import { pool } from '../db.js';
import { chatZinnia } from '../validar.js';
import { conversar, MODELO } from '../zinnia/agente.js';

export const zinnia = Router();

// ---------- Límite: 20 mensajes cada 10 minutos por playerId (o por IP) ----------
const VENTANA_MS = 10 * 60 * 1000;
const MAXIMO = 20;
const uso = new Map(); // clave -> [marcas de tiempo]; vive en memoria (un solo proceso en Render gratis)
export const MENSAJE_LIMITE = 'Mis pétalos necesitan recargar, ¡pregúntame en un ratito!';

function dentroDelLimite(clave, ahora = Date.now()) {
  const marcas = (uso.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (marcas.length >= MAXIMO) { uso.set(clave, marcas); return false; }
  marcas.push(ahora);
  uso.set(clave, marcas);
  return true;
}
setInterval(() => { // limpieza para que el mapa no crezca sin fin
  const ahora = Date.now();
  for (const [k, v] of uso) if (!v.some((t) => ahora - t < VENTANA_MS)) uso.delete(k);
}, VENTANA_MS).unref();

// ---------- Uso (privacidad 13+: NUNCA se guarda el texto de los mensajes) ----------
let tablaLista = null;
export const asegurarTablaUso = () => (tablaLista ??= pool.query(`
  CREATE TABLE IF NOT EXISTS zinnia_uso (
    id                  SERIAL PRIMARY KEY,
    player_id           UUID,
    fecha               TIMESTAMPTZ NOT NULL DEFAULT now(),
    herramientas_usadas TEXT[] NOT NULL DEFAULT '{}',
    tokens_entrada      INT NOT NULL DEFAULT 0,
    tokens_salida       INT NOT NULL DEFAULT 0
  )`).catch((err) => { tablaLista = null; throw err; }));

async function registrarUso(playerId, r) {
  try {
    await asegurarTablaUso();
    await pool.query(
      'INSERT INTO zinnia_uso (player_id, herramientas_usadas, tokens_entrada, tokens_salida) VALUES ($1, $2, $3, $4)',
      [playerId ?? null, r.herramientas, r.tokens.entrada, r.tokens.salida],
    );
  } catch (err) {
    console.warn('[zinnia] no se pudo registrar el uso:', err.code ?? err.message); // el chat sigue igual
  }
}

// Regla del juego: con la batería en 0 Zinn-IA "se apaga" (modo semilla). No se llama a la IA ni cuenta para el límite.
export const MENSAJE_SEMILLA = 'Batería en cero: no puedo pensar bien. Busca en la Guía o cambia la batería.';

zinnia.post('/zinnia/chat', async (req, res) => {
  const cuerpo = chatZinnia.parse(req.body);
  if (typeof cuerpo.contexto?.bateria === 'number' && cuerpo.contexto.bateria <= 0) {
    return res.json({ modo: 'semilla', texto: MENSAJE_SEMILLA, acciones: [] });
  }
  const clave = cuerpo.playerId ?? `ip:${req.ip}`;
  if (!dentroDelLimite(clave)) return res.status(429).json({ modo: 'limite', error: MENSAJE_LIMITE });

  try {
    const r = await conversar(cuerpo);
    registrarUso(cuerpo.playerId, r); // sin await: no retrasa la respuesta
    res.json({ modo: 'ia', texto: r.texto, acciones: r.acciones, herramientas: r.herramientas, tokens: r.tokens, modelo: MODELO });
  } catch (err) {
    if (err.sinIA) {
      console.warn(`[zinnia] sin IA: ${err.motivo}`); // solo el motivo, nunca el mensaje del jugador
      return res.status(503).json({ modo: 'sin_ia' });
    }
    throw err;
  }
});
