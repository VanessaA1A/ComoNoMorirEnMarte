// Cartografía REAL de la zona boxwork de Gale (Frontend/public/cartografia/, preparada con tools/preparar-cartografia/).
// Coordenadas: latitud planetocéntrica y longitud Este 0–360° (esfera Mars 2000, R = 3.396.190 m).
// Sistema local del mapa: metros desde la esquina noroeste de la zona (x hacia el este, y hacia el sur).
// En Leaflet (CRS.Simple) un punto es [lat = −y, lng = x], así 1 unidad = 1 metro y el norte queda arriba.
import RUTA from '../data/ruta_real.json';
import POIS from '../data/pois.json';
import REL from '../../public/cartografia/relieve.json';
import TILES from '../../public/cartografia/ortofoto/tiles.json';
import CAPAS_REALES from '../../public/cartografia/capas_reales.json';
import FUENTES from '../../public/cartografia/fuentes.json';

export const BASE = '/cartografia';
export const R_M = 3396190;
export const LADO = REL.lado_m;
const rad = (g) => (g * Math.PI) / 180;
export const lon180 = (lon) => (lon > 180 ? lon - 360 : lon);
export const lon360 = (lon) => ((lon % 360) + 360) % 360;

/** lat/lon → metros locales { x, y } desde la esquina NO de la zona. */
export function aLocal(lat, lon) {
  return { x: R_M * rad(lon180(lon)) - REL.proyectado_m.x0, y: REL.proyectado_m.y1 - R_M * rad(lat) };
}
/** lat/lon → [lat, lng] de Leaflet CRS.Simple. */
export const aMapa = (lat, lon) => { const { x, y } = aLocal(lat, lon); return [-y, x]; };
/** Límites de Leaflet de un recuadro { norte, sur, oeste, este }. */
export const limitesMapa = (L) => [aMapa(L.sur, L.oeste), aMapa(L.norte, L.este)];
export const ZONA = limitesMapa(REL.limites);
export const fmtLat = (lat) => `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
export const fmtLon = (lon) => `${lon360(lon).toFixed(4)}° E`;
/** Metros locales → lat/lon (para las coordenadas de las esquinas). */
export function aLatLon(x, y) {
  return { lat: ((REL.proyectado_m.y1 - y) / R_M) * (180 / Math.PI), lon: lon360(((x + REL.proyectado_m.x0) / R_M) * (180 / Math.PI)) };
}

// ---------------------------------------------------------------- ortofoto en mosaicos
export const NIVELES = Object.fromEntries(TILES.niveles.map((n) => [n.nivel, n]));
const CORREDOR = Object.fromEntries(Object.entries(TILES.corredor_25cm?.mosaicos ?? {}).map(([n, l]) => [n, new Set(l)]));
/** ¿Existe el mosaico {nivel}/{x}/{y}? (niveles 0–3: zona completa; 4–5: solo el corredor de la ruta) */
export function hayMosaico(nivel, x, y) {
  const n = NIVELES[nivel];
  if (!n || x < 0 || y < 0 || x >= n.mosaicos_por_lado || y >= n.mosaicos_por_lado) return false;
  return n.solo_corredor ? Boolean(CORREDOR[nivel]?.has(`${x}/${y}`)) : true;
}
export const NIVEL_MAX = Math.max(...TILES.niveles.map((n) => n.nivel));

// ---------------------------------------------------------------- ruta del juego
const NOMBRE_EXTRA = {
  D2: { nombre: 'Alerta solar', tipo: 'parada', nota: 'Capítulo 9, ya de regreso: regresar ya, refugiarse junto a una cresta o subir al mirador alto.' },
  REF: { nombre: 'Refugio junto a la cresta', tipo: 'parada', nota: 'Capítulo 9: la pared de roca tapa una parte del cielo (regla del juego).' },
};
/** Paradas del juego: lo narrativo de pois.json + las coordenadas reales de ruta_real.json. */
export const PARADAS = RUTA.puntos.map((r) => ({ ...(POIS.find((p) => p.id === r.id) ?? NOMBRE_EXTRA[r.id] ?? { nombre: r.id }), ...r, pendiente: false }));
export const parada = (id) => PARADAS.find((p) => p.id === id) ?? null;
export const TRAMOS = Object.entries(RUTA.tramos).map(([id, t]) => ({ id, ...t, puntos: t.linea.map(([lon, lat]) => aMapa(lat, lon)) }));
/** Recorrido principal en orden (ida y regreso). Las alternativas se dibujan punteadas. */
// Orden de la historia: cap. 3 H · 4 P1 · 5 P2 · 6 D1 · 7 P3 (+ DEP) · 8 P3 → P4 · 9 D2 (+ refugio o P5) · 10 H
export const PRINCIPAL = ['H-P1', 'P1-P2', 'P2-D1', 'D1-P3 (camino firme)', 'P3-P4 (rodear la cresta)', 'P4-D2', 'D2-H (regresar ya)'];
const ARRIESGADOS = ['D1-P3 (atajo por la arena)', 'P3-P4 (bajar de frente)', 'D2-P5 (subir al mirador alto)'];
export const tipoTramo = (id) => (PRINCIPAL.includes(id) ? 'principal' : ARRIESGADOS.includes(id) ? 'peligro' : 'alternativa');
/** Orden de las paradas en la ida: sirve para saber qué parte de la ruta ya se recorrió. */
export const ORDEN = ['H', 'P1', 'P2', 'D1', 'P3', 'P4', 'D2'];
export const TRAMO_HASTA = { P1: 'H-P1', P2: 'P1-P2', D1: 'P2-D1', P3: 'D1-P3 (camino firme)', P4: 'P3-P4 (rodear la cresta)', D2: 'P4-D2' };
export const RUTA_REAL = RUTA;

// ---------------------------------------------------------------- capas y fuentes
export const CAPA_REAL = Object.fromEntries(CAPAS_REALES.capas.map((c) => [c.id, c]));
export const FUENTE_ARCHIVO = Object.fromEntries(FUENTES.archivos.map((a) => [a.archivo, a]));
export const limitesArchivo = (archivo) => (FUENTE_ARCHIVO[archivo]?.limites ? limitesMapa(FUENTE_ARCHIVO[archivo].limites) : ZONA);
