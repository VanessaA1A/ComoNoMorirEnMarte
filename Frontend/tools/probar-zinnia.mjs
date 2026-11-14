// Pruebas de los textos y la lógica de Zinn-IA (no tocan el motor).
// Uso: node tools/probar-zinnia.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESCENAS } from '../src/engine/guion.js';
import { estadoInicial } from '../src/engine/motor.js';
import { comoVoy, expresionZinnia, comoRecuperoBateria } from '../src/juego/comoVoy.js';
import { fichasPara } from '../src/juego/fichas.js';
import { PASOS } from '../src/juego/tutorial.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => JSON.parse(fs.readFileSync(path.join(raiz, r), 'utf8'));
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

// Pistas: cada clave es una escena con opciones
const pistas = leer('src/data/pistas.json');
for (const id of Object.keys(pistas)) ok(ESCENAS.get(id)?.opciones?.length > 0, `pista ${id} apunta a una escena con opciones`);
const sinPista = [...ESCENAS.values()].filter((e) => e.opciones && !pistas[e.id]).map((e) => e.id);
console.log(`  Escenas con opciones sin pista (muestran "¿Cómo voy?"): ${sinPista.join(', ')}`);

// Tutorial: 12 pasos y cada objetivo existe como data-tutorial en el código
const codigo = fs.readdirSync(path.join(raiz, 'src/componentes')).map((f) => fs.readFileSync(path.join(raiz, 'src/componentes', f), 'utf8')).join('\n');
ok(PASOS.length === 12, `el tutorial tiene 12 pasos (${PASOS.length})`);
for (const p of PASOS) ok(codigo.includes(`data-tutorial="${p.objetivo}"`), `paso ${p.id}: el objetivo "${p.objetivo}" existe en la interfaz`);

// Respuestas: temas obligatorios
const respuestas = leer('src/data/zinnia_respuestas.json');
for (const id of ['guardar', 'barra-cero', 'ganar', 'capas', 'inercia', 'boxwork', 'aire', 'biofirma', 'opportunity', 'percloratos', 'radiacion', 'bateria']) {
  ok(respuestas.some((r) => r.id === id), `pregunta frecuente: ${id}`);
}

// ¿Cómo voy?
const s = { ...estadoInicial(), hud: true, capitulo: 6, escena: 'c06_01', oxigeno: 20, minutos: 40, muestras: ['M1', 'M2'] };
const lectura = comoVoy(s).join(' | ');
ok(lectura.includes('oxígeno está en rojo'), 'lee el oxígeno en rojo');
ok(lectura.includes('40 minutos'), 'lee los minutos que quedan');
ok(lectura.includes('2 de 3 muestras'), 'lee las muestras');
ok(lectura.includes('capítulo 6'), 'dice el capítulo');
ok(expresionZinnia(s) === 'alerta', 'expresión alerta con una barra en rojo');
ok(expresionZinnia({ ...s, oxigeno: 90, minutos: 20 }) === 'triste', 'expresión triste con menos de 30 min');
ok(expresionZinnia({ ...s, bateria: 0 }) === 'apagada', 'apagada con batería en 0');
ok(comoRecuperoBateria({ ...s, capitulo: 9, escena: 'c09_03', flags: {} }).includes('Ya no quedan'), 'batería: sin fuentes después del depósito');
ok(comoRecuperoBateria({ ...s, capitulo: 5, escena: 'c05_01', flags: { equipo_bateria: true } }).includes('depósito'), 'batería: menciona el depósito antes del cap. 7');

// Fichas
ok(fichasPara(9).includes('D01') && fichasPara(9).includes('D02'), 'fichas del capítulo 9');
ok(fichasPara('Mapa').includes('D14'), 'fichas del Mapa de Marte');
ok(fichasPara('Final').includes('D22'), 'ficha del final');
ok(!fichasPara(2).includes('D09'), 'D09 no es ficha (uso Z)');

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) fallaron`); process.exit(1); }
console.log('\n✅ Zinn-IA: textos y lógica en orden');
