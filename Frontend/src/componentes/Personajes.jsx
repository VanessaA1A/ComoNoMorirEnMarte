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

// Mientras falte el fondo exacto de una escena se usa el fondo existente más parecido del MISMO lugar
// (nave, base, Marswalk o final) con un desenfoque suave. En pantalla nunca se escribe que falta:
// solo se avisa en la consola en modo desarrollo. Lista para ilustradores: docs/fondos_faltantes.md.
// Cuando llegue el arte, basta con copiarlo a public/img/fondos/ con el nombre esperado.
export const SUSTITUTO = {
  // Marswalk: hondonada, tormenta, crestas, depósito y bajada a los carbonatos → zona de transición
  bg_c06_hondonada: 'bg_c05_transicion.jpg', bg_c06_atasco: 'bg_c05_transicion.jpg', bg_tormenta_polvo: 'bg_c05_transicion.jpg',
  bg_c07_crestas: 'bg_c05_transicion.jpg', bg_c07_deposito: 'bg_c05_transicion.jpg',
  bg_c08_bajada: 'bg_c05_transicion.jpg', bg_c08_carbonatos: 'bg_c05_transicion.jpg',
  // Marswalk de regreso: alerta solar, refugio y mirador alto → mirador
  bg_c09_alerta: 'bg_c04_mirador.jpg', bg_c09_refugio: 'bg_c04_mirador.jpg', bg_c09_mirador_alto: 'bg_c04_mirador.jpg',
  // Base Aurora
  bg_c10_esclusa: 'bg_c03_base.jpg',
  // Finales: el despegue (bueno) y quedarse en Marte (intermedio) pasan en la base; el malo, en la caminata
  final_bueno: 'bg_c03_base.jpg', final_intermedio: 'bg_c03_base.jpg', final_malo: 'bg_c05_transicion.jpg',
};
const sinExtension = (archivo) => archivo.replace(/.[a-z0-9]+$/i, '');

// Fondos ilustrados que YA traen al astronauta dibujado (o, en el final bueno, va dentro del módulo que despega):
// en esas escenas no se dibuja el sprite encima, para que no salgan dos astronautas.
const CON_ASTRONAUTA = new Set(['bg_c09_alerta', 'bg_c09_refugio', 'final_bueno', 'final_intermedio', 'final_malo']);
export const fondoTraeAstronauta = (archivo) => Boolean(archivo) && CON_ASTRONAUTA.has(sinExtension(archivo));
// Color del suelo de esos fondos (mediana de la franja de abajo, fuera del astronauta): rellena detrás del globo de texto
const COLOR_SUELO = { bg_c09_alerta: '#923321', bg_c09_refugio: '#511f1e', final_bueno: '#8b6e80', final_intermedio: '#b05131', final_malo: '#6a3336' };

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
  const sustituto = archivo ? SUSTITUTO[sinExtension(archivo)] : null;
  const candidatos = [...new Set([...propios, ...[sustituto, ...alternativas, SUPLENTE[capitulo] ?? SUPLENTE[10]].filter(Boolean).flatMap(variantes)])];
  const [i, setI] = useState(0);
  const actual = candidatos[i];
  const prestado = Boolean(archivo) && i >= propios.length; // se ve un fondo de otra escena del mismo lugar
  useEffect(() => {
    // Solo en desarrollo: el jugador nunca ve un aviso de arte faltante
    if (prestado && import.meta.env?.DEV) console.info(`[fondos] falta ${archivo}; se muestra ${actual ?? 'el respaldo CSS'} (ver docs/fondos_faltantes.md)`);
  }, [prestado, archivo, actual]);
  if (!actual) {
    return <div className={`fondo-respaldo ${esViaje(capitulo) ? 'viaje' : 'marte'}`} aria-hidden="true" />;
  }
  // Fondo con el astronauta pintado abajo: el fondo sube lo que mide el cuadro de diálogo, para que el astronauta
  // quede encima del globo de texto y no detrás. Abajo, a los costados del globo, se ve el mismo fondo (sin huecos);
  // detrás del globo no, para que no se asome un segundo astronauta.
  const elevado = !prestado && fondoTraeAstronauta(archivo);
  const img = <img src={`${IMG}/fondos/${actual}`} alt="" className={`fondo${prestado ? ' fondo-prestado' : ''}${elevado ? ' fondo-costados' : ''}`} draggable={false} onError={() => setI((n) => n + 1)} />;
  if (elevado) {
    return (
      <>
        <div className="fondo fondo-relleno" style={{ backgroundColor: COLOR_SUELO[sinExtension(archivo)] }} aria-hidden="true" />
        {img}
        <img src={`${IMG}/fondos/${actual}`} alt="" className="fondo fondo-elevado" draggable={false} />
      </>
    );
  }
  return img;
}

// Zinn-IA ya no se dibuja aquí: usa ZinniaAvatar.jsx (un solo componente, sin logotipo de respaldo).

// Sprites definitivos del astronauta. Si Valeria sube astronauta/<pose>.png, ese gana;
// si no, cada pose usa el sprite más cercano y se distingue con efectos CSS (temblor, brillo rojo).
const SPRITE_ASTRO = {
  neutral: 'frente', asustado: 'frente', herido: 'frente',
  caminando: 'espalda_derecha', muestra: 'espalda_izquierda', saludando: 'saludando',
  espalda: 'espalda_izquierda', // cap. 1: de espaldas, mirando hacia la ventanilla (a la izquierda)
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
