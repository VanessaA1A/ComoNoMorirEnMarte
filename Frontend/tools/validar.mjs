// Validador y simulador del guion de "Cómo no morir en Marte".
// Uso: node validar.mjs [carpeta_capitulos]
// 1) Revisa que cada "ir", "ir_fallo" y "ramas" apunte a una escena que existe,
//    que ninguna escena quede sin salida y que todas las escenas sean alcanzables.
// 2) Simula TODAS las rutas posibles con las reglas de las barras y cuenta los finales.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] || path.resolve(__dirname, '../src/data/capitulos');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

const index = leer('index.json');
const escenas = new Map();
const inicioCap = new Map();
const errores = [];

for (const c of index.capitulos) {
  const cap = leer(c.archivo);
  inicioCap.set(c.numero, cap.inicio);
  for (const e of cap.escenas) {
    if (escenas.has(e.id)) errores.push(`ID repetido: ${e.id}`);
    escenas.set(e.id, { ...e, capitulo: c.numero });
  }
}
const finales = leer(index.finales).escenas;
const finalPorCausa = new Map(finales.map((f) => [`${f.final}:${f.causa}`, f.id]));
for (const f of finales) escenas.set(f.id, { ...f, esFinal: true });

// ---------- 1. Enlaces ----------
const destinos = (e) => {
  const d = [];
  if (e.ir) d.push(e.ir);
  for (const o of e.opciones || []) {
    if (o.ir) d.push(o.ir);
    if (o.probabilidad?.ir_fallo) d.push(o.probabilidad.ir_fallo);
  }
  for (const r of e.ramas || []) d.push(r.ir);
  if (e.siguienteCapitulo) d.push(inicioCap.get(e.siguienteCapitulo));
  return d;
};
for (const e of escenas.values()) {
  if (e.esFinal) continue;
  const d = destinos(e);
  if (d.length === 0 && e.accion !== 'evaluarFinal') errores.push(`Escena sin salida: ${e.id}`);
  for (const id of d) if (!escenas.has(id)) errores.push(`${e.id} apunta a una escena que no existe: ${id}`);
  for (const o of e.opciones || []) if (!o.ir) errores.push(`${e.id}: opción sin "ir": ${o.texto}`);
}
const alcanzadas = new Set();
const pila = [inicioCap.get(1)];
while (pila.length) {
  const id = pila.pop();
  if (alcanzadas.has(id) || !escenas.has(id)) continue;
  alcanzadas.add(id);
  const e = escenas.get(id);
  pila.push(...destinos(e));
  if (e.accion === 'evaluarFinal') pila.push(...finales.map((f) => f.id));
}
for (const id of escenas.keys()) if (!alcanzadas.has(id)) errores.push(`Escena inalcanzable: ${id}`);

// ---------- 2. Reglas de las barras (las mismas que debe usar engine/estado.js) ----------
const BARRAS = ['oxigeno', 'bateria', 'alimentacion', 'integridad', 'radiacion'];
const clamp = (v) => Math.max(0, Math.min(100, v));

function aplicarEfecto(s, ef = {}, esDecision = false) {
  s = { ...s, flags: { ...s.flags } };
  const mult = {};
  if (s.bateria <= 0) { mult.oxigeno = 2; mult.alimentacion = 2; } // sin batería: sin regulación ni calefacción
  for (const [k, v0] of Object.entries(ef)) {
    let v = v0;
    if (v < 0 && mult[k]) v *= mult[k];
    if (k === 'minutos') {
      if (v < 0 && s.alimentacion < 30) v = Math.round(v * 1.5); // poca energía: paso lento
      s.minutos += v;
    } else s[k] = clamp(s[k] + v);
  }
  if (esDecision && s.integridad < 30) s.oxigeno = clamp(s.oxigeno - 10); // fuga por traje dañado
  if (s.alimentacion <= 0) s.flags.rescate = true;
  return s;
}
function finalInmediato(s) {
  if (s.oxigeno <= 0) return 'malo:oxigeno';
  if (s.integridad <= 0) return 'malo:integridad';
  if (s.radiacion >= 100) return 'malo:radiacion';
  return null;
}
function finalAlVolver(s) {
  const m = finalInmediato(s);
  if (m) return m;
  if (s.minutos < 0) return 'intermedio:tiempo';
  if (s.flags.rescate) return 'intermedio:rescate';
  if (s.radiacion >= 70) return 'intermedio:radiacion';
  return 'bueno:exito';
}
const cumple = (cond, s) => {
  if (!cond) return true;
  if (cond.flag && !s.flags[cond.flag]) return false;
  if (cond.noFlag && s.flags[cond.noFlag]) return false;
  if (cond.muestrasMin != null && s.muestras.length < cond.muestrasMin) return false;
  if (cond.muestrasMax != null && s.muestras.length > cond.muestrasMax) return false;
  return true;
};

// ---------- 3. Simulación exhaustiva ----------
const conteo = {}; // final -> {rutas, prob}
let rutas = 0;
function registrar(final, prob) {
  if (!finalPorCausa.has(final)) errores.push(`Falta escena para el final ${final}`);
  conteo[final] ??= { rutas: 0, prob: 0 };
  conteo[final].rutas++; conteo[final].prob += prob;
  rutas++;
}
function visitar(id, s, prob) {
  const e = escenas.get(id);
  if (e.efecto) {
    s = aplicarEfecto(s, e.efecto);
    const m = finalInmediato(s); if (m) return registrar(m, prob);
  }
  if (e.accion === 'evaluarFinal') return registrar(finalAlVolver(s), prob);
  if (e.opciones) {
    const ops = e.opciones.filter((o) => cumple(o.requiere, s));
    const p = prob / ops.length; // jugador al azar: cada opción igual de probable
    for (const o of ops) {
      let s2 = aplicarEfecto(s, o.efecto, true);
      if (o.marca) s2.flags[o.marca] = true;
      if (o.muestra) s2.muestras = [...s2.muestras, o.muestra];
      const m = finalInmediato(s2); if (m) { registrar(m, p); continue; }
      if (o.probabilidad) {
        visitar(o.ir, s2, p * o.probabilidad.exito);
        visitar(o.probabilidad.ir_fallo, s2, p * (1 - o.probabilidad.exito));
      } else visitar(o.ir, s2, p);
    }
    return;
  }
  const rama = (e.ramas || []).find((r) => cumple(r.si, s));
  if (rama) return visitar(rama.ir, s, prob);
  if (e.siguienteCapitulo) return visitar(inicioCap.get(e.siguienteCapitulo), s, prob);
  return visitar(e.ir, s, prob);
}

if (errores.length === 0) {
  visitar(inicioCap.get(1), { ...index.estadoInicial, flags: {}, muestras: [] }, 1);
}

// ---------- Informe ----------
console.log(`Escenas: ${escenas.size} (${finales.length} finales)`);
if (errores.length) {
  console.log(`\n❌ ${errores.length} problema(s):`);
  for (const e of errores) console.log(' - ' + e);
  process.exit(1);
}
console.log('✅ Enlaces correctos: todas las escenas existen, tienen salida y son alcanzables.');
console.log(`\nRutas simuladas: ${rutas.toLocaleString('es')}`);
console.log('Final                       Rutas      % jugando al azar');
for (const [f, v] of Object.entries(conteo).sort()) {
  console.log(`${f.padEnd(28)}${String(v.rutas).padStart(7)}      ${(v.prob * 100).toFixed(1)} %`);
}
const faltan = [...finalPorCausa.keys()].filter((k) => !conteo[k]);
if (faltan.length) console.log(`\n⚠️  Finales que ninguna ruta alcanza: ${faltan.join(', ')}`);