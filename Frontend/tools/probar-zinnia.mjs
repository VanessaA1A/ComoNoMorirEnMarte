// Pruebas de los textos y la lógica de Zinn-IA (no tocan el motor).
// Uso: node tools/probar-zinnia.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESCENAS } from '../src/engine/guion.js';
import { estadoInicial } from '../src/engine/motor.js';
import { comoVoy, comoRecuperoBateria } from '../src/juego/comoVoy.js';
import { expresionPanel } from '../src/juego/expresiones.js';
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
ok(expresionPanel(s).expresion === 'asustada', 'expresión asustada con una barra en rojo');
ok(expresionPanel({ ...s, oxigeno: 90, minutos: 20 }).expresion === 'seria', 'expresión seria con menos de 30 min');
ok(expresionPanel({ ...s, bateria: 0 }).apagada === true, 'apagada (semilla) con batería en 0');
ok(expresionPanel(s, { pensando: true }).expresion === 'ojos-cerrados', 'ojos cerrados mientras piensa');
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
  ...[...ESCENAS.values()].flatMap((e) => [...(e.lineas || []).flatMap((l) => [l.texto, l.respuesta]), ...(e.opciones || []).map((o) => o.texto)]),
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

// Canción del tutorial (cap. 1): 8 versos con botón de UNA respuesta, luego "esperarGuia" y el cierre
const cancion = ESCENAS.get('c01_04');
const versos = (cancion?.lineas || []).filter((l) => l.respuesta);
ok(versos.length === 8 && cancion.accion === 'mostrarHUD' && !cancion.opciones && !cancion.efecto, 'canción: 8 versos con respuesta, sin opciones ni efecto (no multiplica rutas)');
ok(ESCENAS.get(cancion?.ir)?.accion === 'esperarGuia' && !ESCENAS.get(cancion.ir).opciones && !ESCENAS.get(cancion.ir).efecto, 'después de la canción viene "esperarGuia" (paso directo, sin efecto)');
const cierre = ESCENAS.get(ESCENAS.get(cancion?.ir)?.ir);
ok(cierre?.lineas?.at(-1)?.texto === 'Ahora sí: ¡motores encendidos!' && cierre.ir === 'c01_05' && !cierre.efecto, 'cierre: "Ahora sí: ¡motores encendidos!" y sigue a c01_05');
const listo = (pr) => formatear(versos[0]?.respuesta, { pronombre: pr, escena: 'c01_04', nombre: 'Alex' });
ok(listo('el') === '¡Listo!' && listo('ella') === '¡Lista!' && listo('elle') === '¡Liste!', `canción con los 3 pronombres: ${['el', 'ella', 'elle'].map(listo).join(' / ')}`);
ok(formatear(versos[0]?.texto, { pronombre: 'elle', escena: 'c01_04', nombre: 'Alex' }).startsWith('¡Alto, Alex!') && formatear(versos[0]?.texto, { pronombre: 'elle', escena: 'c01_04', nombre: 'Alex' }).endsWith('¿Liste?'), 'canción: "¡Alto, {nombre}!… ¿List{o|a|e}?" se formatea bien');
const emoji = /\p{Extended_Pictographic}/u;
const nuevosCancion = [...cancion.lineas, ...ESCENAS.get(cancion.ir).lineas, ...cierre.lineas].flatMap((l) => [l.texto, l.respuesta]).filter(Boolean);
ok(nuevosCancion.every((t) => !emoji.test(t)), 'canción y esperarGuia sin emojis');
ok(['feliz', 'curiosa'].includes(cancion.zinnia), `expresión de Zinn-IA en la canción: ${cancion.zinnia}`);

// Guía de supervivencia (public/data/guia_supervivencia.json): estructura, concordancia y reglas = motor
const guia = leer('public/data/guia_supervivencia.json');
const { INDEX } = await import('../src/engine/guion.js');
const { colorBarra, aplicarEfecto, finalAlVolver } = await import('../src/engine/reglas.js');
// La guía sale de docs/guia_supervivencia.md (tools/guia-md-a-json.mjs): 7 partes + referencias, citas [n] con fuente
const { convertir, citasSinReferencia } = await import('./guia-md-a-json.mjs');
const md = fs.readFileSync(path.join(raiz, '..', 'docs', 'guia_supervivencia.md'), 'utf8');
ok(JSON.stringify(convertir(md)) === JSON.stringify(guia), 'guía: el JSON está al día con docs/guia_supervivencia.md');
ok(guia.titulo && guia.subtitulo && guia.intro && guia.secciones.length === 8 && guia.secciones.every((s) => s.id && s.titulo && s.corto && s.bloques.length), 'guía: título, subtítulo, intro y 8 secciones (cómo leer, Partes 1 a 6, referencias)');
ok(guia.secciones.map((s) => s.numero).filter(Boolean).join() === '1,2,3,4,5,6', 'guía: Partes 1 a 6 numeradas');
ok(guia.secciones.every((s) => s.bloques.every((b) => ['parrafo', 'lista', 'tabla', 'nota', 'subtitulo'].includes(b.tipo))), 'guía: solo párrafos, subtítulos, listas, tablas y notas');
const nRefs = Object.keys(guia.referencias).length;
ok(nRefs >= 63 && Object.keys(guia.referencias).every((k) => Number(k) >= 1 && Number(k) <= nRefs) && Object.values(guia.referencias).every((r) => /^https?:\/\//.test(r.url)),
  `guía: ${nRefs} referencias numeradas de 1 a ${nRefs}, todas con URL`);
// Nombres de la Tierra en Marte (cuadrante Uyuni): en la memoria de Zinn-IA, con fuente oficial NASA/JPL y un chiste malo
const nombres = JSON.stringify(guia.secciones);
ok(['Uyuni', 'Nevado Sajama', 'Valle de la Luna', 'Altadena', 'Eaton Canyon', 'Chiste malo'].every((t) => nombres.includes(t))
  && [60, 61, 62, 63].every((n) => /^https:\/\/(science\.nasa\.gov|www\.jpl\.nasa\.gov)\//.test(guia.referencias[n]?.url ?? '')),
  'guía: por qué los lugares de Curiosity tienen nombres de la Tierra, con fuentes NASA/JPL [60]-[63] y chiste malo');
ok(!citasSinReferencia(guia).length, `guía: toda cita [n] tiene su referencia${citasSinReferencia(guia).length ? ' (faltan ' + citasSinReferencia(guia).join(', ') + ')' : ''}`);
const capitulosGuia = guia.secciones.find((s) => s.id === 'situaciones').bloques.filter((b) => b.tipo === 'subtitulo').map((b) => b.texto);
ok(capitulosGuia.length === 10 && capitulosGuia.every((t, i) => t.startsWith(`Capítulo ${i + 1}:`)), 'guía: Parte 3 con los 10 capítulos en orden');
const textosGuia = [guia.intro, ...guia.secciones.flatMap((s) => [s.titulo, ...s.bloques.flatMap((b) => [b.texto, ...(b.items || []), ...(b.encabezados || []), ...(b.filas || []).flat()])])].filter(Boolean);
const txtGuia = textosGuia.join('\n');
ok(textosGuia.every((t) => !emoji.test(t)), 'guía sin emojis');
ok(textosGuia.flatMap((t) => t.match(/\{[^{}]*\|[^{}]*\}/g) || []).every((m) => m.split('|').length === 3), 'guía: marcadores de pronombre con 3 formas');
ok(txtGuia.includes('llegas con vida'), 'guía: "llegas con vida" (sin género hacia el jugador)');
ok(/tecla \*\*Z\*\*/.test(txtGuia) && /\*\*Esc\*\*/.test(txtGuia), 'guía: documenta el atajo de Zinn-IA (tecla Z, Esc para cerrar)');
const sinMarcadorGuia = textosGuia.map((t) => t.replace(/[\wáéíóúñ]*\{[^{}]*\}[\wáéíóúñ]*/gi, '')).filter((t) => /\b(vivo|viva|listo|lista|tranquilo|tranquila|nosotros|nosotras)\b/i.test(t));
ok(!sinMarcadorGuia.length, `guía: ninguna palabra con género hacia el jugador queda fija${sinMarcadorGuia.length ? ': ' + sinMarcadorGuia.join(' | ').slice(0, 120) : ''}`);
// El motor manda: las cifras de la sección 2 se comprueban con las reglas reales
const ini = INDEX.estadoInicial;
ok(txtGuia.includes(`${ini.minutos} minutos`) && ini.radiacion === 0 && ['oxigeno', 'bateria', 'alimentacion', 'integridad'].every((b) => ini[b] === 100), `guía = motor: empiezas en 100 (radiación 0) con ${ini.minutos} minutos`);
const base = { ...ini, flags: {}, muestras: [] };
ok(aplicarEfecto({ ...base, alimentacion: 29 }, { minutos: -10 }).minutos === ini.minutos - 15 && txtGuia.includes('**Menos de 30:** caminas más lento (cada tramo tarda 50 % más)'), 'guía = motor: alimentación < 30 → +50 % de tiempo');
ok(aplicarEfecto({ ...base, integridad: 29 }, {}, true).oxigeno === 90 && txtGuia.includes('pierdes 10 de oxígeno extra en cada decisión'), 'guía = motor: integridad < 30 → −10 de oxígeno por decisión');
ok(aplicarEfecto({ ...base, bateria: 0 }, { oxigeno: -5, alimentacion: -5 }).oxigeno === 90 && txtGuia.includes('se gastan **el doble**'), 'guía = motor: batería en 0 → oxígeno y comida al doble');
ok(finalAlVolver({ ...base, radiacion: 70 }) === 'intermedio:radiacion' && finalAlVolver({ ...base, minutos: -1 }) === 'intermedio:tiempo' && txtGuia.includes('Con **70 o más** al volver'), 'guía = motor: radiación ≥ 70 o reloj < 0 al volver → te quedas en Marte');
ok(colorBarra('oxigeno', 51) === 'verde' && colorBarra('oxigeno', 50) === 'amarillo' && colorBarra('oxigeno', 25) === 'amarillo' && colorBarra('oxigeno', 24) === 'rojo'
  && colorBarra('radiacion', 39) === 'verde' && colorBarra('radiacion', 40) === 'amarillo' && colorBarra('radiacion', 70) === 'rojo'
  && txtGuia.includes('verde por encima de 50, amarillo de 25 a 50 y rojo por debajo de 25') && txtGuia.includes('verde por debajo de 40, amarillo de 40 a 69 y rojo de 70 en adelante'), 'guía = motor: colores de las barras');
ok(txtGuia.includes('Raciones o el depósito'), 'guía = motor: la alimentación se recupera con raciones o en el depósito');
ok(aplicarEfecto({ ...base, integridad: 1 }, { integridad: -5 }).integridad === 0 && txtGuia.includes('**Menos de 30:** fuga en el traje'), 'guía = motor: integridad en 0 y fuga bajo 30');

// Solo computadora: bloqueo en celular o ventana chica (guia.html y la API no se bloquean)
const { puedeJugar, ANCHO_MINIMO } = await import('../src/juego/dispositivo.js');
ok(ANCHO_MINIMO === 1024, 'ancho mínimo: 1024 px');
ok(!puedeJugar({ ancho: 800, punteroFino: true }), 'a 800 px se bloquea');
ok(puedeJugar({ ancho: 1280, punteroFino: true }), 'a 1280 px con mouse se juega');
ok(!puedeJugar({ ancho: 1280, punteroFino: false }), 'pantalla grande sin puntero fino (tablet) se bloquea');
ok(!puedeJugar({ ancho: 390, punteroFino: false }), 'celular se bloquea');
ok(puedeJugar({ ancho: 390, punteroFino: false, buscar: '?forzar=1' }) && puedeJugar({ ancho: 390, punteroFino: false, buscar: '?demo=1&forzar=1' }), '?forzar=1 salta el bloqueo (solo pruebas)');
ok(!puedeJugar({ ancho: 390, punteroFino: false, buscar: '?demo=1' }) && !puedeJugar({ ancho: 390, punteroFino: false, buscar: '?forzar=0' }), '?demo=1 o ?forzar=0 no saltan el bloqueo');
const bloqueo = fs.readFileSync(path.join(raiz, 'src/componentes/SoloComputadora.jsx'), 'utf8');
ok(bloqueo.includes('¡Uy! Este viaje a Marte necesita una pantalla más grande. Ábreme en una computadora para jugar.') && bloqueo.includes('href="/guia.html"') && !emoji.test(bloqueo), 'pantalla de bloqueo: texto de Zinn-IA, enlace a guia.html y sin emojis');
ok(!fs.readFileSync(path.join(raiz, 'public/guia.html'), 'utf8').includes('puedeJugar'), 'guia.html no usa el bloqueo');

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) fallaron`); process.exit(1); }
console.log('\n✅ Zinn-IA: textos y lógica en orden');
