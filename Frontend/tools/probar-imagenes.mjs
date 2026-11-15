// Imágenes: cada archivo referenciado existe con EXACTAMENTE el mismo nombre (mayúsculas incluidas; Vercel es Linux
// y distingue mayúsculas, Windows no) y el logotipo nunca se usa como imagen de Zinn-IA.
// Uso: node tools/probar-imagenes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { EXPRESIONES, expresionValida, rutaExpresion, expresionEscena, expresionPanel, expresionRespaldo } from '../src/juego/expresiones.js';
import { ESCENAS } from '../src/engine/guion.js';
import { separarExpresion } from '../../Backend/src/zinnia/agente.js';
import TUTORIAL from '../src/data/tutorial.json' with { type: 'json' };

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const publico = path.join(raiz, 'public');
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

/** ¿Existe la ruta pública con exactamente esas mayúsculas? (compara cada parte con el nombre real en disco) */
function existeExacto(ruta) {
  let dir = publico;
  for (const parte of ruta.replace(/^\//, '').split('/').map(decodeURIComponent)) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory() || !fs.readdirSync(dir).includes(parte)) return false;
    dir = path.join(dir, parte);
  }
  return fs.statSync(dir).isFile();
}
const archivos = (dir, ext) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (
  d.isDirectory() ? archivos(path.join(dir, d.name), ext) : ext.test(d.name) ? [path.join(dir, d.name)] : []));

// 1) Las 6 expresiones existen con el nombre exacto, en minúsculas y sin espacios ni acentos
ok(EXPRESIONES.length === 6, 'lista fija de 6 expresiones');
for (const e of EXPRESIONES) {
  const r = rutaExpresion(e);
  ok(/^\/zinnia\/[a-z-]+\.png$/.test(r) && existeExacto(r), `${r} existe con ese nombre exacto`);
}

// 2) Toda ruta fija de imagen en el código (src, index.html, estilos) existe con ese nombre exacto
const fuentes = [...archivos(path.join(raiz, 'src'), /\.(jsx?|css)$/), path.join(raiz, 'index.html')];
const RUTA = /["'`(]\s*(\/(?:img|zinnia|fonts)\/[^"'`)\s?#]+\.(?:png|gif|jpe?g|webp|svg|ttf|otf))/g;
const faltan = [];
let vistas = 0;
for (const f of fuentes) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(RUTA)) {
    if (m[1].includes('${')) continue;
    vistas++;
    if (!existeExacto(m[1])) faltan.push(`${path.relative(raiz, f)}: ${m[1]}`);
  }
}
ok(vistas > 0 && faltan.length === 0, `rutas de imagen en el código existen con mayúsculas exactas (${vistas})${faltan.length ? `\n    faltan: ${faltan.join('\n    ')}` : ''}`);

// 3) Un solo componente dibuja a Zinn-IA y el logotipo nunca es su imagen
const LOGO = /isotipo|logotipo|logo_/i;
const avatar = fs.readFileSync(path.join(raiz, 'src/componentes/ZinniaAvatar.jsx'), 'utf8');
const reglas = fs.readFileSync(path.join(raiz, 'src/juego/expresiones.js'), 'utf8');
ok(!LOGO.test(avatar.replace(/^\s*\/\/.*$/gm, '')) && !LOGO.test(reglas), 'ZinniaAvatar y expresiones.js no usan el logotipo');
const otros = fuentes.filter((f) => !/ZinniaAvatar\.jsx$|expresiones\.js$/.test(f) && /\.jsx?$/.test(f))
  .filter((f) => /['"`]\/(?:img\/)?zinnia[/_]|zinnia_(?:rostro|estatica|parpadeando|multiexpresion)/.test(fs.readFileSync(f, 'utf8')));
ok(otros.length === 0, `solo ZinniaAvatar dibuja a Zinn-IA${otros.length ? ` (también: ${otros.map((f) => path.relative(raiz, f)).join(', ')})` : ''}`);
const mezclas = fuentes.filter((f) => /\.jsx$/.test(f)).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l) &&/Zinn-?IA|zinnia/i.test(l) && LOGO.test(l) && !/logo-carga|logo-nombre/.test(l)).map((l) => `${path.relative(raiz, f)}: ${l.trim().slice(0, 90)}`));
ok(mezclas.length === 0, `ninguna imagen de Zinn-IA apunta al logotipo${mezclas.length ? `\n    ${mezclas.join('\n    ')}` : ''}`);

// 4) Expresiones: lo desconocido cae en normal; guion, tutorial y reglas solo dan las 6
ok(expresionValida('feliz') === 'normal' && expresionValida('logo') === 'normal' && expresionValida(undefined) === 'normal', 'expresión desconocida → normal');
const enGuion = [...ESCENAS.values()].flatMap((e) => (e.lineas ?? []).filter((l) => l.expresion).map((l) => [e.id, l]));
ok(enGuion.length > 0 && enGuion.every(([, l]) => l.quien === 'Zinn-IA' && EXPRESIONES.includes(l.expresion)),
  `guion: ${enGuion.length} líneas con "expresion", todas de Zinn-IA y de la lista`);
ok(TUTORIAL.every((t) => EXPRESIONES.includes(expresionValida(t.expresion ?? t.zinnia))), 'tutorial: cada paso tiene una expresión válida');
const p = { hud: true, capitulo: 5, minutos: 120, oxigeno: 90, bateria: 90, alimentacion: 90, integridad: 90, radiacion: 10 };
ok(expresionEscena({ partida: { ...p, bateria: 0 }, escena: {}, linea: null }).apagada, 'escena: batería en 0 → semilla');
ok(expresionEscena({ partida: { ...p, oxigeno: 10 }, escena: { zinnia: 'feliz' }, linea: { quien: 'Narración' } }).expresion === 'asustada', 'escena: barra en rojo → asustada');
ok(expresionEscena({ partida: { ...p, oxigeno: 40 }, escena: { zinnia: 'feliz' }, linea: { quien: 'Narración' } }).expresion === 'seria', 'escena: barra en amarillo → seria');
ok(expresionEscena({ partida: p, escena: {}, linea: { quien: 'Zinn-IA', expresion: 'enojada' } }).expresion === 'enojada', 'escena: la línea de Zinn-IA manda');
ok(expresionPanel(p, { pensando: true }).expresion === 'ojos-cerrados', 'panel: pensando → ojos cerrados');
ok(expresionRespaldo('Ojo: revisa la radiación', { p }) === 'seria' && expresionRespaldo('¿Qué hace un rover?', { chiste: true, p }) === 'normal', 'respaldo: advertencia → seria; chiste → normal');

// 5) Servidor: la expresión del modelo se valida (si no es una de las 6, normal) y la etiqueta no llega al texto
const a = separarExpresion('[asustada] ¡Tormenta solar!');
const b = separarExpresion('[logo] Hola');
const c = separarExpresion('Sin etiqueta');
ok(a.expresion === 'asustada' && a.texto === '¡Tormenta solar!', 'servidor: [asustada] se separa del texto');
ok(b.expresion === 'normal' && b.texto === 'Hola' && c.expresion === 'normal', 'servidor: etiqueta inválida o ausente → normal');

// 6) ZinniaAvatar dibujado: con una expresión que no existe se ve normal.png y nunca el logotipo
const vite = await createServer({ root: raiz, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { React, renderToString } = await vite.ssrLoadModule('/tools/render-react.js');
  const ZinniaAvatar = (await vite.ssrLoadModule('/src/componentes/ZinniaAvatar.jsx')).default;
  const html = (props) => renderToString(React.createElement(ZinniaAvatar, props));
  const raro = html({ expresion: 'no-existe' });
  ok(raro.includes('data-expresion="normal"') && raro.includes('src="/zinnia/normal.png"') && !LOGO.test(raro), 'ZinniaAvatar("no-existe") muestra normal.png, sin logotipo');
  for (const e of EXPRESIONES) {
    const x = html({ expresion: e });
    ok(x.includes(`data-expresion="${e}"`) && !LOGO.test(x), `ZinniaAvatar("${e}") muestra ${e}.png`);
  }
  const apagada = html({ apagada: true });
  ok(apagada.includes('zinnia-avatar-apagada') && apagada.includes('data-expresion="ojos-cerrados"'), 'ZinniaAvatar apagada: ojos cerrados en gris');
} finally {
  await vite.close();
}

if (fallos) { console.log(`\n${fallos} prueba(s) de imágenes fallaron`); process.exit(1); }
console.log('\nImágenes: nombres exactos y Zinn-IA sin logotipo');
