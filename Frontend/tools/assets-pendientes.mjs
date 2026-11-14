// Genera tools/assets-pendientes.md: TODAS las imágenes que el guion y el código esperan,
// dónde se usan y si ya existen en public/img/. Uso: node tools/assets-pendientes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leerJSON = (r) => JSON.parse(fs.readFileSync(path.join(raiz, r), 'utf8'));
const capDir = 'src/data/capitulos';
const index = leerJSON(`${capDir}/index.json`);
const archivos = [...index.capitulos.map((c) => c.archivo), index.finales];

const recursos = new Map(); // ruta -> { grupo, usos:Set }
const agregar = (ruta, grupo, uso) => {
  if (!recursos.has(ruta)) recursos.set(ruta, { grupo, usos: new Set() });
  recursos.get(ruta).usos.add(uso);
};

for (const c of index.capitulos) agregar(`fondos/${c.fondoTarjeta}`, 'Fondos', `tarjeta del cap. ${c.numero}`);
for (const a of archivos) {
  for (const e of leerJSON(`${capDir}/${a}`).escenas) {
    if (e.fondo) agregar(`fondos/${e.fondo}`, 'Fondos', e.id);
    if (e.astro) agregar(`personajes/astro_${e.astro}.png`, 'Astronauta', e.id);
    if (e.zinnia) agregar(`personajes/zinnia_${e.zinnia}.png`, 'Zinn-IA', e.id);
  }
}
// Las que pide el código (no salen del guion)
agregar('personajes/zinnia_apagada.png', 'Zinn-IA', 'batería en 0 (motor)');
for (const t of leerJSON('src/data/tutorial.json')) agregar(`personajes/zinnia_${t.zinnia}.png`, 'Zinn-IA', `tutorial: ${t.id}`);
for (const c of leerJSON('src/data/capas.json')) agregar(`capas/${c.imagen}`, 'Capas del mapa (mismo encuadre y tamaño)', `capa ${c.etiqueta}`);
agregar('mapa_marte_mola.jpg', 'Mapa de Marte', 'pantalla Mapa de Marte (proyección cilíndrica: lon −180→180, lat 90→−90)');
agregar('zinnia_sin_conexion.gif', 'Otros', 'pantalla sin conexión');
agregar('logo_zinnia.png', 'Otros', 'ícono de la página, Zinn-IA de respaldo, panel de Zinn-IA');
agregar('logo_nombre.png', 'Otros', 'pantalla de inicio');

const existe = (r) => fs.existsSync(path.join(raiz, 'public/img', r));
const grupos = [...new Set([...recursos.values()].map((v) => v.grupo))];
const total = recursos.size;
const listos = [...recursos.keys()].filter(existe).length;

let md = `# Imágenes pendientes — para Valeria\n\n`;
md += `Generado por \`node tools/assets-pendientes.mjs\` a partir del guion y del código (no a mano). Vuelve a correrlo cuando subas imágenes.\n\n`;
md += `**${listos} de ${total} listas.** Cada imagen va en \`Frontend/public/img/<ruta>\` con el nombre exacto: el juego la usa sola, sin cambiar código. Mientras falte, se ve un respaldo dibujado.\n\n`;
md += `Formato acordado: fondos 1920×1080 JPG (o pixel art 480×270); Zinn-IA y astronauta en PNG con transparencia (64×64 o 96×96, pixel art); nombres en minúsculas, sin espacios ni tildes. Crédito NASA/JPL-Caltech/MSSS en los fondos hechos sobre fotos de Curiosity.\n`;
for (const g of grupos) {
  md += `\n## ${g}\n\n| Estado | Archivo | Dónde se usa |\n| --- | --- | --- |\n`;
  for (const [ruta, v] of [...recursos].filter(([, v]) => v.grupo === g).sort()) {
    const usos = [...v.usos];
    md += `| ${existe(ruta) ? '✅' : '⬜'} | \`public/img/${ruta}\` | ${usos.slice(0, 8).join(', ')}${usos.length > 8 ? ` y ${usos.length - 8} más` : ''} |\n`;
  }
}
fs.writeFileSync(path.join(raiz, 'tools/assets-pendientes.md'), md);
console.log(`tools/assets-pendientes.md: ${listos}/${total} imágenes listas.`);
