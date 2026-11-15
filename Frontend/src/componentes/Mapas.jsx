// Mapa de la ruta (tablet de Zinn-IA) y Mapa de Marte global, en SVG.
// Regla: solo se dibuja lo que tiene fuente real y coordenadas (latitud planetocéntrica, longitud Este 0–360°).
// Lo marcado "pendiente": true en los datos no se muestra al jugador. Mientras no haya cartografía real
// cargada, el fondo es neutro con el aviso "Cargando cartografía real".
import { useState } from 'react';
import { escena as escenaDe } from '../engine/motor.js';
import MARTE from '../data/marte.json';
import Recurso from './Recurso.jsx';
import { MapaCompleto, Minimapa } from './MapaReal.jsx';

// Parada donde está el jugador según el capítulo (si la escena no dice "poi").
// Capítulo 9: la alerta solar llega ya de regreso, en D2 (ruta_real.json); con el mirador alto, en P5.
const POI_POR_CAPITULO = { 3: 'H', 4: 'P1', 5: 'P2', 6: 'D1', 7: 'P3', 8: 'P4', 9: 'D2', 10: 'H' };
export function poiActual(partida) {
  if (!partida) return null;
  if (partida.capitulo === 9 && partida.flags?.mirador_alto) return 'P5';
  return escenaDe(partida.escena)?.poi ?? POI_POR_CAPITULO[partida.capitulo] ?? null;
}

/** Texto corto de una capa para botones y títulos ("geologia" no trae etiqueta: usa su nombre). */
export const etiquetaCapa = (c) => c?.etiqueta ?? c?.nombre ?? '';

/** Un punto, capa o ficha se muestra solo si tiene fuente y no está pendiente. */
export const visible = (x) => Boolean(x && !x.pendiente && x.fuente);

const COLOR_POI = { base: '#01EFAC', parada: '#0CD3B6', muestra: '#CAFF95', deposito: '#FA932E', peligro: '#DD2811' };


export function MapaRuta({ capa, setCapa, poi, seleccion = null, apagado = false, modo = 'completo', onAbrir }) {
  // Cartografía real (MapaReal.jsx): el minimapa es solo el mapa; la tablet del tutorial y el mapa completo tienen capas.
  if (modo === 'mini') return <Minimapa poi={poi} apagado={apagado} onAbrir={onAbrir} />;
  return <MapaCompleto capa={capa} setCapa={setCapa} poi={poi} seleccion={seleccion} apagado={apagado} compacto={modo === 'tablet'} />;
}

export function Enlace({ url }) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? <a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a> : <span>{url}</span>;
}

// ---------- Mapa de Marte ----------
// Longitud Este 0–360° → x del lienzo, con el meridiano 0° al centro (180–360° E se dibujan al oeste).
const xLon = (lonEste) => (((lonEste > 180 ? lonEste - 360 : lonEste) + 180) / 360) * 1000;
const yLat = (lat) => ((90 - lat) / 180) * 500;
const fmtLat = (lat) => `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
const fmtLon = (lon) => `${lon.toFixed(4)}° E`;

/** Todo lo que el Mapa de Marte dibuja (zonas del Gazetteer y aterrizajes): cada uno abre su ficha. */
export const ZONAS_MARTE = (MARTE.zonas ?? []).filter(visible);
export const ATERRIZAJES_MARTE = MARTE.aterrizajes.filter(visible);
/** Ficha de un lugar del Mapa de Marte por id (también la abre Zinn-IA con marcar_poi). */
export function lugarMarte(id) {
  const z = ZONAS_MARTE.find((x) => x.id === id); if (z) return { ...z, clase: 'zona' };
  const a = ATERRIZAJES_MARTE.find((x) => x.id === id); if (a) return { ...a, clase: 'aterrizaje' };
  const d = MARTE.destinos.find((x) => x.id === id && visible(x)); return d ? { ...d, clase: 'destino' } : null;
}
const fmtKm = (km) => `${Math.round(km).toLocaleString('es')} km`;
// Contorno suave: elipse dentro de los límites (mín./máx. de lat. y lon.) del Gazetteer; casquetes polares: banda hasta el polo.
// Sin límites en el Gazetteer: círculo con el centro y el diámetro ("extensión aproximada").
const KM_POR_GRADO = (2 * Math.PI * 3389.5) / 360;
function contorno(z) {
  if (z.limites) {
    const [s, n] = z.limites.lat; const [o, e] = z.limites.lon;
    const x0 = xLon(o); const x1 = o === -180 && e === 180 ? 1000 : xLon(e); const y0 = yLat(n); const y1 = yLat(s);
    if (o === -180 && e === 180) return { tipo: 'rect', x: 0, y: y0, width: 1000, height: y1 - y0, rx: 18 };
    return { tipo: 'ellipse', cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: Math.abs(x1 - x0) / 2, ry: (y1 - y0) / 2 };
  }
  const radioGrados = z.diametro_km / 2 / KM_POR_GRADO;
  return { tipo: 'ellipse', cx: xLon(z.lon), cy: yLat(z.lat), rx: (radioGrados / 360) * 1000, ry: (radioGrados / 180) * 500 };
}
// Etiquetas que se moverían bajo un pin: Chryse (Viking 1 y Pathfinder), Meridiani (Opportunity), Elysium (InSight y Curiosity), Gale.
const ETIQUETA = { chryse: { pos: 'arriba' }, meridiani: { pos: 'abajo' }, elysium: { dx: 24 }, gale: { pos: 'abajo' } };
const pulsar = (fn) => ({ onClick: fn, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn(); } } });

export function MapaMarte({ fichas, enMarte, onGale, seleccion = null }) {
  const [sel, setSel] = useState(() => (seleccion ? lugarMarte(seleccion) : null));
  const [verZonas, setVerZonas] = useState(true);
  const aterrizajes = ATERRIZAJES_MARTE;
  const destinos = MARTE.destinos.filter((d) => visible(d) && fichas.includes(d.ficha));
  const ALTO_PIN = 26; const ANCHO_PIN = (ALTO_PIN * 64) / 96; // public/img/ui/pin.png (64 × 96): la punta toca el punto
  const pin = (p, clase) => {
    const grande = p.jugable ? 1.4 : 1; const h = ALTO_PIN * grande; const w = ANCHO_PIN * grande;
    return (
      <g key={p.id} className={`pin${sel?.id === p.id ? ' elegido' : ''}`} transform={`translate(${xLon(p.lon)} ${yLat(p.lat)})`} tabIndex={0} role="button"
        data-lugar={p.id} aria-label={clase === 'aterrizaje' ? `${p.mision}, ${p.anio}` : p.nombre} {...pulsar(() => setSel({ ...p, clase }))}>
        <title>{clase === 'aterrizaje' ? `${p.mision} · ${p.anio}` : p.nombre}</title>
        <image href="/img/ui/pin.png" x={-w / 2} y={-h} width={w} height={h} />
      </g>
    );
  };
  const gale = aterrizajes.find((a) => a.jugable);
  return (
    <div className="mapa-marte">
      <div className="mapa-marte-barra">
        <button className="boton secundario" aria-pressed={verZonas} onClick={() => setVerZonas((v) => !v)}>{verZonas ? 'Ocultar zonas' : 'Mostrar zonas'}</button>
      </div>
      <svg viewBox="0 0 1000 500" role="img" aria-label="Mapa de Marte con zonas del Gazetteer y aterrizajes de coordenadas oficiales">
        {/* Mosaico global real: Viking MDIM 2.1 (NASA/USGS, vía Mars Trek); columna 0 = 180° O, longitud Este hacia la derecha */}
        <image href="/cartografia/globo_viking.jpg" width="1000" height="500" preserveAspectRatio="none" />
        {verZonas && ZONAS_MARTE.map((z) => {
          const { tipo, ...forma } = contorno(z);
          const Forma = tipo;
          const ly = tipo === 'rect' ? (z.lat > 0 ? forma.y + forma.height - 6 : forma.y + 16) : forma.cy + 4;
          return (
            <g key={z.id} className={`zona${sel?.id === z.id ? ' elegida' : ''}`} tabIndex={0} role="button" data-lugar={z.id} aria-label={`Zona: ${z.nombre}`}
              {...pulsar(() => setSel({ ...z, clase: 'zona' }))}>
              <title>{z.nombre}</title>
              <Forma {...forma} />
              <text x={tipo === 'rect' ? xLon(z.lon) : forma.cx + (ETIQUETA[z.id]?.dx ?? 0)} y={ETIQUETA[z.id]?.pos === 'arriba' ? forma.cy - forma.ry + 14 : ETIQUETA[z.id]?.pos === 'abajo' ? forma.cy + forma.ry + 13 : ly} textAnchor="middle">{z.nombre}</text>
            </g>
          );
        })}
        {aterrizajes.filter((a) => !a.jugable).map((a) => pin(a, 'aterrizaje'))}
        {destinos.map((d) => pin(d, 'destino'))}
        {gale && pin(gale, 'aterrizaje')}
        {gale && (
          <text x={xLon(gale.lon)} y={yLat(gale.lat) - ALTO_PIN * 1.4 - 6} textAnchor="middle" fontSize="15" fill="#CAFF95" stroke="#24073F" strokeWidth="4" paintOrder="stroke" pointerEvents="none">Aquí es tu misión</text>
        )}
      </svg>
      <p className="provisional">Pines: {aterrizajes.length} aterrizajes con coordenadas oficiales. Zonas: {ZONAS_MARTE.length} regiones del Gazetteer of Planetary Nomenclature (IAU/USGS); el contorno es aproximado, dentro de sus límites oficiales. Toca un pin o una zona para ver su ficha. Fondo: mosaico Viking MDIM 2.1 (NASA/USGS, Mars Trek). {enMarte ? '' : 'Ahora mismo vas de viaje hacia Marte.'}</p>
      {sel && (
        <div className="ficha-capa ficha-marte" data-ficha={sel.id}>
          <h3>{sel.clase === 'aterrizaje' ? `${sel.anio} · ${sel.mision}` : sel.nombre}</h3>
          {sel.clase === 'zona' && <p><strong>Qué es:</strong> {sel.tipo}{sel.nombre_oficial !== sel.nombre ? ` (nombre oficial: ${sel.nombre_oficial})` : ''}. {fmtLat(sel.lat)}, {fmtLon(sel.lon)}{sel.diametro_km ? ` · diámetro: ${fmtKm(sel.diametro_km)}` : ''}{sel.extension_aproximada ? ' · extensión aproximada' : ''}.</p>}
          {sel.clase === 'aterrizaje' && <p><strong>Qué es:</strong> {sel.que ?? 'Sitio de aterrizaje'} · {sel.lugar} · {fmtLat(sel.lat)}, {fmtLon(sel.lon)}</p>}
          {sel.clase === 'destino' && sel.lugar && <p>{sel.lugar} · {fmtLat(sel.lat)}, {fmtLon(sel.lon)}</p>}
          <p>{sel.dato}</p>
          {sel.clase === 'zona' && sel.origen_nombre && <p>Origen del nombre (Gazetteer): {sel.origen_nombre}</p>}
          <p className="fuente">Fuente: {sel.fuente_nombre ? `${sel.fuente_nombre} · ` : ''}<Enlace url={sel.fuente} />{sel.guia ? ` · Guía de supervivencia ${sel.guia}` : ''}</p>
          {sel.imagen && (
            <Recurso src={`/${sel.imagen.replace(/^\/+/, '')}`} alt={`Foto de Perseverance en ${sel.lugar ?? sel.nombre}`} className="foto-ficha"
              respaldo={null} />
          )}
          {sel.galeria && (
            <p><a className="boton secundario" href={sel.galeria} target="_blank" rel="noreferrer">Ver fotos de Perseverance ↗</a></p>
          )}
          {sel.jugable && <button className="boton principal" onClick={onGale}>Abrir el mapa de la ruta en Gale</button>}
        </div>
      )}
    </div>
  );
}
