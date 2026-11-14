// Fondos, Zinn-IA y astronauta. Rutas (public/img/):
//   fondos/<archivo del guion>   zinnia/<expresion>   astronauta/<pose> → astronauta/base   logos/   ui/
// Cualquier extensión sirve (.png, .gif, .jpg, .webp). Si no hay imagen, se dibuja un respaldo.
import { useEffect, useState } from 'react';
import Recurso from './Recurso.jsx';

export const IMG = '/img';
const esViaje = (capitulo) => capitulo <= 2;

/** true si el sistema pide menos movimiento (prefers-reduced-motion). */
export function useMenosMovimiento() {
  const consulta = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [menos, setMenos] = useState(Boolean(consulta?.matches));
  useEffect(() => {
    if (!consulta) return;
    const f = (e) => setMenos(e.matches);
    consulta.addEventListener?.('change', f);
    return () => consulta.removeEventListener?.('change', f);
  }, []); // eslint-disable-line
  return menos;
}

/**
 * Fondo de escena. "alternativas" son fondos de reserva antes del degradado
 * (p. ej. la tarjeta de capítulo usa fondos/cargando cuando el capítulo no tiene fondo propio).
 */
export function Fondo({ archivo, capitulo = 3, alternativas = [] }) {
  const candidatos = [archivo, ...alternativas].filter(Boolean).map((a) => `${IMG}/fondos/${a}`);
  const respaldo = (
    <div className={`fondo-respaldo ${esViaje(capitulo) ? 'viaje' : 'marte'}`} aria-hidden="true">
      {archivo && <span className="etiqueta-pendiente">Fondo pendiente: {archivo}</span>}
    </div>
  );
  return <Recurso src={candidatos} className="fondo" respaldo={respaldo} />;
}

const NOMBRE = { feliz: 'feliz', curiosa: 'curiosa', alerta: 'en alerta', triste: 'triste', apagada: 'apagada (modo semilla)', peligro: 'en peligro', inicio: 'saludando' };

/**
 * Zinn-IA. Expresiones del guion: feliz, curiosa, alerta, triste; el motor usa "apagada" (batería 0).
 * La interfaz agrega "peligro" (barra en rojo) e "inicio" (pantalla de inicio y celebración).
 * Con prefers-reduced-motion se muestra estática (logos/isotipo).
 */
export function ZinnIA({ expresion = 'feliz', className = '' }) {
  const menos = useMenosMovimiento();
  const alt = `Zinn-IA ${NOMBRE[expresion] ?? ''}`;
  const respaldo = <img src={`${IMG}/logos/isotipo.png`} alt={alt} className={`zinnia zinnia-respaldo zinnia-${expresion} ${className}`} draggable={false} />;
  // triste.png es el cuerpo entero sin animación: se le aplica el filtro de tristeza
  const filtro = expresion === 'triste' ? 'zinnia-filtro-triste' : '';
  if (menos && expresion !== 'triste' && expresion !== 'apagada') return respaldo;
  return (
    <Recurso src={`${IMG}/zinnia/${expresion}.gif`} alt={alt} escalaEntera
      className={`zinnia zinnia-real ${filtro} ${className}`} respaldo={respaldo} />
  );
}

/** Silueta dibujada del astronauta (respaldo si no hay ninguna imagen). */
function AstronautaSVG({ pose }) {
  const herido = pose === 'herido';
  const asustado = pose === 'asustado';
  const muestra = pose === 'muestra';
  const caminando = pose === 'caminando';
  const traje = herido ? '#F3D6D2' : '#F4F6FF';
  const borde = '#2b1a3d';
  const brazoIzq = asustado ? 'M58 92 L34 58' : 'M58 92 L40 140';
  const brazoDer = muestra ? 'M122 92 L160 112' : asustado ? 'M122 92 L146 58' : 'M122 92 L140 140';
  return (
    <svg viewBox="0 0 180 280" className={`astro astro-${pose}`} role="img" aria-label={`Astronauta (${pose})`}>
      <rect x="62" y="70" width="56" height="70" rx="10" fill="#d9dbe8" stroke={borde} strokeWidth="3" />
      <path d={caminando ? 'M76 180 L66 250' : 'M76 180 L72 252'} stroke={traje} strokeWidth="22" strokeLinecap="round" />
      <path d={caminando ? 'M104 180 L116 248' : 'M104 180 L108 252'} stroke={traje} strokeWidth="22" strokeLinecap="round" />
      <rect x="54" y="80" width="72" height="104" rx="22" fill={traje} stroke={borde} strokeWidth="3" />
      <path d={brazoIzq} stroke={traje} strokeWidth="18" strokeLinecap="round" />
      <path d={brazoDer} stroke={traje} strokeWidth="18" strokeLinecap="round" />
      {muestra && <g><line x1="158" y1="110" x2="172" y2="146" stroke="#8b8fa8" strokeWidth="5" /><circle cx="172" cy="148" r="6" fill="#FA932E" /></g>}
      <g transform="translate(70 104)">
        <rect width="26" height="6" fill="#0067C6" /><rect y="6" width="26" height="6" fill="#ffffff" /><rect y="12" width="26" height="6" fill="#0067C6" />
        <rect width="26" height="18" fill="none" stroke={borde} strokeWidth="1" />
      </g>
      <circle cx="90" cy="52" r="38" fill={traje} stroke={borde} strokeWidth="3" />
      <ellipse cx="94" cy="54" rx="26" ry="20" fill="#2082A6" stroke={borde} strokeWidth="2" />
      <ellipse cx="86" cy="46" rx="8" ry="5" fill="#ffffff" opacity=".55" />
      {herido && <g stroke="#DD2811" strokeWidth="3" fill="none"><path d="M64 120 l10 8 l-6 6 l10 8" /><path d="M110 150 l8 -6 l4 8" /></g>}
    </svg>
  );
}

/** Astronauta: astronauta/<pose> y, si no existe, astronauta/base con efectos CSS por pose. */
export function Astronauta({ pose = 'neutral' }) {
  return (
    <div className={`astro-envoltura astro-${pose}`}>
      <Recurso src={[`${IMG}/astronauta/${pose}.png`, `${IMG}/astronauta/base.png`]} alt={`Astronauta (${pose})`}
        className="astro" escalaEntera respaldo={<AstronautaSVG pose={pose} />} />
      {pose === 'muestra' && (
        <svg className="astro-herramienta" viewBox="0 0 20 40" aria-hidden="true">
          <line x1="4" y1="2" x2="14" y2="34" stroke="#8b8fa8" strokeWidth="4" /><circle cx="14" cy="35" r="5" fill="#FA932E" />
        </svg>
      )}
    </div>
  );
}
