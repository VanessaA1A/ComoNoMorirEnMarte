// Fondos, Zinn-IA y astronauta, con respaldos dibujados mientras no existan las imágenes finales.
import Recurso from './Recurso.jsx';

const esViaje = (capitulo) => capitulo <= 2;

export function Fondo({ archivo, capitulo = 3 }) {
  const respaldo = (
    <div className={`fondo-respaldo ${esViaje(capitulo) ? 'viaje' : 'marte'}`} aria-hidden="true">
      {archivo && <span className="etiqueta-pendiente">Fondo pendiente: {archivo}</span>}
    </div>
  );
  return <Recurso src={archivo ? `/img/fondos/${archivo}` : null} className="fondo" respaldo={respaldo} />;
}

export const NOMBRE_EXPRESION = { feliz: 'feliz', curiosa: 'curiosa', alerta: 'alerta', triste: 'triste', apagada: 'apagada' };

export function ZinnIA({ expresion = 'feliz', className = '' }) {
  const alt = `Zinn-IA ${NOMBRE_EXPRESION[expresion] ?? ''}`;
  return (
    <Recurso
      src={`/img/personajes/zinnia_${expresion}.png`}
      alt={alt}
      className={`zinnia ${className}`}
      respaldo={<img src="/img/logo_zinnia.png" alt={alt} className={`zinnia zinnia-respaldo zinnia-${expresion} ${className}`} draggable={false} />}
    />
  );
}

/** Silueta original del astronauta: traje blanco, visor aurora e insignia azul-blanco-azul de Nicaragua. */
function AstronautaSVG({ pose }) {
  const herido = pose === 'herido';
  const asustado = pose === 'asustado';
  const muestra = pose === 'muestra';
  const caminando = pose === 'caminando';
  const traje = herido ? '#F3D6D2' : '#F4F6FF';
  const borde = '#2b1a3d';
  // brazos: [x1,y1,x2,y2]
  const brazoIzq = asustado ? 'M58 92 L34 58' : 'M58 92 L40 140';
  const brazoDer = muestra ? 'M122 92 L160 112' : asustado ? 'M122 92 L146 58' : 'M122 92 L140 140';
  return (
    <svg viewBox="0 0 180 280" className={`astro astro-${pose}`} role="img" aria-label={`Astronauta (${pose})`}>
      {/* mochila */}
      <rect x="62" y="70" width="56" height="70" rx="10" fill="#d9dbe8" stroke={borde} strokeWidth="3" />
      {/* piernas */}
      <path d={caminando ? 'M76 180 L66 250' : 'M76 180 L72 252'} stroke={traje} strokeWidth="22" strokeLinecap="round" />
      <path d={caminando ? 'M104 180 L116 248' : 'M104 180 L108 252'} stroke={traje} strokeWidth="22" strokeLinecap="round" />
      <path d={caminando ? 'M76 180 L66 250' : 'M76 180 L72 252'} stroke={borde} strokeWidth="2" fill="none" opacity=".4" />
      {/* cuerpo */}
      <rect x="54" y="80" width="72" height="104" rx="22" fill={traje} stroke={borde} strokeWidth="3" />
      {/* brazos */}
      <path d={brazoIzq} stroke={traje} strokeWidth="18" strokeLinecap="round" />
      <path d={brazoDer} stroke={traje} strokeWidth="18" strokeLinecap="round" />
      {muestra && <g><line x1="158" y1="110" x2="172" y2="146" stroke="#8b8fa8" strokeWidth="5" /><circle cx="172" cy="148" r="6" fill="#FA932E" /></g>}
      {/* insignia de Nicaragua: azul-blanco-azul */}
      <g transform="translate(70 104)">
        <rect width="26" height="6" fill="#0067C6" /><rect y="6" width="26" height="6" fill="#ffffff" /><rect y="12" width="26" height="6" fill="#0067C6" />
        <rect width="26" height="18" fill="none" stroke={borde} strokeWidth="1" />
      </g>
      {/* casco y visor */}
      <circle cx="90" cy="52" r="38" fill={traje} stroke={borde} strokeWidth="3" />
      <ellipse cx="94" cy="54" rx="26" ry="20" fill="#2082A6" stroke={borde} strokeWidth="2" />
      <ellipse cx="86" cy="46" rx="8" ry="5" fill="#ffffff" opacity=".55" />
      {herido && <g stroke="#DD2811" strokeWidth="3" fill="none"><path d="M64 120 l10 8 l-6 6 l10 8" /><path d="M110 150 l8 -6 l4 8" /></g>}
    </svg>
  );
}

export function Astronauta({ pose = 'neutral' }) {
  return (
    <Recurso
      src={`/img/personajes/astro_${pose}.png`}
      alt={`Astronauta (${pose})`}
      className={`astro astro-${pose}`}
      respaldo={<AstronautaSVG pose={pose} />}
    />
  );
}
