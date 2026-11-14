// Mapa de la ruta (tablet de Zinn-IA) y Mapa de Marte global, en SVG dibujado a mano.
// Si existen las imágenes reales (public/img/capas/capa_<id>.png, public/img/mapa_marte_mola.jpg)
// se dibujan debajo del esquema automáticamente.
import { useId, useState } from 'react';
import { escena as escenaDe } from '../engine/motor.js';
import MARTE from '../data/marte.json';

// Parada donde está el jugador según el capítulo (si la escena no dice "poi").
const POI_POR_CAPITULO = { 3: 'H', 4: 'P1', 5: 'P2', 6: 'D1', 7: 'P3', 8: 'P4', 9: 'P4', 10: 'H' };
export function poiActual(partida) {
  if (!partida) return null;
  return escenaDe(partida.escena)?.poi ?? POI_POR_CAPITULO[partida.capitulo] ?? null;
}

const COLOR_POI = { base: '#01EFAC', parada: '#0CD3B6', muestra: '#CAFF95', deposito: '#FA932E', peligro: '#DD2811' };

// Ruta segura y atajo (coordenadas del lienzo 1000×700, PROVISIONALES)
const RUTA_SEGURA = 'M130 580 L260 450 L390 380 L470 420 C 480 330, 560 270, 610 285 L660 330 L770 420 C 700 520, 450 600, 130 580';
const ATAJO = 'M470 420 Q 560 410 660 330';
const DESVIO_DEPOSITO = 'M660 330 L720 240';
const SUBIDA_P5 = 'M770 420 C 840 330, 880 220, 890 130';

// Red de crestas boxwork (celdas irregulares)
const CRESTAS = [
  'M560 220 L640 205 L700 230 L690 300 L620 310 L570 285 Z',
  'M700 230 L780 215 L840 260 L820 330 L750 335 L690 300 Z',
  'M620 310 L690 300 L750 335 L740 400 L670 410 L630 370 Z',
  'M750 335 L820 330 L860 390 L830 450 L790 455 L740 400 Z',
  'M570 285 L620 310 L630 370 L590 380 L555 340 Z',
  'M670 410 L740 400 L790 455 L730 480 L680 465 Z',
];

function Esquema({ capa, mini, apagado }) {
  const capaVisible = apagado ? 'optica' : capa;
  const u = useId().replace(/:/g, ''); // ids únicos: el minimapa y el mapa grande pueden estar a la vez
  const url = (n) => `url(#${n}${u})`;
  return (
    <g>
      <defs>
        <pattern id={`arena${u}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="#f2c27b" /><circle cx="7" cy="6" r="1" fill="#f2c27b" />
        </pattern>
        <pattern id={`peligro${u}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="rgba(221,40,17,.28)" />
        </pattern>
        <linearGradient id={`terreno${u}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8B3A1A" /><stop offset="1" stopColor="#C1440E" />
        </linearGradient>
      </defs>
      {/* Base esquemática (queda tapada si existe la imagen real) */}
      <rect width="1000" height="700" fill={url('terreno')} />
      {!apagado && <image href={`/img/capas/capa_${capaVisible}.png`} width="1000" height="700" preserveAspectRatio="none" />}

      {/* Pendiente hacia Mount Sharp / P5 */}
      {(capaVisible === 'relieve' ? [0, 1, 2, 3, 4, 5, 6] : [2, 4]).map((i) => (
        <ellipse key={i} cx="980" cy="40" rx={110 + i * 70} ry={80 + i * 55} fill="none"
          stroke={capaVisible === 'relieve' ? '#FFE5C9' : 'rgba(255,229,201,.25)'} strokeWidth={capaVisible === 'relieve' ? 2 : 1} />
      ))}
      {/* Hondonada arenosa */}
      <ellipse cx="560" cy="405" rx="70" ry="40" fill={capaVisible === 'termico' ? '#FA932E' : url('arena')} opacity={capaVisible === 'termico' ? 0.85 : 1} />
      {/* Red de crestas */}
      {CRESTAS.map((d, i) => (
        <path key={i} d={d} fill={capaVisible === 'minerales' ? 'rgba(12,211,182,.35)' : 'rgba(0,0,0,.08)'} stroke="#FFE5C9" strokeWidth={mini ? 3 : 4} strokeLinejoin="round" />
      ))}
      {/* Zonas de peligro */}
      <ellipse cx="560" cy="405" rx="74" ry="44" fill={url('peligro')} />
      <path d="M820 120 L960 60 L980 230 L860 260 Z" fill={url('peligro')} />

      {capaVisible === 'termico' && !mini && (
        <g fontSize="18" fill="#FFE5C9">
          <rect x="20" y="20" width="330" height="70" rx="8" fill="rgba(36,7,63,.8)" />
          <rect x="34" y="34" width="18" height="14" fill="#FA932E" /><text x="60" y="47">Arena suelta: baja inercia térmica</text>
          <rect x="34" y="60" width="18" height="14" fill="#2082A6" /><text x="60" y="73">Roca firme: alta inercia térmica</text>
        </g>
      )}
      {capaVisible === 'termico' && <rect width="1000" height="700" fill="rgba(32,130,166,.25)" style={{ mixBlendMode: 'multiply' }} />}

      {capaVisible === 'minerales' && (
        <g>
          <circle cx="390" cy="380" r="45" fill="rgba(202,255,149,.45)" stroke="#CAFF95" strokeWidth="2" />
          <circle cx="770" cy="420" r="40" fill="rgba(97,51,149,.65)" stroke="#CAFF95" strokeWidth="2" />
          {!mini && (
            <g fontSize="18" fill="#FFE5C9">
              <rect x="20" y="20" width="300" height="96" rx="8" fill="rgba(36,7,63,.8)" />
              <circle cx="42" cy="42" r="8" fill="#CAFF95" /><text x="60" y="48">Sulfatos (CRISM)</text>
              <circle cx="42" cy="68" r="8" fill="#0CD3B6" /><text x="60" y="74">Arcillas en las crestas</text>
              <circle cx="42" cy="94" r="8" fill="#613395" /><text x="60" y="100">Carbonatos en la hondonada</text>
            </g>
          )}
        </g>
      )}

      {capaVisible === 'radiacion' && (
        <g>
          <rect width="1000" height="700" fill="rgba(250,147,46,.12)" />
          {!mini && (
            <g fontSize="18" fill="#FFE5C9">
              <rect x="20" y="20" width="360" height="98" rx="8" fill="rgba(36,7,63,.85)" />
              <text x="34" y="48">Dosis de fondo: ~0,64 mSv/día (RAD)</text>
              <text x="34" y="74">De noche puede bajar a −100 °C (REMS)</text>
              <text x="34" y="100" fill="#FA932E">⚠ Eventos solares: difíciles de predecir</text>
              <circle cx="940" cy="640" r="30" fill="#FA932E" /><text x="770" y="690">Alerta solar</text>
            </g>
          )}
          <path d="M600 285 l-10 -26 l20 0 Z" fill="#01EFAC" />
          {!mini && <text x="520" y="250" fontSize="16" fill="#01EFAC">Refugio junto a la cresta</text>}
        </g>
      )}
    </g>
  );
}

export function MapaRuta({ capa, setCapa, capas, pois, poi, apagado = false, modo = 'completo', onAbrir }) {
  const mini = modo === 'mini';
  const [seleccion, setSeleccion] = useState(null);
  const infoCapa = capas.find((c) => c.id === capa) ?? capas[0];
  const aqui = pois.find((p) => p.id === poi);
  const poiSel = pois.find((p) => p.id === seleccion);

  const svg = (
    <svg viewBox="0 0 1000 700" role="img" aria-label={`Mapa de la ruta, capa ${infoCapa.etiqueta}${aqui ? `; estás en ${aqui.nombre}` : ''}`}>
      <Esquema capa={capa} mini={mini} apagado={apagado} />
      {/* Rutas */}
      <path d={RUTA_SEGURA} fill="none" stroke="#01EFAC" strokeWidth={mini ? 8 : 6} strokeLinejoin="round" />
      <path d={ATAJO} fill="none" stroke="#FA932E" strokeWidth={mini ? 7 : 5} strokeDasharray="14 10" />
      <path d={DESVIO_DEPOSITO} fill="none" stroke="#FA932E" strokeWidth="3" strokeDasharray="4 8" />
      <path d={SUBIDA_P5} fill="none" stroke="#DD2811" strokeWidth="3" strokeDasharray="4 8" />
      {/* Paradas */}
      {pois.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}
          tabIndex={mini ? undefined : 0} role={mini ? undefined : 'button'} aria-label={mini ? undefined : `${p.id}: ${p.nombre}`}
          onClick={mini ? undefined : () => setSeleccion(p.id)}
          onKeyDown={mini ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccion(p.id); } }}
          style={{ cursor: mini ? 'inherit' : 'pointer' }}>
          <circle r={mini ? 18 : 14} fill={COLOR_POI[p.tipo] ?? '#fff'} stroke="#24073F" strokeWidth="4" />
          {!mini && <text y="-20" textAnchor="middle" fontSize="18" fill="#fff" stroke="#24073F" strokeWidth="4" paintOrder="stroke">{p.id}</text>}
        </g>
      ))}
      {/* Aquí estás */}
      {aqui && (
        <g transform={`translate(${aqui.x} ${aqui.y})`} pointerEvents="none">
          <circle r="26" fill="none" stroke="#CAFF95" strokeWidth="5">
            <animate attributeName="r" values="22;34;22" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <text y="48" textAnchor="middle" fontSize={mini ? 34 : 20} fill="#CAFF95" stroke="#24073F" strokeWidth="5" paintOrder="stroke">Aquí estás</text>
        </g>
      )}
      {/* Barra de escala (provisional) */}
      {!mini && (
        <g transform="translate(30 660)" fontSize="16" fill="#fff">
          <rect x="-10" y="-30" width="210" height="44" rx="6" fill="rgba(36,7,63,.7)" />
          <line x1="0" y1="0" x2="143" y2="0" stroke="#fff" strokeWidth="4" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#fff" strokeWidth="3" /><line x1="143" y1="-8" x2="143" y2="8" stroke="#fff" strokeWidth="3" />
          <text x="150" y="6">500 m</text>
          <text x="0" y="-12" fontSize="12">escala provisional</text>
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
            {c.etiqueta}
          </button>
        ))}
      </div>
      {svg}
      {apagado && <p className="emergencia">Zinn-IA apagada: sin batería el mapa pierde sus capas.</p>}
      {poiSel ? (
        <div className="ficha-capa">
          <h3>{poiSel.id} · {poiSel.nombre}</h3>
          <p>{poiSel.nota}</p>
          <p><strong>Dato:</strong> {poiSel.dato} · <strong>Misión:</strong> {poiSel.mision}</p>
          <p className="fuente">Fuente: <Enlace url={poiSel.fuente} /></p>
          <button className="boton secundario" onClick={() => setSeleccion(null)}>Ver la capa</button>
        </div>
      ) : (
        <div className="ficha-capa">
          <h3>{infoCapa.etiqueta}: {infoCapa.nombre}</h3>
          {modo === 'completo' && <p>{infoCapa.descripcion}</p>}
          <p><strong>Misión:</strong> {infoCapa.mision} · <strong>Instrumento:</strong> {infoCapa.instrumento}</p>
          {modo === 'completo' && <p><strong>Limitación:</strong> {infoCapa.limitacion}</p>}
          <p className="fuente">Fuente: <Enlace url={infoCapa.fuente} /></p>
        </div>
      )}
      {modo === 'completo' && (
        <p className="provisional">Línea verde: ruta segura · punteada naranja: atajo por la arena · rojo: zonas de peligro. Mapa esquemático y posiciones provisionales hasta medirlas en JPL Mars Trek.</p>
      )}
    </div>
  );
}

export function Enlace({ url }) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? <a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a> : <span>{url}</span>;
}

// ---------- Mapa de Marte ----------
const xLon = (lon) => ((lon + 180) / 360) * 1000;
const yLat = (lat) => ((90 - lat) / 180) * 500;

export function MapaMarte({ fichas, enMarte, onGale }) {
  const [sel, setSel] = useState(null);
  const u = useId().replace(/:/g, '');
  const destinos = MARTE.destinos.filter((d) => fichas.includes(d.ficha));
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
  const gale = MARTE.aterrizajes.find((a) => a.jugable);
  return (
    <div className="mapa-marte">
      <svg viewBox="0 0 1000 500" role="img" aria-label="Mapa de Marte con aterrizajes reales y destinos">
        <defs>
          <linearGradient id={`hemisferios${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#524094" /><stop offset=".42" stopColor="#2082A6" />
            <stop offset=".55" stopColor="#C1440E" /><stop offset="1" stopColor="#8B3A1A" />
          </linearGradient>
        </defs>
        <rect width="1000" height="500" fill={`url(#hemisferios${u})`} />
        <image href="/img/mapa_marte_mola.jpg" width="1000" height="500" preserveAspectRatio="none" />
        {/* Respaldo estilizado: Tharsis, Valles Marineris, Hellas y Argyre */}
        <ellipse cx={xLon(-110)} cy={yLat(2)} rx="80" ry="70" fill="rgba(255,229,201,.35)" />
        <path d={`M${xLon(-95)} ${yLat(-6)} Q ${xLon(-70)} ${yLat(-12)} ${xLon(-40)} ${yLat(-10)}`} stroke="#421E0B" strokeWidth="5" fill="none" />
        <circle cx={xLon(70)} cy={yLat(-42)} r="45" fill="rgba(36,7,63,.5)" />
        <circle cx={xLon(-43)} cy={yLat(-50)} r="28" fill="rgba(36,7,63,.4)" />
        <text x="10" y="490" fontSize="14" fill="#fff">Mapa provisional · azul: tierras bajas del norte · rojo: tierras altas del sur</text>
        {MARTE.aterrizajes.map((a) => pin(a, 'aterrizaje'))}
        {destinos.map((d) => pin(d, 'destino'))}
        {enMarte && gale && (
          <text x={xLon(gale.lon)} y={yLat(gale.lat) + 34} textAnchor="middle" fontSize="15" fill="#CAFF95" stroke="#24073F" strokeWidth="4" paintOrder="stroke">Aquí estás</text>
        )}
      </svg>
      <p className="provisional">● Azul: aterrizajes reales · ● Dorado: destinos ({destinos.length}/{MARTE.destinos.length} desbloqueados con sus fichas). {enMarte ? '' : 'Ahora mismo vas de viaje hacia Marte.'}</p>
      {sel && (
        <div className="ficha-capa">
          <h3>{sel.tipo === 'aterrizaje' ? `${sel.anio} · ${sel.mision}` : sel.nombre}</h3>
          {sel.lugar && <p>{sel.lugar} · {Math.abs(sel.lat).toFixed(2)}° {sel.lat >= 0 ? 'N' : 'S'}, {Math.abs(sel.lon).toFixed(2)}° {sel.lon >= 0 ? 'E' : 'O'}{sel.aproximado ? ' (aproximado)' : ''}</p>}
          <p>{sel.dato}</p>
          {sel.jugable && <button className="boton principal" onClick={onGale}>Abrir el mapa de la ruta en Gale</button>}
        </div>
      )}
    </div>
  );
}
