import { BARRAS, colorBarra } from '../engine/reglas.js';
import { escena as escenaDe } from '../engine/motor.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from './Modal.jsx';
import Icono from './Iconostemp.jsx';

// "O2" sin subíndice: FORCED SQUARE no tiene el carácter ₂.
export const ETIQUETA = { oxigeno: 'O2', bateria: 'Batería', alimentacion: 'Comida', integridad: 'Traje', radiacion: 'Radiación' };

export function formatoReloj(min) {
  const signo = min < 0 ? '−' : '';
  const m = Math.abs(min);
  return `${signo}${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

export function Barras({ estado }) {
  return BARRAS.map((b) => {
    const v = estado[b];
    const color = colorBarra(b, v);
    return (
      <div key={b} className={`barra ${color}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}
        aria-label={`${ETIQUETA[b]}: ${v} (${color})`}>
        <div className="etiqueta"><span>{ETIQUETA[b]}</span><span>{v}</span></div>
        <div className="riel"><div className="relleno" style={{ width: `${v}%` }} /></div>
      </div>
    );
  });
}

export default function HUD() {
  const j = useJuego();
  const p = j.partida;
  // Canción del cap. 1 ("esperarGuia"): el libro parpadea suave hasta que se abre la Guía
  const esperaGuia = escenaDe(p.escena)?.accion === 'esperarGuia' && j.guiaAbiertaEn !== p.escena;
  const [salir, setSalir] = useState(false);
  // El aviso se dibuja en el escenario (no dentro de la barra) para que cubra toda la escena
  const escenario = typeof document !== 'undefined' ? document.querySelector('.escenario') : null;
  return (
    <div className="barra-superior">
      <div className="botones-juego">
        <button className="boton-icono" onClick={() => j.abrir('menu')} aria-label="Menú (Esc)" title="Menú (Esc)" data-tutorial="menu"><Icono nombre="menu" /></button>
        <button className={`boton-icono ${esperaGuia ? 'parpadeo-guia' : ''}`} onClick={() => j.abrir('guia')} aria-label="Guía de supervivencia" title="Guía de supervivencia" data-tutorial="guia"><Icono nombre="guia" /></button>
        <button className="boton-icono" onClick={() => j.abrir('mapaMarte')} aria-label="Mapa de Marte" title="Mapa de Marte" data-tutorial="mapa-marte"><Icono nombre="marte" /></button>
        <button className="boton-icono" onClick={() => setSalir(true)} aria-label="Volver al menú principal" title="Volver al menú principal"><Icono nombre="casa" /></button>
      </div>
      {salir && escenario && createPortal(
        <Modal titulo="¿Volver al menú principal?" onCerrar={() => setSalir(false)} className="modal-salir">
          <p className="texto-ui">Tu avance queda en el autoguardado. Desde el menú puedes seguir con <strong>Continuar</strong>.</p>
          <div className="lista-botones">
            <button className="boton principal" onClick={() => { setSalir(false); j.volverInicio(); }} autoFocus>Sí, ir al menú</button>
            <button className="boton" onClick={() => setSalir(false)}>Seguir jugando</button>
          </div>
        </Modal>,
        escenario,
      )}
      {p.hud && (
        <>
          <div className="hud" data-tutorial="hud"><Barras estado={p} /></div>
          <div className={`reloj ${p.minutos < 30 ? 'urgente' : ''}`} data-tutorial="reloj" title="Tiempo para el despegue del módulo de regreso">
            <Icono nombre="reloj" /> {formatoReloj(p.minutos)}
          </div>
        </>
      )}
      {j.modoDemo && <span className="modo-demo">MODO DEMO</span>}
    </div>
  );
}