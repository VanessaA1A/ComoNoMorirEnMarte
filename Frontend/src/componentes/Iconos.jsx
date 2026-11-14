// Íconos de la interfaz dibujados en SVG (sin emojis). Toman el color del texto (currentColor).
// Son decorativos: el botón que los contiene lleva su propio aria-label.
const base = { viewBox: '0 0 24 24', width: '1.2em', height: '1.2em', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };

export const IconoMenu = () => (
  <svg {...base}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
);

export const IconoLibro = () => (
  <svg {...base}><path d="M3 5.5C5 4.5 8.5 4.3 12 6c3.5-1.7 7-1.5 9-.5V19c-2-1-5.5-1.2-9 .5-3.5-1.7-7-1.5-9-.5Z" /><line x1="12" y1="6" x2="12" y2="19.5" /></svg>
);

export const IconoPlaneta = () => (
  <svg {...base}><circle cx="12" cy="12" r="7" /><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-20 12 12)" /></svg>
);

export const IconoReloj = () => (
  <svg {...base} width="1em" height="1em"><circle cx="12" cy="13" r="8" /><line x1="12" y1="13" x2="12" y2="9" /><line x1="12" y1="13" x2="15" y2="15" /><line x1="10" y1="2.5" x2="14" y2="2.5" /></svg>
);

export const IconoCerrar = () => (
  <svg {...base}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
);
