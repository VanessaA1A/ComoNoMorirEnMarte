// Prueba del chat de Zinn-IA en el frontend (src/juego/zinniaChat.js) con la API simulada:
// IA (200), sin IA (503), límite (429), error de red y sin conexión -> respaldo con "(modo sin conexión)".
// Uso: node tools/probar-chat.mjs
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

class Memoria { constructor() { this.d = new Map(); } getItem(k) { return this.d.get(k) ?? null; } setItem(k, v) { this.d.set(k, String(v)); } removeItem(k) { this.d.delete(k); } }
globalThis.localStorage = new Memoria();
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
globalThis.CNMM_API_URL = 'http://api.test/api';

let modo = 'ia';
let ultimoCuerpo = null;
globalThis.fetch = async (url, op = {}) => {
  ultimoCuerpo = op.body ? JSON.parse(op.body) : null;
  const json = (d, status = 200) => ({ ok: status < 400, status, json: async () => d });
  if (modo === 'red') throw new TypeError('Failed to fetch');
  if (modo === '503') return json({ modo: 'sin_ia' }, 503);
  if (modo === '429') return json({ modo: 'limite', error: 'Mis pétalos necesitan recargar, ¡pregúntame en un ratito!' }, 429);
  if (modo === '500') return json({ error: 'x' }, 500);
  return json({ modo: 'ia', texto: 'Respuesta de la IA', acciones: [{ tipo: 'abrir_capa', id: 'geologia' }, { tipo: 'abrir_capa', id: 'inventada' }] });
};

const chat = await import('../src/juego/zinniaChat.js');
const { nuevaPartida } = await import('../src/engine/motor.js');
const CHISTES = (await import('../src/data/chistes.json', { with: { type: 'json' } })).default;

const partida = (cambios = {}) => ({ ...nuevaPartida(), escena: 'c05_02', capitulo: 5, hud: true, nombre: 'Alex', pronombre: 'elle', ...cambios });

// ---------- contexto ----------
const c = chat.contextoDe(partida({ oxigeno: 20, muestras: ['m1'] }), ['D01', 'D04']);
ok(c.capitulo === 5 && c.escenaId === 'c05_02' && c.pronombre === 'elle' && c.oxigeno === 20 && c.muestras === 1 && c.fichasDesbloqueadas.length === 2, 'contexto: capítulo, escena, pronombre, barras, muestras y fichas');
ok(chat.contextoDe({ ...nuevaPartida(), escena: 'c01_01' }).pronombre === null, 'contexto antes de elegir pronombre: pronombre null');
ok(chat.contextoDe(null).capitulo === undefined, 'contexto sin partida: solo fichas');
ok(!('oxigeno' in chat.contextoDe({ ...nuevaPartida(), escena: 'c01_03', pronombre: 'ella' })), 'sin barras activas no se mandan barras');

// ---------- con IA ----------
modo = 'ia';
const r1 = await chat.enviar('¿Qué capa me sirve?', { partida: partida(), fichas: ['D01'] });
ok(r1.modo === 'ia' && r1.texto === 'Respuesta de la IA' && r1.acciones.length === 2, 'con IA: texto y acciones de la API');
ok(ultimoCuerpo.mensajes.at(-1).rol === 'usuario' && ultimoCuerpo.contexto.pronombre === 'elle', 'se manda el mensaje y el contexto');
ok(!('id' in ultimoCuerpo.mensajes[0]), 'a la API solo van rol y texto');
for (let i = 0; i < 8; i++) await chat.enviar(`pregunta ${i}`, { partida: partida() });
ok(ultimoCuerpo.mensajes.length === 12, `se envían solo los últimos 12 mensajes (${ultimoCuerpo.mensajes.length})`);
ok(chat.leerChat().mensajes.length === 18 && !chat.leerChat().pensando, 'el historial completo queda en memoria y "pensando" se apaga');
ok((await chat.enviar('x'.repeat(600), { partida: partida() })).texto && ultimoCuerpo.mensajes.at(-1).texto.length === 500, 'el texto se corta a 500 caracteres');
ok((await chat.enviar('   ')) === null, 'un mensaje vacío no se envía');

// ---------- respaldo ----------
for (const [m, motivo] of [['503', 'sin IA (503)'], ['red', 'error de red'], ['500', 'error 500']]) {
  modo = m;
  const r = await chat.enviar('¿Qué son los percloratos?', { partida: partida() });
  ok(r.modo === 'respaldo' && /perclorato|sales del suelo/i.test(r.texto) && r.texto.includes('(modo sin conexión)'), `${motivo} → respaldo con el dato y "(modo sin conexión)"`);
}
modo = '429';
const r429 = await chat.enviar('¿Qué es MOLA?', { partida: partida() });
ok(r429.texto.startsWith('Mis pétalos necesitan recargar, ¡pregúntame en un ratito!') && /MOLA/.test(r429.texto), '429 → mensaje de los pétalos + respuesta fija');
navigator.onLine = false; modo = 'ia';
const rOff = await chat.enviar('¿Cuánto dura un día en Marte?', { partida: partida() });
ok(rOff.modo === 'respaldo' && /24 h 39 min/.test(rOff.texto), `sin internet → respaldo con dato correcto: "${rOff.texto.slice(0, 60)}…"`);
navigator.onLine = true;

// Chistes: aleatorios de chistes.json, sin repetir los últimos 3, con "¿Es verdad?" si tienen ficha
chat.reiniciarChat(); modo = '503';
const vistos = [];
for (let i = 0; i < 12; i++) vistos.push((await chat.enviar(i % 2 ? 'otra broma' : 'Cuéntame un chiste malo', { partida: partida() })).chiste?.id);
ok(vistos.every((id) => CHISTES.some((c) => c.id === id)), 'los chistes salen de chistes.json');
ok(vistos.every((id, i) => !vistos.slice(Math.max(0, i - 3), i).includes(id)), 'ningún chiste repite uno de los últimos 3');
const conFicha = CHISTES.find((x) => x.dato);
ok(Boolean(conFicha) && chat.respaldo('joke', partida(), () => CHISTES.indexOf(conFicha) / CHISTES.length + 0.0001).chiste !== undefined, '"joke" también pide chiste');
const chisteFicha = [...Array(40)].map(() => chat.respaldo('chiste', partida())).find((r) => r.chiste.ficha);
ok(Boolean(chisteFicha?.chiste.ficha), `un chiste con dato trae su ficha para "¿Es verdad?" (${chisteFicha?.chiste.ficha})`);

// Remates: 1 de cada 3 respuestas fijas, nunca con una barra en rojo o poco tiempo
chat.reiniciarChat();
const tres = [1, 2, 3].map(() => chat.respaldo('¿Qué es MOLA?', partida()).texto);
ok(!chat.REMATES.some((x) => tres[0].includes(x) || tres[1].includes(x)) && chat.REMATES.some((x) => tres[2].includes(x)), 'remate bobo en 1 de cada 3 respuestas fijas');
chat.reiniciarChat();
const peligro = [1, 2, 3].map(() => chat.respaldo('¿Qué es MOLA?', partida({ oxigeno: 15 })).texto);
ok(!peligro.some((t) => chat.REMATES.some((x) => t.includes(x))), 'con una barra en rojo no hay remates');
const COMO_VOY = chat.respaldo('¿Cómo voy?', partida({ oxigeno: 15 })).texto;
ok(/oxígeno/i.test(COMO_VOY) && /rojo/.test(COMO_VOY), `"¿Cómo voy?" sin IA lee las barras: "${COMO_VOY.slice(0, 70)}…"`);
// Fuera de tema, sin dato y tareas: siempre algo útil y amable, nunca un error
const mundial = chat.respaldo('¿quién ganó el mundial?', partida());
ok(mundial.fueraDeTema && /necesita conexión|necesito conexión/.test(mundial.texto) && /Guía de supervivencia/.test(mundial.texto) && /«Parte \d/.test(mundial.texto) && !/error|no está en mis datos/i.test(mundial.texto), `otro tema sin IA → necesita conexión y sugiere partes de la Guía: "${mundial.texto.slice(0, 70)}…"`);
for (const q of ['¿Cómo funciona la fotosíntesis?', '¿Cuánto es 15 × 12?', '¿Por qué el cielo de la Tierra es azul?', '¿Qué es un agujero negro?']) {
  const r = chat.respaldo(q, partida());
  ok(r.texto.length > 40 && /conexión/.test(r.texto) && /«Parte \d/.test(r.texto), `"${q}" sin IA → respuesta amable con partes de la Guía (nunca vacía)`);
}
const quien = chat.respaldo('¿Quién eres?', partida());
ok(/Zinn-IA/.test(quien.texto) && /flor/.test(quien.texto), `"¿Quién eres?" sin IA → se presenta: "${quien.texto.slice(0, 50)}…"`);
const granos = chat.respaldo('¿cuántas piedras hay en Gale?', partida()); // (la arena ya tiene dato: Parte 4, color de la arena en Gale)
ok(granos.sinDato && /no está en mis datos verificados/.test(granos.texto) && /Guía de supervivencia/.test(granos.texto) && /«Parte \d/.test(granos.texto) && !/\d{2,}/.test(granos.texto),`sin dato → lo dice y sugiere una parte de la Guía: "${granos.texto.slice(0, 70)}…"`);
const tarea = chat.respaldo('hazme la tarea de quimica organica avanzada', partida());
ok(tarea.fueraDeTema && /paso a paso/.test(tarea.texto) && /conexión/.test(tarea.texto), 'tarea escolar sin IA → con conexión la explica paso a paso; sin ella, lo dice con amabilidad');
// Datos de la Guía nueva, con su fuente
for (const [q, re] of [['¿Qué le pasó a Spirit?', /Troy/], ['¿Cuál es el punto más alto de Marte?', /Olympus Mons/], ['¿Por qué Marte es rojo?', /ferrihidrita|óxidos de hierro/], ['¿Qué pasó el 20 de mayo de 2024?', /8\.100 microgray/], ['¿Cuántos rovers hay en Marte?', null], ['How long is a day on Mars?', /24 h 39 min/]]) {
  const r = chat.respaldo(q, partida());
  if (!re) { ok(r.sinDato, `"${q}" → sin dato verificado (no inventa una cifra)`); continue; }
  ok(re.test(r.texto) && /^https?:/.test(r.fuente ?? ''), `"${q}" → dato de la Guía con fuente (${(r.fuente ?? 'sin fuente').slice(0, 40)})`);
}

// Cuidado: remates y textos fijos sin emojis, sin género hacia el jugador y sin chistes sobre el cuerpo o la muerte
const emoji = /\p{Extended_Pictographic}/u;
const genero = /\b(list[oa]|cansad[oa]|tranquil[oa]|explorador[a]?|campe[oó]n|nosotr[oa]s)\b/i;
const cuerpo = /\b(muert|morir|muere|peso|gord|flac|dieta|cuerpo)/i;
ok(chat.REMATES.every((x) => !emoji.test(x) && !genero.test(x) && !cuerpo.test(x)), 'remates: sin emojis, sin género hacia el jugador, sin cuerpo ni muerte');
ok(CHISTES.every((x) => !emoji.test(x.texto)), 'chistes sin emojis');
const pr = (p) => chat.respaldo('¿Cuándo vuelvo a casa?', partida({ pronombre: p })).texto;
ok(/viv[oa e]|vive/.test(pr('elle')) ? pr('elle').includes('vive') : true, 'respuestas fijas con el pronombre de la partida (vivo/viva/vive)');

// Indicador "IA en vivo": verde solo si hay key Y la última respuesta del servidor no fue "sin IA"
const { iaDisponible } = await import('../src/api.js');
const conEstado = (estado, salud = { zinnia: { ia: true } }) => {
  globalThis.fetch = async (url) => (String(url).endsWith('/zinnia/estado')
    ? (estado ? { ok: true, status: 200, json: async () => estado } : { ok: false, status: 404, json: async () => ({}) })
    : { ok: true, status: 200, json: async () => salud });
};
conEstado({ ia: true, ultima_respuesta: { modo: 'ia' } });
ok(await iaDisponible() === true, 'indicador: key y última respuesta con IA → "IA en vivo"');
conEstado({ ia: true, ultima_respuesta: { modo: 'sin_ia', motivo: 'api_401_authentication_error' } });
ok(await iaDisponible() === false, 'indicador: key inválida o sin saldo (última respuesta "sin IA") → "Modo sin conexión"');
conEstado({ ia: false, ultima_respuesta: { modo: null } });
ok(await iaDisponible() === false, 'indicador: sin key → "Modo sin conexión"');
conEstado(null, { zinnia: { ia: true } });
ok(await iaDisponible() === true, 'indicador: API anterior sin /zinnia/estado → usa /salud');

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) del chat fallaron`); process.exit(1); }
console.log('\n✅ Chat de Zinn-IA: IA, respaldo, chistes y límites en orden');
process.exit(0); // los AbortSignal.timeout de las peticiones simuladas no deben mantener vivo el proceso
