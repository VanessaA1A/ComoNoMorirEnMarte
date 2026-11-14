// Recorre TODAS las rutas del juego usando el motor real (src/engine) y compara
// el resultado con el simulador del guion (tools/validar.mjs).
// Uso: node tools/probar-motor.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { nuevaPartida, escena, opcionesVisibles, continuar, elegir } from '../src/engine/motor.js';
import { formatear } from '../src/engine/texto.js';
import { aplicarEfecto, finalInmediato } from '../src/engine/reglas.js';

const conteo = {};
let rutas = 0;
const registrar = (s, p) => {
  const k = `${s.final.final}:${s.final.causa}`;
  conteo[k] ??= { rutas: 0, prob: 0 };
  conteo[k].rutas++; conteo[k].prob += p; rutas++;
};

function recorrer(s, p) {
  if (s.final) return registrar(s, p);
  const esc = escena(s.escena);
  const ops = opcionesVisibles(esc, s);
  if (ops.length === 0) return recorrer(continuar(s).estado, p);
  const pOp = p / ops.length;
  for (const o of ops) {
    // Si el efecto de la opción ya mata al jugador, el dado nunca se tira: una sola ruta.
    const mataAntes = finalInmediato(aplicarEfecto(s, o.efecto, true));
    if (o.probabilidad && !mataAntes) {
      recorrer(elegir(s, o, { azar: () => 0 }).estado, pOp * o.probabilidad.exito);
      recorrer(elegir(s, o, { azar: () => 0.999999 }).estado, pOp * (1 - o.probabilidad.exito));
    } else {
      recorrer(elegir(s, o).estado, pOp);
    }
  }
}

// El nombre se pide en c01_01; para la prueba basta con un nombre fijo.
const inicio = { ...nuevaPartida(), nombre: 'Prueba' };
recorrer(inicio, 1);

// Comparar con el simulador
const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = execFileSync(process.execPath, [path.join(aqui, 'validar.mjs'), path.join(aqui, '../src/data/capitulos')]).toString();
const esperado = {};
for (const m of salida.matchAll(/^(\w+:\w+)\s+(\d+)\s+([\d.]+) %/gm)) esperado[m[1]] = { rutas: +m[2], pct: +m[3] };

let ok = true;
console.log('Final                       Motor      Simulador');
for (const k of Object.keys({ ...esperado, ...conteo }).sort()) {
  const a = conteo[k]?.rutas ?? 0, b = esperado[k]?.rutas ?? 0;
  const pa = ((conteo[k]?.prob ?? 0) * 100).toFixed(1), pb = (esperado[k]?.pct ?? 0).toFixed(1);
  const igual = a === b && pa === pb;
  if (!igual) ok = false;
  console.log(`${k.padEnd(28)}${String(a).padStart(7)} ${pa.padStart(5)}%  ${String(b).padStart(7)} ${pb.padStart(5)}%  ${igual ? '✓' : '✗'}`);
}
console.log(`\nRutas recorridas por el motor: ${rutas.toLocaleString('es')}`);

// Pruebas de texto (pronombres)
const t = (pr) => formatear('¡Tranquil{o|a|e}, {nombre}! Eres {el|la|le} {primer|primera|primere}.', { nombre: 'Ana', pronombre: pr, muestras: [] });
const textosOk = t('el') === '¡Tranquilo, Ana! Eres el primer.' && t('ella') === '¡Tranquila, Ana! Eres la primera.' && t('elle') === '¡Tranquile, Ana! Eres le primere.';
console.log(`Pronombres: ${textosOk ? '✓' : '✗ ' + [t('el'), t('ella'), t('elle')].join(' | ')}`);

if (!ok || !textosOk) { console.log('\n❌ El motor NO coincide con el simulador'); process.exit(1); }
console.log('\n✅ El motor coincide exactamente con el simulador del guion');
