// Mapas con cartografía REAL (Leaflet sobre un sistema métrico local; ver src/juego/cartografia.js):
// - MapaCompleto: zoom y desplazamiento, capas reales que se activan, ruta del juego, ruta real de Curiosity,
//   fichas de los puntos con sus fuentes y perfil de elevación al tocar un tramo.
// - Minimapa: SOLO el mapa (ortofoto de 25 cm, ~150 m alrededor del astronauta), ruta, puntos, norte y escala.
// Leaflet se carga solo en el navegador (import dinámico): en Node (pruebas de render) se dibuja el contenedor.
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import * as C from '../juego/cartografia.js';
import GEO from '../../public/cartografia/geologia.json';
import RAD from '../../public/cartografia/radiacion.json';
import SIM3292 from '../../public/cartografia/geologia_sim3292.geojson?raw';

let promesaLeaflet = null;
const cargarLeaflet = () => (promesaLeaflet ??= import('leaflet').then((m) => m.default ?? m));
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const host = (u) => String(u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

// Capas del mapa completo (las 6 del juego + pendiente y contexto CTX). "fuente" = id en capas_reales.json
export const CAPAS_MAPA = [
  { id: 'optica', corto: 'Óptica', nombre: 'Óptica: ortofoto HiRISE (25 cm en la ruta, 1 m en la zona)', fuente: 'optica' },
  { id: 'relieve', corto: 'Relieve', nombre: 'Relieve: sombreado y curvas cada 5 m (DEM HiRISE)', fuente: 'relieve' },
  { id: 'pendiente', corto: 'Pendiente', nombre: 'Pendiente: menos de 15°, 15–23° y más de 23° (umbrales de Curiosity)', fuente: 'relieve' },
  { id: 'termico', corto: 'Terreno', nombre: 'Terreno: THEMIS infrarrojo de noche', fuente: 'termico' },
  { id: 'contexto', corto: 'CTX', nombre: 'Contexto regional: CTX (15 × 15 km)', fuente: 'contexto' },
  { id: 'minerales', corto: 'Minerales', nombre: 'Minerales: CRISM', fuente: 'minerales' },
  { id: 'geologia', corto: 'Geología', nombre: 'Geología: mapa geológico de Marte (USGS SIM 3292)', fuente: 'geologia' },
  { id: 'radiacion', corto: 'Radiación', nombre: 'Radiación y clima: RAD y REMS (un punto) + regla del juego', fuente: 'radiacion' },
];
const COLOR_PUNTO = { base: '#01EFAC', parada: '#0CD3B6', muestra: '#CAFF95', deposito: '#FA932E', peligro: '#DD2811' };
const ESTILO_TRAMO = {
  principal: { color: '#01EFAC', weight: 4, opacity: 0.95 },
  alternativa: { color: '#FA932E', weight: 3, opacity: 0.95, dashArray: '8 6' },
  peligro: { color: '#DD2811', weight: 3, opacity: 0.95, dashArray: '4 6' },
};

// ---------------------------------------------------------------- capas base: ortofoto de la zona + corredor de 25 cm
function capasOrtofoto(L, { retina = false } = {}) {
  const Mosaicos = L.TileLayer.extend({
    getTileUrl(c) { return `${C.BASE}/ortofoto/${this._getZoomForUrl() + 3}/${c.x}/${c.y}.jpg`; },
    createTile(c, hecho) {
      const z = this._getZoomForUrl() + 3;
      if (!C.hayMosaico(z, c.x, c.y)) { const d = document.createElement('div'); setTimeout(() => hecho(null, d), 0); return d; }
      return L.TileLayer.prototype.createTile.call(this, c, hecho);
    },
  });
  const zona = new Mosaicos('', { tileSize: 256, minZoom: -5, maxZoom: 4, minNativeZoom: -3, maxNativeZoom: 0, noWrap: true, bounds: C.ZONA, className: 'mosaico-orto' });
  const corredor = new Mosaicos('', { tileSize: 256, minZoom: 0.5, maxZoom: 4, minNativeZoom: 1, maxNativeZoom: C.NIVEL_MAX - 3, noWrap: true, bounds: C.ZONA, detectRetina: retina, className: 'mosaico-orto' });
  return [zona, corredor];
}

/** Línea de créditos de la capa, estilo atribución de mapa. */
function atribucion(capa) {
  const c = C.CAPA_REAL[CAPAS_MAPA.find((x) => x.id === capa)?.fuente ?? capa];
  if (!c) return '';
  return `${esc(c.atribucion ?? c.instrumento)} · <a href="${esc(c.fuente)}" target="_blank" rel="noreferrer">${esc(host(c.fuente))}</a>`;
}

/** Ficha de una parada: lo que pasa en el juego + el terreno real con sus fuentes. */
function fichaHtml(p) {
  const fuentes = (p.fuentes ?? []).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noreferrer">[${i + 1}] ${esc(host(u))}</a>`).join(' ');
  return `<div class="ficha-punto"><strong>${esc(p.id)} · ${esc(p.nombre)}</strong>
    <p>${esc(p.nota ?? '')}</p>
    <p><em>En el terreno real:</em> ${esc(p.terreno)}</p>
    <p>${esc(C.fmtLat(p.lat))}, ${esc(C.fmtLon(p.lon))} · ${esc(p.elevacion_m)} m · pendiente ${esc(p.pendiente_grados)}°</p>
    ${p.ficcion ? `<p><em>${esc(p.ficcion)}</em></p>` : ''}
    <p class="fuente">Fuentes: ${fuentes}</p></div>`;
}

function capaGeologia(L) {
  const g = JSON.parse(SIM3292);
  const grupo = L.layerGroup();
  for (const f of g.features) {
    const polis = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poli of polis) {
      L.polygon(poli.map((anillo) => anillo.map(([lon, lat]) => C.aMapa(lat, lon))), { color: '#CAFF95', weight: 2, fillColor: '#613395', fillOpacity: 0.35 })
        .bindTooltip(`${f.properties.unidad}: ${f.properties.nombre_oficial}`).addTo(grupo);
    }
  }
  return grupo;
}

/** Capa activa: devuelve { grupo, leyenda, aviso, encuadre }. */
function construirCapa(L, id) {
  const grupo = L.layerGroup();
  const img = (archivo, opciones = {}) => L.imageOverlay(`${C.BASE}/${archivo}`, C.limitesArchivo(archivo), opciones).addTo(grupo);
  switch (id) {
    case 'relieve':
      img('sombreado.png', { opacity: 0.9 }); img('curvas.png');
      return { grupo, leyenda: 'Sombreado del relieve real; curvas cada 5 m (más marcadas cada 25 m).' };
    case 'pendiente':
      img('pendiente.png', { opacity: 0.85 });
      return { grupo, leyenda: '<span class="ley" style="background:#01EFAC"></span> menos de 15° · <span class="ley" style="background:#FAC82E"></span> 15–23° · <span class="ley" style="background:#DD2811"></span> más de 23°. Curiosity se desvió 150 m ante 23° para buscar menos de 15° (NASA/JPL, 2023).' };
    case 'termico':
      img('terreno_themis_region.png', { opacity: 0.8, className: 'pixelado' });
      return { grupo, leyenda: 'THEMIS IR de noche (~81 m por píxel): claro = se mantiene tibio (roca); oscuro = se enfría rápido (polvo o arena fina).', encuadre: C.limitesArchivo('terreno_themis_region.png') };
    case 'contexto':
      img('contexto_ctx.jpg', { opacity: 1 });
      return { grupo, leyenda: 'CTX (~10 m por píxel): 15 × 15 km alrededor de la zona. El recuadro es la zona del juego.', encuadre: C.limitesArchivo('contexto_ctx.jpg') };
    case 'minerales':
      return { grupo, aviso: C.CAPA_REAL.minerales?.texto ?? 'Sin datos de CRISM a esta escala' };
    case 'geologia':
      img('contexto_ctx.jpg', { opacity: 0.9 }); // contexto real (CTX) debajo de la unidad geológica
      capaGeologia(L).addTo(grupo);
      return { grupo, leyenda: `<span class="ley" style="background:#613395"></span> <strong>${esc(GEO.unidad.codigo)}</strong>: ${esc(GEO.unidad.nombre_oficial)} (Tanaka et al., 2014, USGS SIM 3292, 1:20.000.000). ${esc(GEO.nota_nasa.texto)}`, encuadre: C.limitesArchivo('contexto_ctx.jpg') };
    case 'radiacion': {
      img('radiacion_reglas.png', { opacity: 0.7 });
      const c = RAD.curiosity_en_la_zona;
      const valores = RAD.valores.map((v) => `${esc(v.magnitud)}: ${esc(v.valor)} ${esc(v.unidad)} <a href="${esc(v.fuente)}" target="_blank" rel="noreferrer">${esc(host(v.fuente))}</a>`).join('<br>');
      L.circleMarker(C.aMapa(c.lat, c.lon), { radius: 8, color: '#fff', weight: 2, fillColor: '#2082A6', fillOpacity: 1 })
        .bindPopup(`<div class="ficha-punto"><strong>Curiosity (${esc(c.lugar)})</strong><p>${esc(RAD.aviso)}</p><p>${valores}</p></div>`).addTo(grupo);
      return { grupo, leyenda: '<span class="ley" style="background:#2082A6"></span> refugio · <span class="ley" style="background:#FA932E"></span> exposición: REGLA DEL JUEGO sobre el relieve real (no es una medición). El punto azul es Curiosity con valores medidos por RAD y REMS.' };
    }
    default:
      return { grupo };
  }
}

function hook(contenedor, crear) {
  const ref = useRef(null);
  const [listo, setListo] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !contenedor.current) return undefined;
    let vivo = true;
    cargarLeaflet().then((L) => {
      if (!vivo || !contenedor.current) return;
      try { ref.current = crear(L, contenedor.current); setListo(L); } catch (e) { console.warn('[mapa]', e.message); }
    }).catch((e) => console.warn('[mapa] no se pudo cargar Leaflet:', e.message));
    return () => { vivo = false; ref.current?.map?.remove(); ref.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, listo];
}

function controlTexto(L, posicion, clase, html) {
  const Ctl = L.Control.extend({ onAdd() { const d = L.DomUtil.create('div', clase); d.innerHTML = html; L.DomEvent.disableClickPropagation(d); return d; } });
  return new Ctl({ position: posicion });
}

// ---------------------------------------------------------------- mapa completo
export function MapaCompleto({ capa = 'optica', setCapa, poi = null, seleccion = null, apagado = false, compacto = false }) {
  const contenedor = useRef(null);
  const [tramoSel, setTramoSel] = useState(null);
  const [verRuta, setVerRuta] = useState(true);
  const [verCuriosity, setVerCuriosity] = useState(true);
  const [ref, L] = hook(contenedor, (L, div) => {
    const map = L.map(div, { crs: L.CRS.Simple, minZoom: -5, maxZoom: 3, zoomSnap: 0.25, zoomDelta: 0.5, attributionControl: true, zoomControl: !compacto, maxBoundsViscosity: 0.8 });
    map.attributionControl.setPrefix('');
    capasOrtofoto(L, { retina: true }).forEach((c) => c.addTo(map));
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 120 }).addTo(map);
    controlTexto(L, 'topright', 'mapa-norte', '<span>N</span>▲').addTo(map);
    const esquinas = controlTexto(L, 'bottomright', 'mapa-coords', '').addTo(map);
    const pintarEsquinas = () => {
      const b = map.getBounds(); const no = C.aLatLon(b.getWest(), -b.getNorth()); const se = C.aLatLon(b.getEast(), -b.getSouth());
      esquinas.getContainer().textContent = `NO ${C.fmtLat(no.lat)}, ${C.fmtLon(no.lon)} · SE ${C.fmtLat(se.lat)}, ${C.fmtLon(se.lon)}`;
    };
    map.on('moveend zoomend', pintarEsquinas);
    // Ruta de Curiosity (PDS PLACES)
    const curiosity = L.layerGroup();
    fetch(`${C.BASE}/curiosity_ruta.geojson`).then((r) => r.json()).then((g) => {
      const zona = g.features[1]; const todo = g.features[0];
      L.polyline(todo.geometry.coordinates.map(([lon, lat]) => C.aMapa(lat, lon)), { color: '#FFE5C9', weight: 2, opacity: 0.6, dashArray: '2 6' }).addTo(curiosity);
      L.polyline(zona.geometry.coordinates.map(([lon, lat]) => C.aMapa(lat, lon)), { color: '#FFE5C9', weight: 2.5, opacity: 0.9 })
        .bindTooltip(`Ruta real de Curiosity (PDS PLACES, soles ${zona.properties.puntos[0].sol}–${zona.properties.puntos.at(-1).sol})`, { sticky: true }).addTo(curiosity);
      for (const f of g.features.filter((x) => x.properties.tipo === 'perforacion')) {
        const [lon, lat] = f.geometry.coordinates;
        L.circleMarker(C.aMapa(lat, lon), { radius: 4, color: '#FFE5C9', weight: 2, fill: false }).bindTooltip(`Perforación ${f.properties.nombre} (sol ${f.properties.sol})`).addTo(curiosity);
      }
    }).catch(() => {});
    // Ruta del juego
    const ruta = L.layerGroup();
    for (const t of C.TRAMOS) {
      L.polyline(t.puntos, ESTILO_TRAMO[C.tipoTramo(t.id)]).bindTooltip(`${t.id} · ${t.largo_m} m · toca para ver el perfil`, { sticky: true })
        .on('click', () => setTramoSel(t.id)).addTo(ruta);
    }
    const marcadores = {};
    for (const p of C.PARADAS) {
      marcadores[p.id] = L.circleMarker(C.aMapa(p.lat, p.lon), { radius: 7, color: '#24073F', weight: 2, fillColor: COLOR_PUNTO[p.tipo] ?? '#fff', fillOpacity: 1 })
        .bindTooltip(`${p.id} · ${p.nombre}`).bindPopup(fichaHtml(p), { maxWidth: 320 }).addTo(ruta);
    }
    // recuadro de la zona del juego (se ve al alejarse o con CTX/geología)
    L.rectangle(C.ZONA, { color: '#01EFAC', weight: 1, fill: false, dashArray: '4 4', interactive: false }).addTo(map);
    const aqui = poi && C.parada(poi);
    const jugador = aqui ? L.marker(C.aMapa(aqui.lat, aqui.lon), { icon: L.divIcon({ className: 'jugador-pulso', iconSize: [18, 18] }), interactive: false }) : null;
    const elegido = seleccion && C.parada(seleccion);
    if (elegido) map.setView(C.aMapa(elegido.lat, elegido.lon), 0.5); else if (aqui) map.setView(C.aMapa(aqui.lat, aqui.lon), compacto ? -1.5 : -0.5); else map.fitBounds(C.ZONA);
    if (elegido) setTimeout(() => { ruta.addTo(map); marcadores[elegido.id].openPopup(); }, 50);
    map.setMaxBounds(C.limitesArchivo('contexto_ctx.jpg'));
    pintarEsquinas();
    return { map, ruta, curiosity, jugador, capa: null, leyenda: null };
  });

  // capa activa (también la cambia el tutorial línea por línea)
  const capaVisible = apagado ? 'optica' : capa;
  useEffect(() => {
    const m = ref.current;
    if (!L || !m) return;
    m.capa?.grupo.remove(); m.leyenda?.remove();
    const nueva = construirCapa(L, capaVisible);
    nueva.grupo.addTo(m.map);
    m.capa = nueva;
    m.map.attributionControl._attributions = {};
    m.map.attributionControl.addAttribution(atribucion(capaVisible));
    if (nueva.leyenda || nueva.aviso) { m.leyenda = controlTexto(L, 'topleft', nueva.aviso ? 'mapa-aviso' : 'mapa-leyenda', nueva.leyenda ?? esc(nueva.aviso)).addTo(m.map); }
    if (nueva.encuadre && !compacto) m.map.fitBounds(nueva.encuadre);
  }, [L, capaVisible]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const m = ref.current; if (!L || !m) return; (verRuta && !apagado ? m.ruta.addTo(m.map) : m.ruta.remove()); m.jugador?.addTo(m.map); }, [L, verRuta, apagado]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const m = ref.current; if (!L || !m) return; (verCuriosity && !apagado ? m.curiosity.addTo(m.map) : m.curiosity.remove()); }, [L, verCuriosity, apagado]); // eslint-disable-line react-hooks/exhaustive-deps

  const tramo = tramoSel && C.TRAMOS.find((t) => t.id === tramoSel);
  return (
    <div className={`mapa-real ${compacto ? 'compacto' : ''} ${apagado ? 'apagado' : ''}`}>
      <div ref={contenedor} className="mapa-real-lienzo" role="application" aria-label={`Mapa real de la zona boxwork de Gale, capa ${CAPAS_MAPA.find((c) => c.id === capaVisible)?.nombre}`} />
      <div className="mapa-iconos" role="group" aria-label="Capas del mapa" data-tutorial="capas">
        {CAPAS_MAPA.map((c) => (
          <button key={c.id} title={c.nombre} aria-label={c.nombre} aria-pressed={c.id === capaVisible} disabled={apagado && c.id !== 'optica'} onClick={() => setCapa?.(c.id)}>{c.corto}</button>
        ))}
        <button title="Mostrar u ocultar la ruta del juego" aria-pressed={verRuta} onClick={() => setVerRuta(!verRuta)}>Ruta</button>
        <button title="Mostrar u ocultar la ruta real de Curiosity (PDS PLACES)" aria-pressed={verCuriosity} onClick={() => setVerCuriosity(!verCuriosity)}>Curiosity</button>
      </div>
      {apagado && <div className="mapa-sin-bateria">Sin batería: el mapa pierde sus capas</div>}
      {tramo && <Perfil tramo={tramo} onCerrar={() => setTramoSel(null)} />}
    </div>
  );
}

/** Perfil de elevación REAL de un tramo (DEM), con distancia y desnivel. */
export function Perfil({ tramo, onCerrar }) {
  const p = tramo.perfil ?? [];
  if (p.length < 2) return null;
  const dMax = p.at(-1)[0] || 1;
  const hs = p.map((x) => x[1]);
  const hMin = Math.min(...hs); const hMax = Math.max(...hs); const rango = Math.max(1, hMax - hMin);
  const W = 300; const H = 90;
  const d = p.map(([dist, h], i) => `${i ? 'L' : 'M'}${((dist / dMax) * W).toFixed(1)} ${(H - ((h - hMin) / rango) * H).toFixed(1)}`).join(' ');
  return (
    <div className="mapa-perfil" role="dialog" aria-label={`Perfil de elevación del tramo ${tramo.id}`}>
      <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar el perfil">✕</button>
      <strong>{tramo.id}</strong>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distancia contra altura">
        <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="rgba(1,239,172,.25)" /><path d={d} fill="none" stroke="#01EFAC" strokeWidth="2" />
      </svg>
      <p>{tramo.largo_m} m · de {hMin.toFixed(0)} a {hMax.toFixed(0)} m ({(hMax - hMin).toFixed(0)} m de desnivel) · pendiente media {tramo.pendiente_media}°, máxima {tramo.pendiente_max}°</p>
      <p className="fuente">Relieve: DEM 1 m de USGS (Parker y Calef, 2016)</p>
    </div>
  );
}

// ---------------------------------------------------------------- minimapa (solo el mapa)
const ZOOM_MINI = Math.log2(260 / 150); // ~150 m de lado en 260 px

function recorrido(poi) {
  const k = C.ORDEN.indexOf(poi === 'P5' ? 'P4' : poi === 'DEP' ? 'P3' : poi);
  const hechos = k > 0 ? C.ORDEN.slice(1, k + 1).map((id) => C.TRAMO_HASTA[id]) : [];
  return { hechos, actual: hechos.at(-1) ?? null };
}

export function Minimapa({ poi, apagado = false, onAbrir }) {
  const contenedor = useRef(null);
  const [ref, L] = hook(contenedor, (L, div) => {
    const map = L.map(div, { crs: L.CRS.Simple, zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0, minZoom: -2, maxZoom: 3, fadeAnimation: true });
    capasOrtofoto(L, { retina: true }).forEach((c) => c.addTo(map));
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 60 }).addTo(map);
    controlTexto(L, 'topright', 'mapa-norte mini', '<span>N</span>▲').addTo(map);
    const capaRuta = L.layerGroup().addTo(map);
    const jugador = L.marker([0, 0], { icon: L.divIcon({ className: 'jugador-pulso', iconSize: [14, 14] }), interactive: false });
    const p = C.parada(poi) ?? C.parada('H');
    map.setView(C.aMapa(p.lat, p.lon), ZOOM_MINI);
    return { map, capaRuta, jugador };
  });

  useEffect(() => {
    const m = ref.current;
    if (!L || !m) return;
    m.capaRuta.clearLayers();
    const p = C.parada(poi) ?? C.parada('H');
    if (!apagado) {
      const { hechos, actual } = recorrido(poi);
      for (const t of C.TRAMOS) {
        const tipo = C.tipoTramo(t.id);
        const estilo = t.id === actual ? { color: '#CAFF95', weight: 4, opacity: 1 }
          : hechos.includes(t.id) ? { color: '#01EFAC', weight: 3, opacity: 0.95 }
            : { ...ESTILO_TRAMO[tipo], weight: 2, opacity: 0.55 };
        L.polyline(t.puntos, { ...estilo, interactive: false }).addTo(m.capaRuta);
      }
      for (const q of C.PARADAS) {
        L.circleMarker(C.aMapa(q.lat, q.lon), { radius: 4, color: '#24073F', weight: 1.5, fillColor: COLOR_PUNTO[q.tipo] ?? '#fff', fillOpacity: 1 })
          .bindTooltip(q.nombre, { direction: 'top' }).addTo(m.capaRuta);
      }
      m.jugador.setLatLng(C.aMapa(p.lat, p.lon)).addTo(m.capaRuta);
    }
    m.map.flyTo(C.aMapa(p.lat, p.lon), ZOOM_MINI, { duration: 1.2 });
  }, [L, poi, apagado]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button className={`minimapa minimapa-real ${apagado ? 'apagado' : ''}`} onClick={onAbrir} data-tutorial="minimapa"
      aria-label={`Abrir el mapa de la ruta${poi ? `: estás en ${C.parada(poi)?.nombre ?? poi}` : ''}`}>
      <div ref={contenedor} className="minimapa-lienzo" aria-hidden="true" />
      {apagado && <span className="texto-apagado">Sin batería</span>}
    </button>
  );
}
