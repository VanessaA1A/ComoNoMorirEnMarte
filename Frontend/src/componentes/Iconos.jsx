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
  candado: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><path d="M12 14.5v2.5" /></>,
  capas: <><path d="M12 3 2.8 8 12 13l9.2-5z" /><path d="m2.8 12.5 9.2 5 9.2-5" /><path d="m2.8 16.5 9.2 5 9.2-5" /></>,
  cohete: <><path d="M12 2.5c3.5 2 5 6 5 10.5l-2.5 3h-5L7 13c0-4.5 1.5-8.5 5-10.5z" /><circle cx="12" cy="9.5" r="1.8" /><path d="M9.5 16.5 8 21l4-2 4 2-1.5-4.5" /></>,
  letras: <><path d="M4 19 8.5 6h1L14 19" /><path d="M5.6 14.5h6.8" /><path d="M16 11h3.5a2 2 0 0 1 0 4H16v-8h3a2 2 0 0 1 0 4" /></>,
  enlace: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></>,
  imprimir: <><path d="M7 8V3h10v5" /><rect x="3.5" y="8" width="17" height="8" rx="1.5" /><path d="M7 13.5h10V21H7z" /></>,
  ficha: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" /></>,
  estrella: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />,
  izquierda: <path d="M15 5l-7 7 7 7" />,
  derecha: <path d="M9 5l7 7-7 7" />,
  enviar: <><path d="M21 3 10.5 13.5" /><path d="M21 3 14.5 21l-4-7.5L3 9.5z" /></>,
  repetir: <><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" /><path d="M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" /><path d="M4 20v-4.5h4.5" /></>,
  pista: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  salir: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></>,
};

export default function Icono({ nombre, className = '', titulo }) {
  return (
    <svg className={`icono ${className}`} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...(titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true })}>
      {TRAZOS[nombre]}
    </svg>
  );
}