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

export function MapaMarte({ fichas, enMarte, onGale }) {
  const [sel, setSel] = useState(null);
  const aterrizajes = MARTE.aterrizajes.filter(visible);
  const destinos = MARTE.destinos.filter((d) => visible(d) && fichas.includes(d.ficha));
  const pin = (p, tipo) => {
    const elegir = () => setSel({ ...p, tipo });
    return (
      <g key={p.id} className="pin" transform={`translate(${xLon(p.lon)} ${yLat(p.lat)})`} tabIndex={0} role="button"
        aria-label={tipo === 'aterrizaje' ? `${p.mision}, ${p.anio}` : p.nombre}
        onClick={elegir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } }}>
        <circle r={p.jugable ? 11 : 8} fill={tipo === 'aterrizaje' ? '#2082A6' : '#FA932E'} stroke="#fff" strokeWidth="2" />
        {p.jugable && <circle r="17" fill="none" stroke="#01EFAC" strokeWidth="2" />}
      </g>
    );
  };
  const gale = aterrizajes.find((a) => a.jugable);
  return (
    <div className="mapa-marte">
      <svg viewBox="0 0 1000 500" role="img" aria-label="Mapa de Marte con aterrizajes de coordenadas oficiales">
        {/* Mosaico global real: Viking MDIM 2.1 (NASA/USGS, vía Mars Trek); columna 0 = 180° O, longitud Este hacia la derecha */}
        <image href="/cartografia/globo_viking.jpg" width="1000" height="500" preserveAspectRatio="none" />
        {aterrizajes.map((a) => pin(a, 'aterrizaje'))}
        {destinos.map((d) => pin(d, 'destino'))}
        {enMarte && gale && (
          <text x={xLon(gale.lon)} y={yLat(gale.lat) + 34} textAnchor="middle" fontSize="15" fill="#CAFF95" stroke="#24073F" strokeWidth="4" paintOrder="stroke">Aquí estás</text>
        )}
      </svg>
      <p className="provisional">● Azul: aterrizajes con coordenadas oficiales ({aterrizajes.length}). Fondo: mosaico Viking MDIM 2.1 (NASA/USGS, Mars Trek). Los demás lugares se agregan cuando tengan fuente. {enMarte ? '' : 'Ahora mismo vas de viaje hacia Marte.'}</p>
      {sel && (
        <div className="ficha-capa">
          <h3>{sel.tipo === 'aterrizaje' ? `${sel.anio} · ${sel.mision}` : sel.nombre}</h3>
          {sel.lugar && <p>{sel.lugar} · {fmtLat(sel.lat)}, {fmtLon(sel.lon)}</p>}
          <p>{sel.dato}</p>
          <p className="fuente">Fuente: {sel.fuente_nombre ? `${sel.fuente_nombre} · ` : ''}<Enlace url={sel.fuente} /></p>
          {sel.imagen && (
            <Recurso src={`/${sel.imagen.replace(/^\/+/, '')}`} alt={`Foto de Perseverance en ${sel.lugar ?? sel.nombre}`} className="foto-ficha"
              respaldo={<div className="foto-ficha foto-pendiente">Foto pendiente: {sel.imagen}</div>} />
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
