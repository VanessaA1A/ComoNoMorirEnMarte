// Genera docs/evidencia_stats.md con el resultado REAL de GET /api/stats (producción por defecto).
// Uso: node Backend/tools/evidencia-stats.mjs [--api https://como-no-morir-api.onrender.com/api]
// Volver a correrlo justo antes de entregar el PDF, para que los números estén al día.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const i = process.argv.indexOf('--api');
const API = (i > 0 ? process.argv[i + 1] : 'https://como-no-morir-api.onrender.com/api').replace(/\/+$/, '');
const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../docs/evidencia_stats.md');

const pedir = async (ruta) => {
  const r = await fetch(API + ruta, { signal: AbortSignal.timeout(90000) }); // Render gratis puede tardar ~50 s en despertar
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
};
const [salud, s] = [await pedir('/salud'), await pedir('/stats')];
const ahora = new Date();
const fecha = `${ahora.toISOString().slice(0, 10)} ${ahora.toISOString().slice(11, 16)} UTC`;
const total = s.finales.bueno + s.finales.intermedio + s.finales.malo;
const pct = (n) => (total ? `${((n / total) * 100).toFixed(1).replace('.', ',')} %` : '—');
const CAUSAS = { exito: 'Vuelve a casa', tiempo: 'Llegó tarde (el módulo se fue)', rescate: 'Desmayo y rescate tardío', radiacion: 'Radiación', oxigeno: 'Sin oxígeno', integridad: 'Traje roto' };

const md = [
  '# Evidencia: estadísticas reales de la API',
  '',
  `Consulta: \`GET ${API}/stats\` · ${fecha} · base de datos conectada: ${salud.db ? 'sí' : 'no'}${salud.commit ? ` · versión de la API: \`${salud.commit}\`` : ''}.`,
  '',
  'Aquí solo hay conteos. La API guarda el nombre que el jugador escribe en el juego (no se muestra aquí) y nunca guarda el texto de los mensajes a Zinn-IA.',
  '',
  '## Partidas y finales',
  '',
  '| Dato | Valor |',
  '|---|---|',
  `| Partidas (jugadores que eligieron pronombre) | ${s.partidas} |`,
  `| Partidas terminadas | ${total} |`,
  `| Final bueno | ${s.finales.bueno} (${pct(s.finales.bueno)}) |`,
  `| Final intermedio | ${s.finales.intermedio} (${pct(s.finales.intermedio)}) |`,
  `| Final malo | ${s.finales.malo} (${pct(s.finales.malo)}) |`,
  '',
  '## Causas del final',
  '',
  Object.keys(s.causas).length
    ? ['| Causa | Partidas |', '|---|---|', ...Object.entries(s.causas).map(([c, n]) => `| ${CAUSAS[c] ?? c} | ${n} |`)].join('\n')
    : 'Todavía no hay partidas terminadas.',
  '',
  '## Fichas más desbloqueadas',
  '',
  s.fichasMasDesbloqueadas.length
    ? ['| Ficha | Veces |', '|---|---|', ...s.fichasMasDesbloqueadas.map((f) => `| ${f.datoId} | ${f.veces} |`)].join('\n')
    : 'Todavía no hay fichas desbloqueadas registradas.',
  '',
  '## Opción más elegida por capítulo',
  '',
  s.opcionMasElegidaPorCapitulo.length
    ? ['| Capítulo | Escena | Opción | Veces |', '|---|---|---|---|', ...s.opcionMasElegidaPorCapitulo.map((o) => `| ${o.capitulo} | ${o.escena} | ${o.opcion} | ${o.veces} |`)].join('\n')
    : 'Todavía no hay decisiones registradas.',
  '',
  '## Uso de Zinn-IA (agente)',
  '',
  s.zinnia
    ? ['| Dato | Valor |', '|---|---|',
      `| Mensajes respondidos con IA | ${s.zinnia.mensajesConIA} |`,
      `| Jugadores que usaron el chat | ${s.zinnia.jugadores} |`,
      `| Tokens (entrada + salida) | ${s.zinnia.tokensEntrada} + ${s.zinnia.tokensSalida} |`,
      `| Herramientas usadas | ${Object.entries(s.zinnia.herramientas).map(([h, n]) => `${h}: ${n}`).join(', ') || 'ninguna todavía'} |`].join('\n')
    : 'La API desplegada todavía no incluye el agente Zinn-IA (no hay datos de uso). Volver a generar este archivo cuando esté desplegado.',
  '',
  `*Generado con \`node Backend/tools/evidencia-stats.mjs\`. Respuesta completa:*`,
  '',
  '```json',
  JSON.stringify(s, null, 2),
  '```',
  '',
].join('\n');

mkdirSync(path.dirname(destino), { recursive: true });
writeFileSync(destino, md);
console.log(`Listo: ${destino}\npartidas=${s.partidas} · finales=${total} · zinnia=${s.zinnia ? 'sí' : 'no desplegado'}`);
