// Mapa de la ruta (tablet de Zinn-IA) y Mapa de Marte global, en SVG.
// Regla: solo se dibuja lo que tiene fuente real y coordenadas (latitud planetocéntrica, longitud Este 0–360°).
// Lo marcado "pendiente": true en los datos no se muestra al jugador. Mientras no haya cartografía real
// cargada, el fondo es neutro con el aviso "Cargando cartografía real".
import { useState } from 'react';
import { escena as escenaDe } from '../engine/motor.js';
import MARTE from '../data/marte.json';
import Recurso from './Recurso.jsx';

// Parada donde está el jugador según el capítulo (si la escena no dice "poi").
const POI_POR_CAPITULO = { 3: 'H', 4: 'P1', 5: 'P2', 6: 'D1', 7: 'P3', 8: 'P4', 9: 'P4', 10: 'H' };
export function poiActual(partida) {
  if (!partida) return null;
  return escenaDe(partida.escena)?.poi ?? POI_POR_CAPITULO[partida.capitulo] ?? null;
}

/** Texto corto de una capa para botones y títulos ("geologia" no trae etiqueta: usa su nombre). */
export const etiquetaCapa = (c) => c?.etiqueta ?? c?.nombre ?? '';

/** Un punto, capa o ficha se muestra solo si tiene fuente y no está pendiente. */
export const visible = (x) => Boolean(x && !x.pendiente && x.fuente);

const COLOR_POI = { base: '#01EFAC', parada: '#0CD3B6', muestra: '#CAFF95', deposito: '#FA932E', peligro: '#DD2811' };
const AVISO_CARGANDO = 'Cargando cartografía real';

function FondoNeutro({ ancho, alto, texto, mini }) {
  return (
    <g>
      <rect width={ancho} height={alto} fill="#2b2233" />
      <text x={ancho / 2} y={alto / 2} textAnchor="middle" dominantBaseline="middle" fontSize={mini ? 44 : 24} fill="#FFE5C9" opacity=".8">
        {texto}
      </text>
    </g>
  );
}

export function MapaRuta({ capa, setCapa, capas, pois, poi, apagado = false, modo = 'completo', onAbrir }) {
  const mini = modo === 'mini';
  const [seleccion, setSeleccion] = useState(null);
  const infoCapa = capas.find((c) => c.id === capa) ?? capas[0];
  const paradas = pois.filter(visible);
  const aqui = paradas.find((p) => p.id === poi);
  const poiSel = paradas.find((p) => p.id === seleccion);
  const aviso = (!apagado && infoCapa?.en_preparacion) || AVISO_CARGANDO;

  const svg = (
    <svg viewBox="0 0 1000 700" role="img" aria-label={`Mapa de la ruta, capa ${etiquetaCapa(infoCapa)}: ${aviso}`}>
      <FondoNeutro ancho={1000} alto={700} texto={aviso} mini={mini} />
      {/* Paradas con fuente y coordenadas reales (ninguna todavía) */}
      {paradas.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}
          tabIndex={mini ? undefined : 0} role={mini ? undefined : 'button'} aria-label={mini ? undefined : `${p.id}: ${p.nombre}`}
          onClick={mini ? undefined : () => setSeleccion(p.id)}
          onKeyDown={mini ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccion(p.id); } }}
          style={{ cursor: mini ? 'inherit' : 'pointer' }}>
          <circle r={mini ? 18 : 14} fill={COLOR_POI[p.tipo] ?? '#fff'} stroke="#24073F" strokeWidth="4" />
          {!mini && <text y="-20" textAnchor="middle" fontSize="18" fill="#fff" stroke="#24073F" strokeWidth="4" paintOrder="stroke">{p.id}</text>}
        </g>
      ))}
      {aqui && (
        <g transform={`translate(${aqui.x} ${aqui.y})`} pointerEvents="none">
          <circle r="26" fill="none" stroke="#CAFF95" strokeWidth="5">
            <animate attributeName="r" values="22;34;22" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <text y="48" textAnchor="middle" fontSize={mini ? 34 : 20} fill="#CAFF95" stroke="#24073F" strokeWidth="5" paintOrder="stroke">Aquí estás</text>
        </g>
      )}
    </svg>
  );

  if (mini) {
    return (
      <button className={`minimapa ${apagado ? 'apagado' : ''}`} onClick={onAbrir} data-tutorial="minimapa"
        aria-label="Abrir el mapa de la ruta">
        {svg}
        {apagado && <span className="texto-apagado">Zinn-IA apagada</span>}
      </button>
    );
  }

  return (
    <div className="mapa-ruta">
      <div className="botones-capa" role="group" aria-label="Capas del mapa" data-tutorial="capas">
        {capas.map((c) => (
          <button key={c.id} aria-pressed={c.id === capa} disabled={apagado && c.id !== 'optica'} onClick={() => { setCapa(c.id); setSeleccion(null); }}>
            {etiquetaCapa(c)}
          </button>
        ))}
      </div>
      {svg}
      {apagado && <p className="emergencia">Zinn-IA apagada: sin batería el mapa pierde sus capas.</p>}
      {poiSel ? (
        <div className="ficha-capa">
          <h3>{poiSel.id} · {poiSel.nombre}</h3>
          <p>{poiSel.nota}</p>
          {poiSel.dato && <p><strong>Dato:</strong> {poiSel.dato} · <strong>Misión:</strong> {poiSel.mision}</p>}
          <p className="fuente">Fuente: <Enlace url={poiSel.fuente} /></p>
          <button className="boton secundario" onClick={() => setSeleccion(null)}>Ver la capa</button>
        </div>
      ) : (
        <div className="ficha-capa">
          <h3>{infoCapa.etiqueta ? `${infoCapa.etiqueta}: ${infoCapa.nombre}` : infoCapa.nombre}</h3>
          {infoCapa.en_preparacion && <p><strong>{infoCapa.en_preparacion}</strong></p>}
          {modo === 'completo' && <p>{infoCapa.descripcion}</p>}
          <p><strong>Misión:</strong> {infoCapa.mision} · <strong>Instrumento:</strong> {infoCapa.instrumento}</p>
          {modo === 'completo' && <p><strong>Limitación:</strong> {infoCapa.limitacion}</p>}
          <p className="fuente">Fuente: <Enlace url={infoCapa.fuente} /></p>
        </div>
      )}
      {modo === 'completo' && (
        <p className="provisional">Las paradas y la ruta aparecerán cuando tengan coordenadas medidas en la cartografía real.</p>
      )}
    </div>
  );
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
        <FondoNeutro ancho={1000} alto={500} texto={AVISO_CARGANDO} />
        {aterrizajes.map((a) => pin(a, 'aterrizaje'))}
        {destinos.map((d) => pin(d, 'destino'))}
        {enMarte && gale && (
          <text x={xLon(gale.lon)} y={yLat(gale.lat) + 34} textAnchor="middle" fontSize="15" fill="#CAFF95" stroke="#24073F" strokeWidth="4" paintOrder="stroke">Aquí estás</text>
        )}
      </svg>
      <p className="provisional">● Azul: aterrizajes con coordenadas oficiales ({aterrizajes.length}). Los demás lugares se agregan cuando tengan fuente. {enMarte ? '' : 'Ahora mismo vas de viaje hacia Marte.'}</p>
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
