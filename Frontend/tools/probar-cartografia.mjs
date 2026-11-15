// Prueba de la cartografía real (public/cartografia/): archivos, fuentes, pesos y avisos de "sin datos".
// Uso: node tools/probar-cartografia.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(raiz, 'public/cartografia');
const leer = (r) => JSON.parse(fs.readFileSync(path.join(dir, r), 'utf8'));
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const url = (u) => typeof u === 'string' && /^https?:\/\/\S+$/.test(u);
const peso = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).reduce((s, f) => s + peso(path.join(p, f)), 0) : fs.statSync(p).size);

// Fuentes: cada archivo existe y trae producto, instrumento, resolución, fecha, cita y URL
const fuentes = leer('fuentes.json');
for (const a of fuentes.archivos) {
  const faltan = ['producto', 'instrumento', 'resolucion', 'fecha_producto', 'cita'].filter((k) => !a[k]);
  ok(fs.existsSync(path.join(dir, a.archivo)) && !faltan.length && url(a.url),
    `fuentes.json: ${a.archivo} existe y tiene fuente completa${faltan.length ? ` (falta: ${faltan.join(', ')})` : ''}`);
}
const enCarpeta = fs.readdirSync(dir).filter((f) => !['fuentes.json', 'capas_reales.json', 'relieve.json'].includes(f));
const sinFicha = enCarpeta.filter((f) => !fuentes.archivos.some((a) => a.archivo.replace(/\/$/, '') === f));
ok(sinFicha.length === 0, `todo archivo de public/cartografia está en fuentes.json${sinFicha.length ? ` (faltan: ${sinFicha.join(', ')})` : ''}`);

// Pesos (Parte 1: ~15 MB en total; ortofoto ≤ 25 MB)
const total = peso(dir) / 1e6;
ok(total <= 15, `peso total ${total.toFixed(2)} MB ≤ 15 MB`);
ok(peso(path.join(dir, 'ortofoto')) / 1e6 <= 25, 'ortofoto ≤ 25 MB');

// Mosaicos de la ortofoto: todos los que anuncia tiles.json existen
const tiles = JSON.parse(fs.readFileSync(path.join(dir, 'ortofoto/tiles.json'), 'utf8'));
const faltanMosaicos = tiles.niveles.flatMap((n) => Array.from({ length: n.mosaicos_por_lado ** 2 }, (_, i) => `${n.nivel}/${Math.floor(i / n.mosaicos_por_lado)}/${i % n.mosaicos_por_lado}.jpg`))
  .filter((r) => !fs.existsSync(path.join(dir, 'ortofoto', r)));
ok(faltanMosaicos.length === 0, `ortofoto: todos los mosaicos de tiles.json existen${faltanMosaicos.length ? ` (faltan ${faltanMosaicos.length})` : ''}`);

// Relieve: el desnivel cabe en 16 bits con la escala declarada
const relieve = leer('relieve.json');
ok(relieve.escala_m * 65535 >= relieve.altura_max_m - relieve.altura_min_m, `relieve.png: ${relieve.altura_max_m - relieve.altura_min_m} m caben en 16 bits con pasos de ${relieve.escala_m} m`);

// Capas: fuente en todas; lo que no tiene datos lo dice, sin dibujo
const capas = leer('capas_reales.json').capas;
ok(capas.every((c) => url(c.fuente)), 'capas_reales.json: todas las capas tienen fuente');
const sinDatos = capas.filter((c) => c.estado === 'sin_datos');
ok(sinDatos.every((c) => /^Sin datos de .+ a esta escala$/.test(c.texto) && c.archivos.length === 0), 'capas sin datos: texto "Sin datos de [instrumento] a esta escala" y ningún dibujo');
const geo = leer('geologia.json');
ok(/^[A-Za-z]+$/.test(geo.unidad.codigo) && capas.find((c) => c.id === 'geologia')?.texto?.includes(geo.unidad.codigo) && url(geo.nota_nasa.fuente),
  `geología: unidad real ${geo.unidad.codigo} (SIM 3292) y nota de NASA con fuente`);
const rad = leer('radiacion.json');
ok(rad.valores.every((v) => url(v.fuente) && v.cita), 'radiación: cada valor tiene cita y fuente');
ok(rad.reglas_del_juego.texto.startsWith('Regla del juego'), 'radiación: refugio y exposición marcados como "Regla del juego"');

// Ruta de Curiosity: fuente PLACES y perforaciones con su parte de misión
const ruta = leer('curiosity_ruta.geojson');
ok(url(ruta.fuente.url) && ruta.fuente.doi === '10.17189/1520397', 'curiosity_ruta.geojson: fuente PLACES con DOI');
const perf = ruta.features.filter((f) => f.properties.tipo === 'perforacion');
ok(perf.length > 0 && perf.every((f) => url(f.properties.fuente)), `perforaciones del boxwork con fuente (${perf.length})`);

if (fallos) { console.log(`\n${fallos} prueba(s) de cartografía fallaron`); process.exit(1); }
console.log(`\nCartografía: archivos, fuentes y pesos en orden (${total.toFixed(2)} MB)`);
