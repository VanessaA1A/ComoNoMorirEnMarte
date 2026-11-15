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

// Peso total: public/cartografia ≤ 25 MB (límite del proyecto)
const total = peso(dir) / 1e6;
ok(total <= 25, `peso total ${total.toFixed(2)} MB ≤ 25 MB`);

// Mosaicos de la ortofoto: todos los que anuncia tiles.json existen (niveles 4 y 5: solo los del corredor de la ruta)
const tiles = JSON.parse(fs.readFileSync(path.join(dir, 'ortofoto/tiles.json'), 'utf8'));
const lista = (n) => (n.solo_corredor ? (tiles.corredor_25cm?.mosaicos?.[n.nivel] ?? []).map((xy) => `${n.nivel}/${xy}.jpg`)
  : Array.from({ length: n.mosaicos_por_lado ** 2 }, (_, i) => `${n.nivel}/${Math.floor(i / n.mosaicos_por_lado)}/${i % n.mosaicos_por_lado}.jpg`));
const faltanMosaicos = tiles.niveles.flatMap(lista).filter((r) => !fs.existsSync(path.join(dir, 'ortofoto', r)));
ok(faltanMosaicos.length === 0, `ortofoto: todos los mosaicos de tiles.json existen${faltanMosaicos.length ? ` (faltan ${faltanMosaicos.length})` : ''}`);
ok(tiles.niveles.some((n) => n.nivel === 5 && n.m_por_px === 0.25) && (tiles.corredor_25cm?.mosaicos?.['5'] ?? []).length > 100, `corredor de la ruta a 25 cm/px (${tiles.corredor_25cm?.mosaicos?.['5']?.length ?? 0} mosaicos)`);
const r1 = JSON.parse(fs.readFileSync(path.join(dir, 'relieve_1m/relieve_1m.json'), 'utf8'));
ok(r1.m_por_px === 1 && r1.mosaicos.every((xy) => fs.existsSync(path.join(dir, 'relieve_1m', `${xy}.png`))) && r1.error_max_m <= r1.escala_m, `relieve de 1 m en el corredor: ${r1.mosaicos.length} mosaicos, error ≤ ${r1.escala_m} m`);
const malla = JSON.parse(fs.readFileSync(path.join(dir, 'relieve_malla.json'), 'utf8'));
ok(fs.statSync(path.join(dir, 'relieve_malla.bin')).size === malla.vertices[0] * malla.vertices[1] * 2, `malla 3D: ${malla.vertices.join(' × ')} alturas reales en 16 bits`);

// Ruta real del juego (Parte 2): todos los puntos, en la zona, con fuente; tramos a pie con pendiente < 15° (percentil 90)
const RUTA = JSON.parse(fs.readFileSync(path.join(raiz, 'src/data/ruta_real.json'), 'utf8'));
const L0 = relieveLim();
function relieveLim() { return JSON.parse(fs.readFileSync(path.join(dir, 'relieve.json'), 'utf8')).limites; }
const ids = RUTA.puntos.map((p) => p.id);
ok(['H', 'P1', 'P2', 'D1', 'P3', 'DEP', 'D2', 'P4', 'P5'].every((i) => ids.includes(i)), `ruta: están todos los puntos (${ids.join(', ')})`);
ok(RUTA.puntos.every((p) => p.lat <= L0.norte && p.lat >= L0.sur && p.lon >= 0 && p.lon < 360 && p.lon >= L0.oeste && p.lon <= L0.este), 'ruta: lat planetocéntrica y lon Este 0–360 dentro de la zona');
ok(RUTA.puntos.every((p) => p.fuentes?.length && p.fuentes.every(url) && p.terreno && p.criterio), 'ruta: cada punto tiene terreno, criterio y fuentes');
const POIS = JSON.parse(fs.readFileSync(path.join(raiz, 'src/data/pois.json'), 'utf8'));
// Las zonas Z_ de pois.json (tormenta, percloratos) son tarjetas de peligro, no paradas de la ruta
ok(POIS.filter((p) => !p.id.startsWith('Z_')).every((p) => ids.includes(p.id)), 'ruta: cada parada del guion (pois.json) tiene coordenadas reales');
// Orden de la historia: cada parada en su capítulo y en el orden del guion
const capDe = Object.fromEntries(RUTA.puntos.map((p) => [p.id, p.capitulos]));
ok(['H', 'P1', 'P2', 'D1', 'P3', 'P4', 'D2'].every((id, i, a) => !i || Math.min(...capDe[id]) >= Math.min(...capDe[a[i - 1]])) && capDe.D2.includes(9) && capDe.P5.includes(9) && capDe.REF?.includes(9),
  'orden de la historia: H(3) P1(4) P2(5) D1(6) P3(7) P4(8) D2(9) y desde D2 el refugio o P5');
ok(['P2', 'P3', 'P4'].every((id) => RUTA.puntos.find((p) => p.id === id)?.por_que_el_nombre && RUTA.puntos.find((p) => p.id === id).fuentes.some((u) => /curiosity-blog|jpl.nasa.gov/.test(u))), 'fichas P2, P3 y P4: nombre real y por qué se llaman así, con fuente de NASA/JPL');
for (const t of ['H-P1', 'P1-P2', 'P2-D1', 'D1-P3 (camino firme)', 'P3-DEP (desvío)', 'D2-H (regresar ya)', 'REF-H (regreso tras el refugio)']) {
  const x = RUTA.tramos[t];
  ok(x && x.pendiente_p90 < 15 && x.pendiente_max < 23 && x.perfil.length > 2, `tramo a pie ${t}: ${x?.largo_m} m, pendiente p90 ${x?.pendiente_p90}° (< 15°), máx ${x?.pendiente_max}° (< 23°), con perfil`);
}

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
