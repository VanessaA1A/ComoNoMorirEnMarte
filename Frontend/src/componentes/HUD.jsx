import { BARRAS, colorBarra } from '../engine/reglas.js';
import { useJuego } from '../juego/JuegoContext.jsx';

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
  return (
    <div className="barra-superior">
      <div className="botones-juego">
        <button className="boton-icono" onClick={() => j.abrir('menu')} aria-label="Menú (Esc)" title="Menú (Esc)" data-tutorial="menu">☰</button>
        <button className="boton-icono" onClick={() => j.abrir('guia')} aria-label="Guía de supervivencia" title="Guía de supervivencia" data-tutorial="guia">📖</button>
        <button className="boton-icono" onClick={() => j.abrir('mapaMarte')} aria-label="Mapa de Marte" title="Mapa de Marte" data-tutorial="mapa-marte">🌍</button>
      </div>
      {p.hud && (
        <>
          <div className="hud" data-tutorial="hud"><Barras estado={p} /></div>
          <div className={`reloj ${p.minutos < 30 ? 'urgente' : ''}`} data-tutorial="reloj" title="Tiempo para el despegue del módulo de regreso">
            ⏱ {formatoReloj(p.minutos)}
          </div>
        </>
      )}
      {j.modoDemo && <span className="modo-demo">MODO DEMO</span>}
    </div>
  );
}
