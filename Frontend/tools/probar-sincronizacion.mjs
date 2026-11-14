// Prueba de conectividad y cola de sincronización (con fetch, localStorage y eventos simulados).
// offline → 3 eventos encolados → online → la cola se vacía EN ORDEN, sin duplicar al jugador.
// Uso: node tools/probar-sincronizacion.mjs
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 5000) { const t = Date.now(); while (!cond() && Date.now() - t < ms) await esperar(25); return cond(); }

// ---------- entorno simulado del navegador ----------
class Memoria {
  constructor() { this.d = new Map(); }
  getItem(k) { return this.d.has(k) ? this.d.get(k) : null; }
  setItem(k, v) { this.d.set(k, String(v)); }
  removeItem(k) { this.d.delete(k); }
}
globalThis.localStorage = new Memoria();
const bus = new EventTarget();
globalThis.addEventListener = bus.addEventListener.bind(bus);
globalThis.dispatchEvent = bus.dispatchEvent.bind(bus);
Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });

// ---------- API simulada ----------
const API = 'http://api.test/api';
const UUID = '22222222-2222-4222-8222-222222222222';
let red = false;          // false = el fetch falla como sin internet
let saludDb = true;       // lo que responde /salud en "db"
const llamadas = [];      // peticiones que SÍ llegaron (sin contar /salud)
const avisosConsola = [];
console.warn = (...a) => avisosConsola.push(a.map(String).join(' '));
const erroresConsola = [];
console.error = (...a) => erroresConsola.push(a.map(String).join(' '));

globalThis.fetch = async (url, op = {}) => {
  if (!red) throw new TypeError('Failed to fetch');
  const ruta = url.replace(API, '');
  const metodo = op.method ?? 'GET';
  const cuerpo = op.body ? JSON.parse(op.body) : undefined;
  const json = (d, status = 200) => ({ ok: status < 400, status, json: async () => d });
  if (ruta === '/salud') return json({ ok: true, db: saludDb });
  llamadas.push({ metodo, ruta, cuerpo });
  if (ruta === '/players') return json({ id: UUID, ...cuerpo }, 201);
  if (cuerpo?.datoId === 'D99') return json({ error: 'El jugador o el dato indicado no existe' }, 404);
  return json({ ok: true }, metodo === 'POST' ? 201 : 200);
};

globalThis.CNMM_API_URL = API;
const api = await import('../src/api.js');
const { nuevaPartida } = await import('../src/engine/motor.js');
const estado = { ...nuevaPartida(), nombre: 'Ana', pronombre: 'ella', hud: true };

// 1) Sin conexión: todo se encola, nada se envía
await esperar(50);
ok(!api.conectado(), 'al iniciar sin internet: conectado() = false');
api.olvidarJugador();
api.nuevoJugador('Ana', 'ella');
api.guardarNube(0, estado);
api.registrarDecision(estado, 'c01_05', 'Racionar desde ahora');
api.registrarFicha('D04');
await esperar(100);
const cola = api.leerCola();
ok(llamadas.length === 0, 'sin conexión no se envía nada');
ok(cola.map((i) => i.tipo).join(',') === 'jugador,ranura,decision,ficha', `la cola guarda los envíos en orden (${cola.map((i) => i.tipo).join(', ')})`);
ok(cola.every((i) => /^[0-9a-f-]{36}$/.test(i.id) && Number.isFinite(i.fecha)), 'cada envío tiene id único (crypto.randomUUID) y fecha');
ok(new Set(cola.map((i) => i.id)).size === cola.length, 'los ids de la cola no se repiten');

// 2) Vuelve la conexión: la cola se vacía EN ORDEN
red = true;
globalThis.navigator.onLine = true;
globalThis.dispatchEvent(new Event('online'));
ok(await hasta(() => api.leerCola().length === 0), 'al volver la conexión la cola queda vacía');
ok(api.conectado(), 'con /salud { db: true }: conectado() = true');
const orden = llamadas.map((l) => `${l.metodo} ${l.ruta.replace(UUID, ':id')}`);
ok(orden.join(' → ') === 'POST /players → PUT /saves/:id/0 → POST /decisiones → POST /fichas/:id', `se envió en orden: ${orden.join(' → ')}`);
ok(llamadas[2]?.cuerpo?.playerId === UUID, 'la decisión lleva el playerId creado');
ok(api.idJugador() === UUID, 'el playerId queda guardado en localStorage');

// 3) El jugador no se duplica aunque se pida de nuevo
api.nuevoJugador('Ana', 'ella');
await esperar(100);
ok(llamadas.filter((l) => l.ruta === '/players').length === 1, 'reintentar no crea un segundo jugador');

// 4) Error de red: se reintenta después con espera (backoff)
red = false;
api.registrarFicha('D17');
await esperar(100);
ok(api.leerCola().length === 1 && !api.conectado(), 'con error de red el envío se queda en la cola y se marca sin conexión');
red = true;
ok(await hasta(() => api.leerCola().length === 0, 6000), 'tras la espera se reintenta solo y la cola se vacía');
ok(llamadas.at(-1)?.cuerpo?.datoId === 'D17', 'el envío reintentado llegó');

// 5) 4xx: se descarta y se registra en consola
api.registrarFicha('D99');
ok(await hasta(() => api.leerCola().length === 0), 'un 4xx se quita de la cola (no se reintenta)');
ok(avisosConsola.some((a) => a.includes('descartado')), 'el descarte queda registrado en la consola');

// 6) Hay conexión solo si /salud responde db: true
saludDb = false;
ok(!(await api.comprobarConexion()) && !api.conectado(), 'si /salud responde db: false, cuenta como sin conexión');
saludDb = true;
ok(await api.comprobarConexion(), 'con db: true vuelve a haber conexión');

// 7) Sin VITE_API_URL: solo local, sin peticiones ni errores
delete globalThis.CNMM_API_URL;
const antes = llamadas.length;
const local = await import('../src/api.js?sin-api');
local.nuevoJugador('Beto', 'el');
local.guardarNube(1, estado);
local.registrarFicha('D04');
await local.vaciarCola();
await esperar(100);
ok(!local.apiActiva && local.conectado(), 'sin VITE_API_URL el juego es local y "conectado" (sin aviso)');
ok(llamadas.length === antes, 'sin VITE_API_URL no se hace ninguna petición');
ok(erroresConsola.length === 0, `sin errores en consola (${erroresConsola.length})`);

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) de sincronización fallaron`); process.exit(1); }
console.log('\n✅ Conectividad y cola: offline → encolar → online → vaciar en orden, sin duplicar');
process.exit(0);
