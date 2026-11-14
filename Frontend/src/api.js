// Conexión con la API (Backend/). El juego NUNCA depende de ella:
// - sin VITE_API_URL todo es local (localStorage) y no hay aviso de "sin conexión";
// - si una petición falla, se guarda en una cola y se reenvía al volver la conexión.
import { leer, escribir } from './juego/almacen.js';
import { BARRAS } from './engine/reglas.js';

const API = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '');
export const apiActiva = Boolean(API);

// ---------- estado de la conexión ----------
let enLinea = typeof navigator === 'undefined' ? true : navigator.onLine;
let falloApi = false;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f(conectado()));
export const conectado = () => enLinea && !falloApi;
export function alCambiarConexion(f) { oyentes.add(f); return () => oyentes.delete(f); }

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { enLinea = true; avisar(); vaciarCola(); });
  window.addEventListener('offline', () => { enLinea = false; avisar(); });
}

async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) {
    const error = new Error(`La API respondió ${r.status}`);
    error.status = r.status;
    throw error;
  }
  if (falloApi) { falloApi = false; avisar(); }
  return r.status === 204 ? null : r.json();
}

const marcarFallo = (err) => {
  // Un 4xx es un dato rechazado, no un problema de conexión: no se reintenta.
  if (err.status && err.status < 500) return false;
  if (!falloApi) { falloApi = true; avisar(); }
  return true;
};

// ---------- jugador ----------
// Cada partida tiene un id local; su jugador en la API se crea una sola vez (al elegir pronombre)
// y cada envío de la cola recuerda a qué partida pertenece: así nunca se mezclan partidas.
const nuevoUid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const partidaActual = () => leer('partida_uid') ?? (escribir('partida_uid', nuevoUid()), leer('partida_uid'));
const leerJugadores = () => leer('jugadores', {});
const creando = new Map(); // partida -> promesa en curso (evita crear dos jugadores)

export const idJugador = (partida = partidaActual()) => leerJugadores()[partida]?.id ?? null;

function asegurarJugador(partida) {
  const j = leerJugadores()[partida];
  if (j?.id) return Promise.resolve(j.id);
  if (!j?.datos) return Promise.resolve(null);
  if (!creando.has(partida)) {
    creando.set(partida, pedir('/players', { metodo: 'POST', cuerpo: j.datos })
      .then((r) => {
        const todos = leerJugadores();
        if (todos[partida]) { todos[partida].id = r.id; escribir('jugadores', todos); }
        return r.id;
      })
      .finally(() => creando.delete(partida)));
  }
  return creando.get(partida);
}

/** Al empezar una partida nueva. Lo pendiente de partidas anteriores se sigue enviando con su propio jugador. */
export function olvidarJugador() {
  escribir('partida_uid', nuevoUid());
}

/** Tras elegir pronombre: se crea el jugador de esta partida (cuenta para las estadísticas). */
export function nuevoJugador(nombre, pronombre) {
  const todos = leerJugadores();
  todos[partidaActual()] = { datos: { nombre: nombre.slice(0, 30), pronombre } };
  escribir('jugadores', todos);
  if (apiActiva) vaciarCola();
}

// ---------- cola de envíos ----------
const leerCola = () => leer('cola', []);

function encolar(item) {
  // Para el guardado de una ranura solo importa el último de la misma partida: se reemplaza el anterior.
  const partida = partidaActual();
  const cola = leerCola().filter((i) => !(item.clave && i.clave === item.clave && i.partida === partida));
  escribir('cola', [...cola, { ...item, partida, uid: nuevoUid() }].slice(-300));
}

let vaciando = false;
export async function vaciarCola() {
  if (!apiActiva || vaciando || !enLinea) return;
  vaciando = true;
  try {
    if (falloApi) await pedir('/salud'); // ¿volvió la API? (si responde, se quita el aviso)
    for (const item of leerCola()) {
      const id = await asegurarJugador(item.partida);
      if (!id) {
        // Partida sin jugador todavía: espera, salvo que sea una partida vieja abandonada antes del pronombre.
        if (item.partida !== partidaActual()) escribir('cola', leerCola().filter((i) => i.uid !== item.uid));
        continue;
      }
      try {
        await pedir(item.ruta.replace(':id', id), { metodo: item.metodo, cuerpo: { ...item.cuerpo, ...(item.conId ? { playerId: id } : {}) } });
      } catch (err) {
        if (marcarFallo(err)) return; // sin conexión: se intenta después
      }
      // Se quita ESTE envío (la cola pudo cambiar mientras se enviaba)
      escribir('cola', leerCola().filter((i) => i.uid !== item.uid));
    }
  } catch (err) {
    marcarFallo(err);
  } finally {
    vaciando = false;
  }
  // Lo que llegó mientras se enviaba
  if (leerCola().some((i) => leerJugadores()[i.partida]?.id) && !falloApi) setTimeout(vaciarCola, 0);
}

/** Envía sin esperar respuesta; si falla, queda en la cola. */
function enviar(item) {
  if (!apiActiva) return;
  encolar(item);
  vaciarCola();
}

const barrasDe = (p) => Object.fromEntries(BARRAS.map((b) => [b, p[b]]));

export function guardarNube(slot, p) {
  enviar({
    clave: `save:${slot}`, ruta: `/saves/:id/${slot}`, metodo: 'PUT',
    cuerpo: { capitulo: p.capitulo, escena: p.escena, barras: barrasDe(p), minutos: p.minutos, muestras: p.muestras, flags: p.flags, fichas: p.fichas ?? [] },
  });
}

export function registrarDecision(p, escenaId, opcion) {
  enviar({ ruta: '/decisiones', metodo: 'POST', conId: true, cuerpo: { capitulo: p.capitulo, escena: escenaId, opcion: opcion.slice(0, 200), barras: barrasDe(p) } });
}

export function registrarFinal(p) {
  enviar({ ruta: '/finales', metodo: 'POST', conId: true, cuerpo: { final: p.final.final, causa: p.final.causa, barras: barrasDe(p), muestras: p.muestras.length } });
}

export function registrarFicha(datoId) {
  enviar({ ruta: '/fichas/:id', metodo: 'POST', cuerpo: { datoId } });
}

/** Catálogo científico: lo de la API manda, lo local completa (y lo reemplaza si la API falla o está vacía). */
export async function cargarCatalogo(locales) {
  if (!apiActiva) return locales;
  const resultado = { ...locales };
  await Promise.all(Object.keys(locales).map(async (nombre) => {
    try {
      const remotos = await pedir(`/${nombre}`);
      if (Array.isArray(remotos) && remotos.length) {
        const porId = new Map(remotos.map((r) => [r.id, r]));
        resultado[nombre] = locales[nombre].map((l) => ({ ...l, ...Object.fromEntries(Object.entries(porId.get(l.id) ?? {}).filter(([, v]) => v != null)) }));
      }
    } catch (err) { marcarFallo(err); }
  }));
  return resultado;
}

if (apiActiva) {
  vaciarCola();
  // Si la API se cayó sin que el navegador perdiera internet, se reintenta cada 30 s.
  if (typeof window !== 'undefined') setInterval(() => { if (falloApi || leerCola().length) vaciarCola(); }, 30000);
}
