// Fondos, Zinn-IA y astronauta, con respaldos mientras no existan las imágenes finales por pose/expresión.
import Recurso from './Recurso.jsx';

const esViaje = (capitulo) => capitulo <= 2;

const ZINNIA_RUTAS = {
  feliz: '/img/zinnia/feliz.gif',
  curiosa: '/img/zinnia/curiosa.gif',
  alerta: '/img/zinnia/alerta.gif',
  triste: '/img/zinnia/triste.png',
  apagada: '/img/zinnia/apagada.png',
  inicio: '/img/zinnia/inicio.gif',
  peligro: '/img/zinnia/peligro.gif',
};

const ASTRONAUTA_RUTAS = {
  neutral: '/img/astronauta/Astronauta de frente..png',
  saludando: '/img/astronauta/Astronauta de frente saludando.png',
  derecha: '/img/astronauta/Astronauta espalda derecha.png',
  izquierda: '/img/astronauta/Astronauta espalda izquierda.png',
  default: '/img/astronauta_prototipo.png',
};

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
  const alt = `Zinn-IA ${NOMBRE_EXPRESION[expresion] ?? expresion}`;
  const src = ZINNIA_RUTAS[expresion] ?? ZINNIA_RUTAS.feliz;
  return (
    <Recurso
      src={src}
      alt={alt}
      className={`zinnia ${className}`}
      respaldo={<img src="/img/logos/isotipo.png" alt={alt} className={`zinnia zinnia-respaldo zinnia-${expresion} ${className}`} draggable={false} />}
    />
  );
}

/** Zinn-IA de cuerpo completo parpadeando: se usa cuando te habla en menús y tutoriales. */
export function ZinniaHablando({ className = '' }) {
  return <img src="/img/zinnia_parpadeando.gif" alt="Zinn-IA" className={`zinnia zinnia-hablando ${className}`} draggable={false} />;
}

export function Astronauta({ pose = 'neutral' }) {
  const src = ASTRONAUTA_RUTAS[pose] ?? ASTRONAUTA_RUTAS.default;
  const alt = `Astronauta (${pose})`;
  return (
    <Recurso
      src={src}
      alt={alt}
      className={`astro astro-${pose}`}
      respaldo={<img src={ASTRONAUTA_RUTAS.default} alt={alt} className={`astro astro-${pose}`} draggable={false} />}
    />
  );
}
