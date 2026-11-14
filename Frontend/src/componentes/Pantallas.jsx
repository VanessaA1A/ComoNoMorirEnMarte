// Créditos, Menú en juego, Guardar/Cargar e Historial.
import { useState } from 'react';
import { BARRAS, colorBarra } from '../engine/reglas.js';
import { CAPITULOS } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { RANURAS, leerRanura } from '../juego/partidas.js';
import { Modal } from './Modal.jsx';
import { ZinniaHablando } from './Personajes.jsx';
import { ETIQUETA } from './HUD.jsx';
import { Enlace } from './Mapas.jsx';

export function Creditos() {
  const j = useJuego();
  const fuentes = [...new Set([...CAPITULOS.flatMap((c) => c.fuentes ?? []), ...j.catalogo.datos.map((d) => d.fuente)])];
  return (
    <Modal titulo="Créditos y fuentes" onCerrar={() => j.setPantalla('inicio')} ancho>
      <p><strong>Equipo Zinnia Aurora:</strong> Vanessa, Valeria, Sefora, Ulisis, Kelly y Moises.</p>
      <p><strong>Tipografías:</strong> AMORIA de gunastudio (versión demo, solo para uso personal y no comercial) y FORCED SQUARE de Paul IJsendoorn (Drawperfect).</p>
      <p><strong>Imágenes:</strong> NASA/JPL-Caltech (y NASA/JPL-Caltech/MSSS en las fotos de Curiosity).</p>
      <p><strong>Zinn-IA:</strong> todos sus diálogos están escritos por el equipo; no usa IA generativa en vivo.</p>
      <h3>Fuentes científicas</h3>
      <ul className="fuente">{fuentes.map((f) => <li key={f}><Enlace url={f} /></li>)}</ul>
    </Modal>
  );
}

export function MenuJuego() {
  const j = useJuego();
  return (
    <Modal titulo="Menú" onCerrar={j.cerrarOverlay}>
      <p className="provisional">El juego está en pausa.</p>
      <div className="lista-botones">
        <button className="boton principal" onClick={j.cerrarOverlay}>Seguir jugando</button>
        <button className="boton" onClick={() => j.abrir('guardar')}>Guardar</button>
        <button className="boton" onClick={() => j.abrir('cargar')}>Cargar</button>
        <button className="boton" onClick={() => j.abrir('guia')}>Guía de supervivencia</button>
        <button className="boton" onClick={() => j.abrir('mapaRuta')} disabled={j.partida?.capitulo < 3}>Mapa de la ruta</button>
        <button className="boton" onClick={() => j.abrir('mapaMarte')}>Mapa de Marte</button>
        <button className="boton" onClick={() => j.abrir('historial')}>Historial</button>
        <button className="boton secundario" onClick={j.volverInicio}>Volver al inicio</button>
      </div>
    </Modal>
  );
}

const fechaCorta = (iso) => new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
const COLOR = { verde: 'var(--barra-verde)', amarillo: 'var(--barra-amarillo)', rojo: 'var(--barra-rojo)' };
/** Segundos de juego → "1 h 05 min", "12 min", "menos de 1 min". Partidas guardadas antes de medirlo no lo traen. */
function tiempoJugado(seg) {
  if (seg == null) return 'sin registro';
  const min = Math.floor(seg / 60);
  if (min < 1) return 'menos de 1 min';
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}

export function PanelGuardar({ modo }) {
  const j = useJuego();
  const [, refrescar] = useState(0);
  const [confirmar, setConfirmar] = useState(null);
  const guardando = modo === 'guardar';
  // Orden del panel: Ranura 1, 2, 3 y al final el Autoguardado (destacado). Guardar no usa el autoguardado.
  const manuales = RANURAS.filter((n) => n > 0);
  const ranuras = guardando ? manuales : [...manuales, 0];

  const accion = (n) => {
    const ocupada = leerRanura(n);
    if (guardando && ocupada && confirmar !== n) { setConfirmar(n); return; }
    if (guardando) { j.guardar(n); setConfirmar(null); refrescar((x) => x + 1); } else j.cargar(n);
  };

  const consejo = guardando
    ? 'Elige una de las 3 ranuras. Si ya tiene una partida, te pido confirmar antes de sobrescribirla.'
    : 'Elige una partida. Al cargarla vuelves a la misma línea, con las mismas barras y el mismo reloj.';

  return (
    <Modal titulo={guardando ? 'Guardar partida' : 'Cargar partida'} onCerrar={j.cerrarOverlay} className="panel-ranuras">
      <div className="ranuras-layout">
        <aside className="ranuras-guia">
          <div className="burbuja texto-ui">{consejo}</div>
          <ZinniaHablando />
        </aside>

        <div className="ranuras-lista">
          {ranuras.map((n) => {
            const r = leerRanura(n);
            const auto = n === 0;
            return (
              <article key={n} className={`ranura-tarjeta ${auto ? 'auto' : ''} ${r ? '' : 'vacia'}`} aria-label={auto ? 'Autoguardado' : `Ranura ${n}`}>
                <header>
                  <h3>{auto ? 'Autoguardado' : `Ranura ${n}`}</h3>
                  {auto && <span className="ranura-etiqueta">Se guarda solo</span>}
                </header>
                {r ? (
                  <div className="ranura-datos texto-ui">
                    <p className="ranura-capitulo">Capítulo {r.capitulo}{r.titulo ? ` · ${r.titulo}` : ''}{r.estado.nombre ? ` · ${r.estado.nombre}` : ''}</p>
                    <p>Tiempo de juego: {tiempoJugado(r.jugado)}</p>
                    <p>Reloj de la misión: {r.estado.minutos} min para el despegue</p>
                    <p>Guardado: {fechaCorta(r.fecha)}</p>
                    <div className="mini-barras" role="img"
                      aria-label={BARRAS.map((b) => `${ETIQUETA[b]} ${Math.round(r.estado[b])}`).join(', ')}>
                      {BARRAS.map((b) => (
                        <div key={b} className="mini-barra">
                          <span className="pista"><span style={{ width: `${Math.max(0, Math.min(100, r.estado[b]))}%`, background: COLOR[colorBarra(b, r.estado[b])] }} /></span>
                          <span className="nombre">{ETIQUETA[b]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="ranura-vacia texto-ui">Vacío</p>}
                <button className={`boton ${auto ? 'principal' : ''} ${confirmar === n ? 'peligro' : ''}`} disabled={!guardando && !r} onClick={() => accion(n)}>
                  {guardando ? (confirmar === n ? '¿Sobrescribir? Sí' : 'Guardar aquí') : 'Cargar'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
      <div className="ranuras-pie">
        <button className="boton" onClick={j.cerrarOverlay}>← Volver</button>
      </div>
    </Modal>
  );
}

export function Historial() {
  const j = useJuego();
  return (
    <Modal titulo="Historial" onCerrar={j.cerrarOverlay}>
      {j.historial.length === 0 && <p>Todavía no hay líneas leídas en esta sesión.</p>}
      <ol style={{ paddingLeft: '1.2em' }}>
        {j.historial.map((h, i) => <li key={i}><strong>{h.quien === 'Narración' ? '' : `${h.quien}: `}</strong>{h.texto}</li>)}
      </ol>
    </Modal>
  );
}
