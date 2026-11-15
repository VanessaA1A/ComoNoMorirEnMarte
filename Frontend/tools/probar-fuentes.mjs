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
ok(punto('viking2')?.lat === 47.6673 && punto('viking2')?.lon === 134.2809 && punto('viking2')?.fuente?.includes('nssdc.gsfc.nasa.gov'), 'Viking 2: 47.6673 N, 134.2809 E (NSSDC/NASA)');
ok(punto('perseverance')?.lat === 18.4446 && punto('perseverance')?.lon === 77.4509 && punto('perseverance')?.fuente?.includes('mars.nasa.gov'), 'Perseverance: 18.4446 N, 77.4509 E (NASA/JPL)');
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
