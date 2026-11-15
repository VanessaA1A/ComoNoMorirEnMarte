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
ok(fichasPara(2).includes('D09') && fichasPara(9).includes('D09'), 'D09 ("2,9") se desbloquea en el capítulo 2 y en el 9');
ok(fichasPara(3).includes('D29') && fichasPara(5).includes('D29'), 'D29 ("3,5") se desbloquea en el capítulo 3 y en el 5');

// Datos, capas y recursos nuevos
const datos = leer('src/data/datos.json');
ok(datos.length === 33, `33 datos y 33 fichas (${datos.length})`);
const esUrl = (u) => /^https?:\/\//.test(u);
ok(datos.every((d) => esUrl(d.fuente)), 'todas las fuentes de datos.json son URL');
const todos = ['src/data', 'src/componentes', 'src/juego']
  .flatMap((d) => fs.readdirSync(path.join(raiz, d)).filter((f) => /\.(json|jsx?)$/.test(f)).map((f) => fs.readFileSync(path.join(raiz, d, f), 'utf8')))
  .join('\n');
ok(!/enlace pendiente/i.test(todos), 'no queda ningún "(enlace pendiente)"');
ok(respuestas.every((r) => !r.fuente || esUrl(r.fuente)), 'las fuentes de "Pregúntale a Zinn-IA" son URL');
const capas = leer('src/data/capas.json');
ok(capas.length === 6 && capas.some((c) => c.id === 'geologia'), '6 capas, incluida geología');
ok(leer('src/data/recursos_nasa.json').length === 5, '5 recursos NASA del reto');
const lineasConCapa = [...ESCENAS.values()].flatMap((e) => (e.lineas || []).filter((l) => l.capa).map((l) => [e.id, l.capa]));
ok(lineasConCapa.every(([, c]) => capas.some((x) => x.id === c)), 'toda línea con "capa" usa una capa que existe');
ok(lineasConCapa.some(([e, c]) => e === 'c03_02' && c === 'geologia') && lineasConCapa.some(([e, c]) => e === 'c05_01' && c === 'geologia'), 'c03_02 y c05_01 tienen línea con capa geología');

// Concordancia de género: Zinn-IA y la narración hablan según el pronombre que eligió el jugador
const { formatear } = await import('../src/engine/texto.js');
const textosJugables = [
  ...[...ESCENAS.values()].flatMap((e) => [...(e.lineas || []).map((l) => l.texto), ...(e.opciones || []).map((o) => o.texto)]),
  ...respuestas.map((r) => r.respuesta), ...Object.values(pistas).map((x) => x.texto ?? x),
  ...PASOS.map((p) => p.texto), ...leer('src/data/chistes.json').map((c) => c.texto),
].filter((t) => typeof t === 'string');
const marcadores = textosJugables.flatMap((t) => t.match(/\{[^{}]*\|[^{}]*\}/g) || []);
ok(marcadores.every((m) => m.split('|').length === 3), `todo marcador de pronombre tiene 3 formas (${marcadores.length})`);
for (const pr of ['el', 'ella', 'elle']) {
  const s = { pronombre: pr, escena: 'c05_01', nombre: 'Alex', muestras: [] };
  ok(textosJugables.every((t) => !/\{[^{}]*\|/.test(formatear(t, s))), `con "${pr}" no queda ningún marcador sin reemplazar`);
}
// Palabras que se refieren al jugador y SIEMPRE deben ir con marcador {o|a|e}
const conGenero = /\b(nosotr[oa]s|tranquil[oa]|list[oa]|viv[oa]|cansad[oa]|preparad[oa]|bienvenid[oa]|desmayad[oa]|nuev[oa])\b/i;
// Excepciones: "Vivo en la tablet" (verbo, habla Zinn-IA) y "haberte desmayado" (participio con haber: no cambia)
const sinMarcador = textosJugables
  .map((t) => t.replace(/[\wáéíóúñ]*\{[^{}]*\}[\wáéíóúñ]*/gi, '').replace(/Vivo en la tablet|haberte desmayado/g, ''))
  .filter((t) => conGenero.test(t));
ok(!sinMarcador.length, `ninguna palabra con género hacia el jugador queda fija${sinMarcador.length ? ': ' + sinMarcador.map((t) => t.match(conGenero)[0]).join(', ') : ''}`);
const nos = textosJugables.find((t) => t.includes('Se fue sin'));
ok(formatear(nos, { pronombre: 'ella', escena: 'final_x' }).includes('sin nosotras') && formatear(nos, { pronombre: 'elle', escena: 'final_x' }).includes('sin nosotres'), 'final de tiempo: "nosotros / nosotras / nosotres"');
ok(formatear('viv{o|a|e}', { pronombre: 'el', escena: 'c01_01' }) === 'vivo/a/e', 'antes de elegir pronombre se muestran las 3 formas (vivo/a/e)');
ok(formatear('viv{o|a|e}', null) === 'vivo/a/e', 'sin partida también (vivo/a/e)');
ok(['vivo', 'viva', 'vive'].every((v, i) => formatear('viv{o|a|e}', { pronombre: ['el', 'ella', 'elle'][i], escena: 'c03_01' }) === v), 'después de elegir: vivo / viva / vive');

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) fallaron`); process.exit(1); }
console.log('\n✅ Zinn-IA: textos y lógica en orden');
