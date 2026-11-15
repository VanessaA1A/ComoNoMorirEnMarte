// Fondos y astronauta. Rutas (public/img/):
//   fondos/<archivo del guion>   astronauta/<pose> → sprite definitivo   logos/   ui/
// Zinn-IA está en ZinniaAvatar.jsx (public/zinnia/<expresion>.png).
// Cualquier extensión sirve (.png, .gif, .jpg, .webp): Recurso las prueba todas.
import { useEffect, useState } from 'react';
import Recurso, { variantes } from './Recurso.jsx';

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

// Mientras falte el fondo exacto de una escena se usa el más cercano de la misma zona de la historia
// (con la etiqueta "Fondo pendiente"), nunca un color sólido.
const SUPLENTE = {
  1: 'bg_c01_tierra.jpg', 2: 'bg_c02_nave.jpg', 3: 'bg_c03_base.jpg', 4: 'bg_c04_mirador.jpg', 5: 'bg_c05_transicion.jpg',
  6: 'bg_c05_transicion.jpg', 7: 'bg_c05_transicion.jpg', 8: 'bg_c05_transicion.jpg', 9: 'bg_c04_mirador.jpg', 10: 'bg_c03_base.jpg',
};

/**
 * Fondo de escena: el archivo del guion (en cualquier extensión), luego las "alternativas" y luego el
 * suplente del capítulo. Solo si no carga ninguno (p. ej. sin conexión) se dibuja el respaldo CSS.
 */
export function Fondo({ archivo, capitulo = 3, alternativas = [] }) {
  // key: al cambiar de escena se vuelve a empezar por el archivo exacto
  return <FondoImagen key={`${archivo}|${capitulo}|${alternativas.join()}`} archivo={archivo} capitulo={capitulo} alternativas={alternativas} />;
}

function FondoImagen({ archivo, capitulo, alternativas }) {
  const propios = archivo ? variantes(archivo) : [];
  const candidatos = [...new Set([...propios, ...[...alternativas, SUPLENTE[capitulo] ?? SUPLENTE[10]].flatMap(variantes)])];
  const [i, setI] = useState(0);
  const actual = candidatos[i];
  const pendiente = archivo && i >= propios.length && <span className="etiqueta-pendiente">Fondo pendiente: {archivo}</span>;
  if (!actual) {
    return <div className={`fondo-respaldo ${esViaje(capitulo) ? 'viaje' : 'marte'}`} aria-hidden="true">{pendiente}</div>;
  }
  return (
    <>
      <img src={`${IMG}/fondos/${actual}`} alt="" className="fondo" draggable={false} onError={() => setI((n) => n + 1)} />
      {pendiente}
    </>
  );
}

// Zinn-IA ya no se dibuja aquí: usa ZinniaAvatar.jsx (un solo componente, sin logotipo de respaldo).

// Sprites definitivos del astronauta. Si Valeria sube astronauta/<pose>.png, ese gana;
// si no, cada pose usa el sprite más cercano y se distingue con efectos CSS (temblor, brillo rojo).
const SPRITE_ASTRO = {
  neutral: 'frente', asustado: 'frente', herido: 'frente',
  caminando: 'espalda_derecha', muestra: 'espalda_izquierda', saludando: 'saludando',
};

export function Astronauta({ pose = 'neutral', className = '' }) {
  return (
    <div className={`astro-envoltura astro-${pose} ${className}`}>
      <Recurso src={[`${IMG}/astronauta/${pose}.png`, `${IMG}/astronauta/${SPRITE_ASTRO[pose] ?? 'frente'}.png`]}
        alt={`Astronauta (${pose})`} className="astro" escalaEntera />
      {pose === 'muestra' && (
        <svg className="astro-herramienta" viewBox="0 0 20 40" aria-hidden="true">
          <line x1="4" y1="2" x2="14" y2="34" stroke="#8b8fa8" strokeWidth="4" /><circle cx="14" cy="35" r="5" fill="#FA932E" />
        </svg>
      )}
    </div>
  );
}
