// Fondos, Zinn-IA y astronauta, con respaldos mientras no existan las imágenes finales por pose/expresión.
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

/** Zinn-IA de cuerpo completo parpadeando: se usa cuando te habla en menús y tutoriales. */
export function ZinniaHablando({ className = '' }) {
  return <img src="/img/zinnia_parpadeando.gif" alt="Zinn-IA" className={`zinnia zinnia-hablando ${className}`} draggable={false} />;
}

export function Astronauta({ pose = 'neutral' }) {
  return (
    <Recurso
      src={`/img/personajes/astro_${pose}.png`}
      alt={`Astronauta (${pose})`}
      className={`astro astro-${pose}`}
      respaldo={<img src="/img/astronauta_prototipo.png" alt={`Astronauta (${pose})`} className={`astro astro-${pose}`} draggable={false} />}
    />
  );
}
