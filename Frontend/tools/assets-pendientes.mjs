// Genera dos listas a partir del guion, los datos y el código (no a mano):
//   tools/assets-pendientes.md  → TODAS las imágenes que el juego espera, dónde se usan y si ya existen
//   tools/mapa-imagenes.md      → de qué archivo de Imagenes/ salió cada imagen de public/img y cuánto pesa
// Uso: node tools/assets-pendientes.mjs   (o npm run assets)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const img = path.join(raiz, 'public/img');
const leerJSON = (r) => JSON.parse(fs.readFileSync(path.join(raiz, r), 'utf8'));
const LIMITE_KB = 1536; // 1,5 MB
const EXT = ['.png', '.gif', '.jpg', '.webp'];

/** Igual que el componente Recurso: la extensión pedida y luego .png, .gif, .jpg, .webp. */
function encontrar(ruta) {
  const base = ruta.replace(/\.[a-z0-9]+$/i, '');
  for (const r of [ruta, ...EXT.map((e) => base + e)]) {
    const f = path.join(img, r);
    if (fs.existsSync(f)) return { ruta: r, kb: Math.round(fs.statSync(f).size / 1024) };
  }
  return null;
}

// ---------- 1. Lo que el juego espera ----------
const esperadas = new Map(); // ruta -> { grupo, usos:Set, alternativa? }
const agregar = (ruta, grupo, uso, alternativa) => {
  if (!esperadas.has(ruta)) esperadas.set(ruta, { grupo, usos: new Set(), alternativa });
  esperadas.get(ruta).usos.add(uso);
};

const capDir = 'src/data/capitulos';
const index = leerJSON(`${capDir}/index.json`);
for (const c of index.capitulos) agregar(`fondos/${c.fondoTarjeta}`, 'Fondos de escenas', `tarjeta del cap. ${c.numero} (si falta: fondos/cargando)`);
for (const a of [...index.capitulos.map((c) => c.archivo), index.finales]) {
  for (const e of leerJSON(`${capDir}/${a}`).escenas) {
    if (e.fondo) agregar(`fondos/${e.fondo}`, 'Fondos de escenas', e.id);
    if (e.astro) agregar(`astronauta/${e.astro}.png`, 'Astronauta', e.id, 'astronauta/base.png');
    if (e.zinnia) agregar(`zinnia/${e.zinnia}.gif`, 'Zinn-IA', e.id);
  }
}
agregar('fondos/inicio.png', 'Pantallas', 'pantalla de inicio');
agregar('fondos/cargando.png', 'Pantallas', 'tarjetas de capítulo sin fondo propio');
agregar('zinnia/apagada.png', 'Zinn-IA', 'batería en 0 (semilla) e indicador de carga');
agregar('zinnia/peligro.gif', 'Zinn-IA', 'cuando una barra está en rojo');
agregar('zinnia/inicio.gif', 'Zinn-IA', 'pantalla de inicio y celebración del final bueno');
agregar('zinnia/sin_conexion.gif', 'Zinn-IA', 'pantalla sin conexión');
for (const t of leerJSON('src/data/tutorial.json')) agregar(`zinnia/${t.zinnia}.gif`, 'Zinn-IA', `tutorial: ${t.id}`);
agregar('astronauta/base.png', 'Astronauta', 'todas las poses (con efectos CSS)');
agregar('logos/isotipo.png', 'Logos e interfaz', 'favicon y Zinn-IA de respaldo');
agregar('logos/titulo.png', 'Logos e interfaz', 'título de la pantalla de inicio');
agregar('logos/logotipo_zinnia_aurora.png', 'Logos e interfaz', 'Créditos y pantalla de carga');
agregar('ui/icono_zinnia.png', 'Logos e interfaz', 'ícono flotante del panel de Zinn-IA');
for (const c of leerJSON('src/data/capas.json')) agregar(`capas/${c.imagen}`, 'Capas del mapa (mismo encuadre y tamaño)', `capa ${c.etiqueta ?? c.nombre}`);
agregar('mapa_marte_mola.jpg', 'Mapa de Marte', 'pantalla Mapa de Marte (lon −180→180, lat 90→−90)');
const marte = leerJSON('src/data/marte.json');
for (const p of [...marte.aterrizajes, ...marte.destinos].filter((p) => p.imagen)) {
  agregar(p.imagen.replace(/^\/?img\//, ''), 'Mapa de Marte', `ficha de ${p.mision ?? p.nombre}`);
}

let listas = 0;
const grupos = [...new Set([...esperadas.values()].map((v) => v.grupo))];
let md = '# Imágenes pendientes — para Valeria\n\n';
md += 'Generado por `npm run assets` a partir del guion, los datos y el código. Vuelve a correrlo cuando subas imágenes.\n\n';
md += 'Cada imagen va en `Frontend/public/img/<ruta>`. Sirve cualquier extensión (.png, .gif, .jpg, .webp) con ese nombre: el juego la usa sola. Mientras falte, se ve un respaldo dibujado.\n';
md += 'Fondos 1920×1080; Zinn-IA y astronauta en pixel art con transparencia. ⚠️ = pesa más de 1,5 MB: comprimir en squoosh.app.\n';
const filas = {};
for (const [ruta, v] of [...esperadas].sort()) {
  const hay = encontrar(ruta);
  const alt = !hay && v.alternativa ? encontrar(v.alternativa) : null;
  const estado = hay ? `✅${hay.kb > LIMITE_KB ? ' ⚠️' : ''}` : alt ? '✅ (usa base)' : '⬜';
  if (hay || alt) listas++;
  const usos = [...v.usos];
  (filas[v.grupo] ??= []).push(`| ${estado} | \`${hay ? hay.ruta : ruta}\` | ${usos.slice(0, 8).join(', ')}${usos.length > 8 ? ` y ${usos.length - 8} más` : ''} |`);
}
md = md.replace('\n#', '\n#') + `\n**${listas} de ${esperadas.size} listas.**\n`;
for (const g of grupos) md += `\n## ${g}\n\n| Estado | Archivo | Dónde se usa |\n| --- | --- | --- |\n${filas[g].join('\n')}\n`;
fs.writeFileSync(path.join(raiz, 'tools/assets-pendientes.md'), md);

// ---------- 2. Mapa de imágenes copiadas desde Imagenes/ ----------
const COPIAS = [
  ['Isotipo_Oficial.png', 'logos/isotipo.png', 'favicon y respaldo de Zinn-IA'],
  ['LogotipoOficial.png', 'logos/logotipo_zinnia_aurora.png', 'Créditos y pantalla de carga'],
  ['NombrePaginaTitulo.png', 'logos/titulo.png', 'título de la pantalla de inicio'],
  ['FondoPantallaInicio.png', 'fondos/inicio.png', 'pantalla de inicio'],
  ['FondoPantallaInicioCargando.png', 'fondos/cargando.png', 'tarjetas de capítulo sin fondo propio'],
  ['PantallaEspacio(El traslado de la nave).png', 'fondos/bg_c02_nave.png', 'escenas de la nave (cap. 2)'],
  ['Fondo del espacio con marte (cuando la nave aterriza).png', 'fondos/bg_c02_llegada.png', 'c02_05 y tarjeta del cap. 3'],
  ['Gif Zinnia Cuerpo completo parpadeando.gif', 'zinnia/feliz.gif', 'expresión feliz'],
  ['Gif Zinnia cuerpo completo con efecto de onda.gif', 'zinnia/curiosa.gif', 'expresión curiosa'],
  [/terremoto/, 'zinnia/alerta.gif', 'expresión alerta'],
  ['Gig Zinnia cuerpo completo multicolor.gif', 'zinnia/peligro.gif', 'barra en rojo y tutorial de barra roja'],
  [/multiexpresi/, 'zinnia/inicio.gif', 'pantalla de inicio y celebración del final bueno'],
  [/estatica/, 'zinnia/sin_conexion.gif', 'pantalla sin conexión'],
  ['Zinnia cuerpo entero (Con tallo y nombre).png', 'zinnia/triste.png', 'expresión triste (con filtro) y cabecera de la Guía y Créditos'],
  ['Semilla de Zinnia con su cara.png', 'zinnia/apagada.png', 'batería en 0 e indicador de carga'],
  ['RostroZinnia Para boton desplegable.png', 'ui/icono_zinnia.png', 'ícono flotante del panel de Zinn-IA'],
  ['Usuario Astronauta (Prototipo).png', 'astronauta/base.png', 'todas las poses del astronauta'],
];
const originales = fs.existsSync(path.join(raiz, '../Imagenes')) ? fs.readdirSync(path.join(raiz, '../Imagenes')) : [];
let mapa = '# Mapa de imágenes\n\nGenerado por `npm run assets`. Las originales de `Imagenes/` no se mueven: se COPIAN a `public/img/`. ⚠️ = más de 1,5 MB (comprimir en squoosh.app).\n\n';
mapa += '| Original (Imagenes/) | En public/img/ | Dónde se usa | Peso |\n| --- | --- | --- | --- |\n';
for (const [orig, dest, uso] of COPIAS) {
  const nombre = typeof orig === 'string' ? orig : originales.find((f) => orig.test(f)) ?? String(orig);
  const f = path.join(img, dest);
  const kb = fs.existsSync(f) ? Math.round(fs.statSync(f).size / 1024) : null;
  mapa += `| ${nombre} | \`${dest}\` | ${uso} | ${kb == null ? 'falta copiar' : `${kb.toLocaleString('es')} KB${kb > LIMITE_KB ? ' ⚠️' : ''}`} |\n`;
}
fs.writeFileSync(path.join(raiz, 'tools/mapa-imagenes.md'), mapa);

console.log(`tools/assets-pendientes.md: ${listas}/${esperadas.size} imágenes listas.`);
console.log('tools/mapa-imagenes.md: generado.');
