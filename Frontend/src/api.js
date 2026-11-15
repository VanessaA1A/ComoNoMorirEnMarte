// Conexión con la API (Backend/). El juego NUNCA depende de ella: es 100 % jugable sin conexión.
// - Sin VITE_API_URL todo es local (localStorage): no hay peticiones, avisos ni errores en consola.
// - Con VITE_API_URL, cada envío (crear jugador, guardar ranura, decisión, ficha, final) entra PRIMERO
//   en una cola en localStorage y se envía EN ORDEN cuando hay conexión.
// - Hay conexión solo si: navigator.onLine y GET /salud responde { db: true } en menos de 4 s.
// - Error de red o 5xx: se reintenta después, con espera creciente (2 s, 4 s, 8 s … hasta 60 s).
// - 4xx: el dato fue rechazado; se descarta y se registra en la consola.
import { leer, escribir } from './juego/almacen.js';
import { BARRAS } from './engine/reglas.js';

// globalThis.CNMM_API_URL solo existe en las pruebas de Node (fuera de Vite no hay import.meta.env).
const API = (import.meta.env?.VITE_API_URL || globalThis.CNMM_API_URL || '').replace(/\/+$/, '');
export const apiActiva = Boolean(API);

const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ---------- estado de la conexión ----------
let enLinea = globalThis.navigator?.onLine ?? true;
let apiResponde = null; // null = aún no se sabe (no se muestra el aviso); true/false según el último ping
const oyentes = new Set();
export const conectado = () => !apiActiva || (enLinea && apiResponde !== false);
export function alCambiarConexion(f) { oyentes.add(f); return () => oyentes.delete(f); }

function marcarApi(valor) {
  const antes = conectado();
  apiResponde = valor;
  if (antes !== conectado()) oyentes.forEach((f) => f(conectado()));
}

class ErrorHttp extends Error {
  constructor(status, ruta) { super(`La API respondió ${status} en ${ruta}`); this.status = status; }
}
/** Error de red, tiempo agotado o 5xx: vale la pena reintentar. */
const esReintentable = (err) => !err.status || err.status >= 500;

async function pedir(ruta, { metodo = 'GET', cuerpo, espera = 5000 } = {}) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(espera),
  });
  if (!r.ok) throw new ErrorHttp(r.status, ruta);
  return r.status === 204 ? null : r.json();
}

/** Ping a GET /salud (4 s). Devuelve true solo si responde { db: true }. */
export async function comprobarConexion() {
  if (!apiActiva) return true;
  if (!enLinea) { marcarApi(false); return false; }
  try {
    const salud = await pedir('/salud', { espera: 4000 });
    marcarApi(salud?.db === true);
  } catch {
    marcarApi(false);
  }
  return apiResponde === true;
}

// ---------- reintentos con espera creciente ----------
let intentos = 0;
let temporizador = null;
function programarReintento() {
  if (temporizador || !apiActiva) return;
  const ms = Math.min(60000, 2000 * 2 ** intentos);
  intentos++;
  temporizador = setTimeout(async () => {
    temporizador = null;
    if (await comprobarConexion()) vaciarCola();
    else programarReintento();
  }, ms);
}
const reiniciarEspera = () => { intentos = 0; if (temporizador) { clearTimeout(temporizador); temporizador = null; } };

// ---------- partidas y jugadores ----------
// Cada partida tiene un id local. Su jugador en la API se crea UNA sola vez (al elegir pronombre):
// el playerId se guarda en localStorage y un reintento nunca crea un segundo jugador.
const partidaActual = () => leer('partida_uid') ?? (escribir('partida_uid', uuid()), leer('partida_uid'));
const leerJugadores = () => leer('jugadores', {});
export const idJugador = (partida = partidaActual()) => leerJugadores()[partida]?.id ?? null;

/** Al empezar una partida nueva. Lo pendiente de partidas anteriores se sigue enviando con su propio jugador. */
export function olvidarJugador() {
  escribir('partida_uid', uuid());
}

/** Tras elegir pronombre: se encola la creación del jugador de esta partida (cuenta para las estadísticas). */
export function nuevoJugador(nombre, pronombre) {
  const partida = partidaActual();
  const todos = leerJugadores();
  if (todos[partida]?.id) return; // ya existe: no se duplica
  const datos = { nombre: nombre.slice(0, 30), pronombre };
  todos[partida] = { datos };
  escribir('jugadores', todos);
  enviar({ tipo: 'jugador', ruta: '/players', metodo: 'POST', cuerpo: datos });
}

// ---------- cola de envíos ----------
export const leerCola = () => leer('cola', []);
const quitarDeCola = (id) => escribir('cola', leerCola().filter((i) => i.id !== id));

function encolar(item) {
  const partida = partidaActual();
  // Para el guardado de una ranura solo importa el último de la misma partida: reemplaza al anterior.
  const cola = leerCola().filter((i) => !(item.clave && i.clave === item.clave && i.partida === partida));
  escribir('cola', [...cola, { ...item, id: uuid(), fecha: Date.now(), partida }].slice(-300));
}

/** Envía un elemento de la cola. Devuelve 'ok', 'descartado' o 'reintentar'. */
async function enviarElemento(item) {
  try {
    if (item.tipo === 'jugador') {
      if (!idJugador(item.partida)) {
        const j = await pedir('/players', { metodo: 'POST', cuerpo: item.cuerpo });
        const todos = leerJugadores();
        todos[item.partida] = { ...(todos[item.partida] ?? {}), id: j.id };
        escribir('jugadores', todos);
      }
    } else {
      const id = idJugador(item.partida);
      await pedir(item.ruta.replace(':id', id), { metodo: item.metodo, cuerpo: { ...item.cuerpo, ...(item.conId ? { playerId: id } : {}) } });
    }
    return 'ok';
  } catch (err) {
    if (esReintentable(err)) return 'reintentar';
    console.warn(`[cola] Envío descartado: ${err.message}`, item.cuerpo);
    return 'descartado';
  }
}

let vaciando = false;
let pedidoMientras = false;

/** Vacía la cola EN ORDEN. Se llama al iniciar, al volver la conexión y después de cada envío nuevo. */
export async function vaciarCola() {
  if (!apiActiva) return;
  if (vaciando) { pedidoMientras = true; return; }
  if (!enLinea || apiResponde === false) { programarReintento(); return; }
  vaciando = true;
  try {
    for (;;) {
      const cola = leerCola();
      if (!cola.length) break;
      let item = cola[0];
      if (item.tipo !== 'jugador' && !idJugador(item.partida)) {
        // Hace falta el jugador de esa partida: primero se crea (aunque esté más atrás en la cola)
        const jugador = cola.find((i) => i.tipo === 'jugador' && i.partida === item.partida);
        if (jugador) item = jugador;
        else if (item.partida !== partidaActual()) { quitarDeCola(item.id); continue; } // partida abandonada antes del pronombre
        else break; // la partida actual aún no elige pronombre: se espera, sin saltarse el orden
      }
      const resultado = await enviarElemento(item);
      if (resultado === 'reintentar') { marcarApi(false); programarReintento(); break; }
      quitarDeCola(item.id);
      if (resultado === 'ok') { marcarApi(true); reiniciarEspera(); }
    }
  } finally {
    vaciando = false;
  }
  if (pedidoMientras) { pedidoMientras = false; vaciarCola(); }
}

/** Encola y trata de enviar (sin esperar respuesta). Sin API no hace nada. */
function enviar(item) {
  if (!apiActiva) return;
  encolar(item);
  vaciarCola();
}

const barrasDe = (p) => Object.fromEntries(BARRAS.map((b) => [b, p[b]]));

export function guardarNube(slot, p) {
  enviar({
    tipo: 'ranura', clave: `save:${slot}`, ruta: `/saves/:id/${slot}`, metodo: 'PUT',
    cuerpo: { capitulo: p.capitulo, escena: p.escena, barras: barrasDe(p), minutos: p.minutos, muestras: p.muestras, flags: p.flags, fichas: p.fichas ?? [] },
  });
}

export function registrarDecision(p, escenaId, opcion) {
  enviar({ tipo: 'decision', ruta: '/decisiones', metodo: 'POST', conId: true, cuerpo: { capitulo: p.capitulo, escena: escenaId, opcion: opcion.slice(0, 200), barras: barrasDe(p) } });
}

export function registrarFinal(p) {
  enviar({ tipo: 'final', ruta: '/finales', metodo: 'POST', conId: true, cuerpo: { final: p.final.final, causa: p.final.causa, barras: barrasDe(p), muestras: p.muestras.length } });
}

export function registrarFicha(datoId) {
  enviar({ tipo: 'ficha', ruta: '/fichas/:id', metodo: 'POST', cuerpo: { datoId } });
}

/** Catálogo científico: lo de la API manda, lo local completa (y lo reemplaza si la API falla o está vacía). */
export async function cargarCatalogo(locales) {
  if (!apiActiva || !conectado()) return locales;
  const resultado = { ...locales };
  await Promise.all(Object.keys(locales).map(async (nombre) => {
    try {
      const remotos = await pedir(`/${nombre}`);
      if (Array.isArray(remotos) && remotos.length) {
        const porId = new Map(remotos.map((r) => [r.id, r]));
        resultado[nombre] = locales[nombre].map((l) => ({ ...l, ...Object.fromEntries(Object.entries(porId.get(l.id) ?? {}).filter(([, v]) => v != null)) }));
      }
    } catch { /* se queda con los datos locales */ }
  }));
  return resultado;
}

// ---------- arranque ----------
if (apiActiva && typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('online', async () => { enLinea = true; reiniciarEspera(); if (await comprobarConexion()) vaciarCola(); });
  globalThis.addEventListener('offline', () => { enLinea = false; marcarApi(false); });
}
if (apiActiva) {
  // Al iniciar el juego: comprobar la conexión y vaciar lo pendiente de la última sesión
  comprobarConexion().then((ok) => (ok ? vaciarCola() : programarReintento()));
}

// ---------- Zinn-IA (chat con IA) ----------
// No pasa por la cola: si no hay conexión, la API dice 503/429 o algo falla, el chat usa el RESPALDO local.
// Devuelve { modo: 'ia', texto, acciones } o { modo: 'respaldo', motivo: 'sin_api' | 'sin_conexion' | 'sin_ia' | 'limite' | 'error', error? }.

/** ¿La IA está respondiendo? Solo para el indicador del panel; ante cualquier duda, false.
 *  GET /zinnia/estado: hay key y la última respuesta del servidor NO fue "sin IA" (key inválida o sin saldo).
 *  Si la API es anterior y no tiene esa ruta, usa /salud (solo dice si hay key configurada). */
export async function iaDisponible() {
  if (!apiActiva || !enLinea || globalThis.navigator?.onLine === false) return false;
  try {
    const r = await fetch(`${API}/zinnia/estado`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const e = await r.json();
      return Boolean(e?.ia) && e?.ultima_respuesta?.modo !== 'sin_ia';
    }
    const s = await fetch(`${API}/salud`, { signal: AbortSignal.timeout(8000) });
    return Boolean((await s.json())?.zinnia?.ia);
  } catch {
    return false;
  }
}

export async function chatZinnia({ mensajes, contexto }) {
  if (!apiActiva) return { modo: 'respaldo', motivo: 'sin_api' };
  if (!enLinea || globalThis.navigator?.onLine === false) return { modo: 'respaldo', motivo: 'sin_conexion' };
  try {
    const r = await fetch(`${API}/zinnia/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: idJugador() ?? undefined, mensajes: mensajes.slice(-12), contexto }),
      signal: AbortSignal.timeout(20000), // la API corta a los 15 s; esto es por si la red se cuelga
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (r.status === 429) return { modo: 'respaldo', motivo: 'limite', error: cuerpo.error };
    if (r.status === 503) return { modo: 'respaldo', motivo: 'sin_ia' };
    if (!r.ok || !cuerpo.texto) return { modo: 'respaldo', motivo: 'error' };
    return { modo: cuerpo.modo === 'semilla' ? 'semilla' : 'ia', texto: cuerpo.texto, acciones: Array.isArray(cuerpo.acciones) ? cuerpo.acciones : [], expresion: typeof cuerpo.expresion === 'string' ? cuerpo.expresion : null };
  } catch {
    return { modo: 'respaldo', motivo: 'sin_conexion' };
  }
}
