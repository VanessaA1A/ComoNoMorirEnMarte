// Prueba del guardado local (ZA-10) con un localStorage simulado.
// Guardar → cargar → comparar, ranuras separadas, "no se repite el efecto al cargar",
// y que el juego no se rompa si el navegador no deja guardar.
// Uso: node tools/probar-guardado.mjs
import { nuevaPartida, escena, opcionesVisibles, continuar, elegir } from '../src/engine/motor.js';
import { escribirRanura, leerRanura, hayAutoguardado, RANURAS } from '../src/juego/partidas.js';
import { alFallarAlmacen, _reiniciarAviso } from '../src/juego/almacen.js';

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// localStorage simulado (el de los navegadores: solo guarda texto)
class Memoria {
  constructor() { this.datos = new Map(); }
  getItem(k) { return this.datos.has(k) ? this.datos.get(k) : null; }
  setItem(k, v) { this.datos.set(k, String(v)); }
  removeItem(k) { this.datos.delete(k); }
  get length() { return this.datos.size; }
  key(i) { return [...this.datos.keys()][i] ?? null; }
}
globalThis.localStorage = new Memoria();

// Avanza con el motor real (modo demo: sin azar) hasta una escena
function jugarHasta(id) {
  let s = { ...nuevaPartida(), nombre: 'Ana', pronombre: 'ella' };
  for (let i = 0; i < 500 && s.escena !== id; i++) {
    const ops = opcionesVisibles(escena(s.escena), s);
    const op = ops.find((o) => o.pronombre === 'ella') ?? ops[0]; // en c01_02 elige "Ella"
    s = (ops.length ? elegir(s, op, { modoDemo: true }) : continuar(s)).estado;
  }
  return s;
}

// 1) Vacío al empezar
ok(!hayAutoguardado(), 'sin partidas: "Continuar" queda desactivado (no hay autoguardado)');

// 2) Guardar → cargar → comparar
const enMirador = jugarHasta('c04_01'); // c04_01 tiene "efecto" (−10 O2, −15 min…)
ok(enMirador.escena === 'c04_01', 'el motor llegó a c04_01 (escena con efecto)');
const guardada = escribirRanura(0, enMirador, 2);
ok(guardada !== null, 'escribirRanura(0) guarda el autoguardado');
const cargada = leerRanura(0);
ok(igual(cargada.estado, enMirador), 'al cargar, el estado del motor es idéntico al guardado');
ok(cargada.linea === 2, 'al cargar, vuelve a la misma línea del diálogo');
ok(cargada.escena === 'c04_01' && cargada.capitulo === 4 && cargada.titulo === 'El mirador', 'la ranura guarda escena, capítulo y título');
ok(cargada.nombre === 'Ana' && cargada.pronombre === 'ella', 'la ranura guarda nombre y pronombre');
ok(!Number.isNaN(Date.parse(cargada.fecha)), 'la ranura guarda la fecha');
ok(hayAutoguardado(), 'con autoguardado: "Continuar" queda activo');

// 3) Al cargar NO se vuelve a aplicar el efecto de la escena
ok(cargada.estado.oxigeno === enMirador.oxigeno && cargada.estado.minutos === enMirador.minutos,
  `al cargar no se repite el efecto de c04_01 (O2 ${cargada.estado.oxigeno}, ${cargada.estado.minutos} min)`);
const sigueOriginal = continuar(enMirador).estado;
const sigueCargada = continuar(cargada.estado).estado;
ok(igual(sigueOriginal, sigueCargada), 'seguir desde la partida cargada da exactamente lo mismo que sin guardar');

// 4) Ranuras separadas, una clave por ranura con el prefijo del juego
const otra = jugarHasta('c06_01');
for (const n of [1, 2, 3]) escribirRanura(n, n === 2 ? otra : enMirador, 0);
ok(RANURAS.every((n) => localStorage.getItem(`cnmm_ranura_${n}`)), 'cada ranura tiene su clave: cnmm_ranura_0 … cnmm_ranura_3');
ok(leerRanura(2).escena === 'c06_01' && leerRanura(1).escena === 'c04_01', 'las ranuras no se pisan entre sí');

// 5) Ranura dañada = vacía (sin romper)
localStorage.setItem('cnmm_ranura_3', '{esto no es json');
ok(leerRanura(3) === null, 'una ranura dañada se trata como vacía');

// 6) Cuota llena: no se rompe, devuelve null y avisa UNA vez
let avisos = 0;
const quitar = alFallarAlmacen(() => avisos++);
_reiniciarAviso();
globalThis.localStorage = { ...new Memoria(), getItem: () => null, removeItem() {}, setItem() { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } };
let lanzo = false;
try {
  ok(escribirRanura(0, enMirador) === null, 'con la cuota llena, escribirRanura devuelve null');
  escribirRanura(1, enMirador);
} catch { lanzo = true; }
ok(!lanzo, 'con la cuota llena, guardar no lanza errores');
ok(avisos === 1, `se avisa una sola vez (${avisos})`);

// 7) Modo privado: localStorage bloqueado o inexistente
_reiniciarAviso();
globalThis.localStorage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('SecurityError'); } };
lanzo = false;
try { ok(leerRanura(0) === null && !hayAutoguardado(), 'con localStorage bloqueado, leer devuelve "vacío"'); escribirRanura(0, enMirador); } catch { lanzo = true; }
ok(!lanzo, 'con localStorage bloqueado, el juego no se rompe');
delete globalThis.localStorage;
lanzo = false;
try { escribirRanura(0, enMirador); leerRanura(0); } catch { lanzo = true; }
ok(!lanzo, 'sin localStorage, el juego no se rompe');
quitar();

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) de guardado fallaron`); process.exit(1); }
console.log('\n✅ Guardado local: guardar → cargar → comparar correcto y a prueba de fallos');
