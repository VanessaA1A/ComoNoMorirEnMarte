import { useEffect, useRef } from 'react';

const ENFOCABLES = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * ¿Al cerrar, el foco vuelve a donde estaba? Sí, salvo en plena escena: ahí Espacio y Enter avanzan el diálogo,
 * y si el foco volviera al botón que abrió la ventana (minimapa, ☰, 📖, 🌍, ícono de Zinn-IA), Espacio la
 * volvería a abrir y el jugador quedaría atrapado sin poder jugar. Si la ventana se abrió desde otra ventana
 * (p. ej. desde el menú), el foco sí vuelve a esa ventana.
 */
export function debeVolverFoco(previo) {
  if (!previo || previo === document.body) return false;
  return !(document.querySelector('.escena') && !previo.closest?.('[role="dialog"]'));
}

/** Atrapa el foco dentro del contenedor (Tab y Shift+Tab) y lo devuelve al cerrar (ver debeVolverFoco). */
export function useFocoAtrapado(activo = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!activo || !ref.current) return;
    const previo = document.activeElement;
    const volver = debeVolverFoco(previo);
    if (!volver) previo?.blur?.(); // el botón que abrió la ventana suelta el foco desde ya
    const nodo = ref.current;
    const lista = () => [...nodo.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
    (lista()[0] ?? nodo).focus();
    const alTab = (e) => {
      if (e.key !== 'Tab') return;
      const els = lista();
      if (!els.length) return;
      const [primero, ultimo] = [els[0], els.at(-1)];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    nodo.addEventListener('keydown', alTab);
    return () => { nodo.removeEventListener('keydown', alTab); if (volver && previo.isConnected) previo.focus?.(); };
  }, [activo]);
  return ref;
}


/** Ventana centrada sobre un velo oscuro. */
export function Modal({ titulo, onCerrar, children, ancho = false, className = '' }) {
  const ref = useFocoAtrapado();
  return (
    <div className="velo" onClick={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div ref={ref} className={`modal ${ancho ? 'ancho' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1}>
        {onCerrar && <button className="boton-icono cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>}
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Panel lateral desplegable. */
export function Cajon({ titulo, cabecera, onCerrar, children, className = '' }) {
  const ref = useFocoAtrapado();
  return (
    <aside ref={ref} className={`cajon ${className}`} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1}>
      <div className="cajon-cabecera">
        {cabecera}
        <h2>{titulo}</h2>
        <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar (Esc)">✕</button>
      </div>
      {children}
    </aside>
  );
}
