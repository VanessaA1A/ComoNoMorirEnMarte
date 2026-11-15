// Prueba: todo punto, capa o ficha que ve el jugador tiene "fuente"; lo que no la tiene va "pendiente": true.
// Coordenadas: latitud planetocéntrica y longitud Este 0–360°.
// Uso: node tools/probar-fuentes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => JSON.parse(fs.readFileSync(path.join(raiz, r), 'utf8'));
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

const tieneFuente = (x) => typeof x.fuente === 'string' && /^https?:\/\/\S+$/.test(x.fuente.trim());
const visibles = (lista) => lista.filter((x) => !x.pendiente);
const revisar = (nombre, lista, id = (x) => x.id) => {
  const sin = visibles(lista).filter((x) => !tieneFuente(x)).map(id);
  ok(sin.length === 0, `${nombre}: todo lo visible tiene "fuente" con URL${sin.length ? ` (faltan: ${sin.join(', ')})` : ''}`);
};

const capas = leer('src/data/capas.json');
const pois = leer('src/data/pois.json');
const marte = leer('src/data/marte.json');
const datos = leer('src/data/datos.json');

revisar('capas', capas);
revisar('paradas de la ruta (pois.json)', pois);
revisar('aterrizajes (marte.json)', marte.aterrizajes);
revisar('destinos (marte.json)', marte.destinos);
revisar('fichas (datos.json)', datos);

// Ficción del juego: nunca se muestra como dato real
const ficcionVisible = pois.filter((p) => p.ficcion && !p.pendiente).map((p) => p.id);
ok(ficcionVisible.length === 0, `los elementos de ficción quedan pendientes${ficcionVisible.length ? ` (visibles: ${ficcionVisible.join(', ')})` : ''}`);

// Coordenadas en latitud planetocéntrica + longitud Este 0–360°
const puntos = [...marte.aterrizajes, ...marte.destinos];
const fuera = puntos.filter((p) => !(p.lat >= -90 && p.lat <= 90 && p.lon >= 0 && p.lon < 360)).map((p) => p.id);
ok(fuera.length === 0, `marte.json: lat −90..90 y lon Este 0–360°${fuera.length ? ` (fuera: ${fuera.join(', ')})` : ''}`);
const aprox = puntos.filter((p) => p.aproximado && !p.pendiente).map((p) => p.id);
ok(aprox.length === 0, `marte.json: ningún punto "aproximado" visible${aprox.length ? ` (${aprox.join(', ')})` : ''}`);

// Correcciones de la Parte 0 (valores de la fuente oficial citada en cada punto)
const punto = (id) => marte.aterrizajes.find((a) => a.id === id);
ok(punto('viking2')?.lat === 47.64 && punto('viking2')?.lon === 134.29 && punto('viking2')?.fuente === 'https://nssdc.gsfc.nasa.gov/planetary/viking.html', 'Viking 2: 47.64 N, 134.29 E (NSSDC/NASA, planetocéntrico)');
ok(punto('perseverance')?.lat === 18.4447 && punto('perseverance')?.lon === 77.4508 && punto('perseverance')?.fuente?.includes('mars.nasa.gov'), 'Perseverance: 18.4447 N, 77.4508 E (NASA/JPL)');

// Mapa de Marte: ningún pin ni zona sin ficha (nombre, qué es, dato) y fuente con enlace
{
  const { ZONAS_MARTE, ATERRIZAJES_MARTE, lugarMarte } = await import('../src/componentes/Mapas.jsx').catch(() => ({}));
  const zonas = marte.zonas ?? [];
  revisar('zonas (marte.json)', zonas);
  const PEDIDAS = ['Tharsis Montes', 'Olympus Mons', 'Valles Marineris', 'Hellas Planitia', 'Argyre Planitia', 'Utopia Planitia', 'Elysium Planitia', 'Arabia Terra', 'Syrtis Major Planum', 'Isidis Planitia', 'Chryse Planitia', 'Acidalia Planitia', 'Meridiani Planum', 'Gale', 'Planum Boreum', 'Planum Australe'];
  const faltan = PEDIDAS.filter((n) => !zonas.some((z) => z.nombre_oficial === n));
  ok(faltan.length === 0, `las 16 zonas pedidas están${faltan.length ? ` (faltan: ${faltan.join(', ')})` : ''}`);
  const sinFichaZ = zonas.filter((z) => !(z.nombre && z.tipo && z.dato && z.fuente?.startsWith('https://planetarynames.wr.usgs.gov/Feature/') && Number.isFinite(z.lat) && Number.isFinite(z.lon) && (z.limites || (z.diametro_km > 0 && z.extension_aproximada)))).map((z) => z.id);
  ok(sinFichaZ.length === 0, `cada zona tiene ficha (nombre, qué es, dato, centro, extensión) y fuente del Gazetteer${sinFichaZ.length ? ` (sin ficha: ${sinFichaZ.join(', ')})` : ''}`);
  const MISIONES = ['viking1', 'viking2', 'pathfinder', 'spirit', 'opportunity', 'phoenix', 'curiosity', 'insight', 'perseverance', 'zhurong'];
  const visiblesA = visibles(marte.aterrizajes);
  ok(MISIONES.every((id) => visiblesA.some((a) => a.id === id)) && visiblesA.length === MISIONES.length, `los 10 aterrizajes pedidos tienen pin (${visiblesA.length})`);
  const sinFichaA = visiblesA.filter((a) => !(a.mision && a.anio && a.lugar && a.dato && a.que && tieneFuente(a))).map((a) => a.id);
  ok(sinFichaA.length === 0, `cada pin tiene ficha (misión, año, qué es, lugar, dato) y fuente${sinFichaA.length ? ` (sin ficha: ${sinFichaA.join(', ')})` : ''}`);
  ok(punto('curiosity')?.jugable && /Aquí es tu misión/.test(fs.readFileSync(path.join(raiz, 'src/componentes/Mapas.jsx'), 'utf8')), 'Curiosity (Gale) marcado "Aquí es tu misión"');
  // Globo 3D: los mismos aterrizajes, con la imagen del pin (no bolitas) y "Aquí es tu misión" en Curiosity
  const m3d = fs.readFileSync(path.join(raiz, 'src/componentes/Marte3D.jsx'), 'utf8');
  ok(/PIN = '\/img\/ui\/pin\.png'/.test(m3d) && /new THREE\.Sprite\(new THREE\.SpriteMaterial\(\{ map: texPin/.test(m3d) && !/SphereGeometry\(p ===/.test(m3d), 'globo 3D: un pin (pin.png) por aterrizaje, sin bolitas');
  ok(/Aquí es tu misión/.test(m3d) && /intersectObjects\(globo\.visible \? \[esfera, \.\.\.pines\]/.test(m3d), 'globo 3D: "Aquí es tu misión" en Curiosity y los pines del otro lado no se tocan a través de la esfera');
  // Conversión al lienzo de −180°…180° E (Olympus Mons a la izquierda) y contra el mosaico: Olympus, Hellas y Gale
  const xLon = (l) => (((l > 180 ? l - 360 : l) + 180) / 360) * 1000; const yLat = (l) => ((90 - l) / 180) * 500;
  const z = (id) => zonas.find((x) => x.id === id);
  ok(Math.abs(xLon(z('olympus').lon) - 128.3) < 1 && Math.abs(yLat(z('olympus').lat) - 198.2) < 1, 'Olympus Mons (226,2° E = 133,8° O) cae a la izquierda: x≈128, y≈198');
  ok(Math.abs(xLon(z('hellas').lon) - 695.8) < 1 && Math.abs(yLat(z('hellas').lat) - 367.9) < 1, 'Hellas (70,5° E, 42,4° S): x≈696, y≈368');
  ok(Math.abs(xLon(z('gale').lon) - 882.8) < 1 && Math.abs(yLat(z('gale').lat) - 264.9) < 1 && Math.abs(xLon(punto('curiosity').lon) - xLon(z('gale').lon)) < 2, 'Gale (137,8° E, 5,4° S): x≈883, y≈265, y el pin de Curiosity cae dentro');
  if (ZONAS_MARTE) {
    const todos = [...ZONAS_MARTE, ...ATERRIZAJES_MARTE];
    const sinLugar = todos.filter((x) => !lugarMarte(x.id)?.fuente).map((x) => x.id);
    ok(sinLugar.length === 0 && todos.length === 26, `el Mapa de Marte dibuja ${todos.length} lugares y cada uno abre su ficha con fuente${sinLugar.length ? ` (sin ficha: ${sinLugar.join(', ')})` : ''}`);
  }
}
ok(punto('curiosity')?.jugable && !punto('curiosity')?.pendiente && punto('curiosity')?.fuente?.includes('msl_places'), 'Curiosity (jugable) visible con fuente PLACES');

// Geología: desactivada hasta tener el SIM 3292
const geo = capas.find((c) => c.id === 'geologia');
ok(geo?.en_preparacion === 'Capa en preparación: datos del USGS (SIM 3292)', 'capa geología marcada "en preparación"');

// El mapa ya no dibuja terreno ni unidades inventadas
const mapas = fs.readFileSync(path.join(raiz, 'src/componentes/Mapas.jsx'), 'utf8');
const inventado = ['UNIDADES', 'CRESTAS', 'Unidades de roca', 'RUTA_SEGURA', 'Refugio junto a la cresta', 'escala provisional', '−100 °C'].filter((t) => mapas.includes(t));
ok(inventado.length === 0, `Mapas.jsx sin terreno ni datos inventados${inventado.length ? ` (quedan: ${inventado.join(', ')})` : ''}`);
ok(mapas.includes('Cargando cartografía real'), 'Mapas.jsx muestra "Cargando cartografía real" de fondo');

// Zinn-IA (backend) tampoco usa lo pendiente
const { IDS, ENTRADAS } = await import('../../Backend/src/zinnia/conocimiento.js');
const pendientes = [...pois, ...marte.aterrizajes, ...marte.destinos].filter((x) => x.pendiente).map((x) => x.id);
const filtrados = pendientes.filter((id) => IDS.pois.includes(id) || ENTRADAS.some((e) => e.id === `poi:${id}`));
ok(filtrados.length === 0, `Zinn-IA no conoce los ${pendientes.length} puntos pendientes${filtrados.length ? ` (los usa: ${filtrados.join(', ')})` : ''}`);
const sinFuenteIA = ENTRADAS.filter((e) => ['poi', 'lugar', 'aterrizaje', 'capa'].includes(e.tipo) && !e.fuente).map((e) => e.id);
ok(sinFuenteIA.length === 0, `Zinn-IA: lugares y capas con fuente${sinFuenteIA.length ? ` (faltan: ${sinFuenteIA.join(', ')})` : ''}`);

if (fallos) { console.log(`\n${fallos} prueba(s) de fuentes fallaron`); process.exit(1); }
console.log('\nFuentes: todo lo visible tiene fuente y coordenadas en el sistema correcto');
