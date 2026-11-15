// Íconos de línea propios (SVG), en el color del texto que los rodea. Sin emojis.
// Uso: <Icono nombre="guardar" />  ·  tamaño = 1em (se ajusta con font-size)
const TRAZOS = {
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  guia: <><path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z" /><path d="M12 6.5V20" /></>,
  marte: <><circle cx="12" cy="12" r="8.5" /><ellipse cx="12" cy="12" rx="3.8" ry="8.5" /><path d="M3.5 12h17" /></>,
  casa: <><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5.5h4V20" /></>,
  guardar: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3" /><rect x="8" y="13" width="8" height="5" rx="1" /></>,
  cargar: <><path d="M3 7.5V19a1 1 0 0 0 1 1h14.5l2.5-8H7.2L5 19" /><path d="M3 7.5V5a1 1 0 0 1 1-1h5l2 2.5h7a1 1 0 0 1 1 1V12" /></>,
  historial: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 3.5V8h4.5" /><path d="M12 7.5V12l3 2" /></>,
  ruta: <><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14" /><path d="M15 6v14" /></>,
  tresd: <><path d="M12 2.8 20 7v10l-8 4.2L4 17V7z" /><path d="M4 7l8 4.2L20 7" /><path d="M12 11.2V21" /></>,
  jugar: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  reloj: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5" /><path d="M9.5 2.8h5" /><path d="M12 2.8V6" /></>,
};

export default function Icono({ nombre, className = '', titulo }) {
  return (
    <svg className={`icono ${className}`} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...(titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true })}>
      {TRAZOS[nombre]}
    </svg>
  );
}