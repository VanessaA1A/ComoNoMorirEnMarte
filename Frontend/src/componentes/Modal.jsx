import { useEffect, useRef } from 'react';
import { IconoCerrar } from './Iconos.jsx';

const ENFOCABLES = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Atrapa el foco dentro del contenedor (Tab y Shift+Tab) y lo devuelve al cerrar. */
export function useFocoAtrapado(activo = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!activo || !ref.current) return;
    const previo = document.activeElement;
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
    return () => { nodo.removeEventListener('keydown', alTab); previo?.focus?.(); };
  }, [activo]);
  return ref;
}

/** Ventana centrada sobre un velo oscuro. */
export function Modal({ titulo, onCerrar, children, ancho = false }) {
  const ref = useFocoAtrapado();
  return (
    <div className="velo" onClick={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div ref={ref} className={`modal ${ancho ? 'ancho' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1}>
        {onCerrar && <button className="boton-icono cerrar" onClick={onCerrar} aria-label="Cerrar"><IconoCerrar /></button>}
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
        <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar (Esc)"><IconoCerrar /></button>
      </div>
      {children}
    </aside>
  );
}
