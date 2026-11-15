// Zinn-IA: el ÚNICO componente que la dibuja (escena, tutorial, panel, carita flotante, chat, semilla,
// guía, guardar/cargar, sin conexión, celular, carga de capítulo, inicio y finales).
// - Lista fija de expresiones (src/juego/expresiones.js). Una expresión desconocida usa normal.png.
// - Nunca muestra el logotipo: si una imagen no carga, se ve normal.png; si tampoco, solo el texto alternativo.
// - Fundido corto entre expresiones sin mover la posición: todas las capas están apiladas en la misma caja,
//   con normal.png siempre debajo (el cuerpo no se transparenta durante el cambio).
// - Parpadeo natural cada 3 a 6 s (unos 150 ms) cuando está en normal. Sin parpadeo ni fundido si el
//   sistema pide menos movimiento.
import { useEffect, useState } from 'react';
import { EXPRESIONES, expresionValida, rutaExpresion } from '../juego/expresiones.js';
import { useMenosMovimiento } from './Personajes.jsx';

const NOMBRE = {
  normal: 'tranquila', 'ojos-cerrados': 'con los ojos cerrados', seria: 'seria',
  asustada: 'asustada', enojada: 'enojada de broma', llorona: 'llorando',
};
const PARPADEO_MS = 150;

// Precarga: las 6 imágenes se piden y decodifican al iniciar el juego, así no parpadea al cambiar.
const precargadas = [];
export function precargarZinnia() {
  if (precargadas.length || typeof Image === 'undefined') return;
  for (const e of EXPRESIONES) {
    const img = new Image();
    img.decoding = 'async';
    img.src = rutaExpresion(e);
    img.decode?.().catch(() => {});
    precargadas.push(img); // referencia viva: el navegador no la descarta
  }
}

// Animaciones de cuerpo completo (inicio y tarjeta del capítulo 1). Con "menos movimiento", o si el archivo no
// carga, se ve Zinn-IA quieta (normal.png), nunca el logotipo.
const ANIMACIONES = { multiexpresion: '/img/zinnia_multiexpresion.webp', estatica: '/img/zinnia_estatica.gif' };
export function ZinniaAnimada({ animacion, className = '', alt = '' }) {
  const menos = useMenosMovimiento();
  const [fallo, setFallo] = useState(false);
  const src = ANIMACIONES[animacion];
  if (menos || fallo || !src) return <ZinniaAvatar className={className} parpadeo={false} alt={alt} />;
  return <img src={src} alt={alt} className={className} draggable={false} onError={() => setFallo(true)} />;
}

/**
 * @param expresion  una de EXPRESIONES (otra cosa → normal)
 * @param apagada    modo semilla (batería en 0): ojos cerrados y en gris
 * @param recorte    'cuerpo' (flor con tallo) o 'cara' (solo la flor, para íconos y cabeceras)
 * @param parpadeo   parpadeo natural (solo en normal)
 * @param alt        texto alternativo; '' = decorativa
 */
export default function ZinniaAvatar({ expresion = 'normal', apagada = false, recorte = 'cuerpo', parpadeo = true, alt, className = '' }) {
  const menos = useMenosMovimiento();
  const pedida = apagada ? 'ojos-cerrados' : expresionValida(expresion);
  const [parpadeando, setParpadeando] = useState(false);
  const [fallidas, setFallidas] = useState(() => new Set());

  useEffect(() => {
    if (!parpadeo || menos || apagada || pedida !== 'normal') return undefined;
    let espera; let cierre;
    const ciclo = () => {
      espera = setTimeout(() => {
        setParpadeando(true);
        cierre = setTimeout(() => { setParpadeando(false); ciclo(); }, PARPADEO_MS);
      }, 3000 + Math.random() * 3000);
    };
    ciclo();
    return () => { clearTimeout(espera); clearTimeout(cierre); setParpadeando(false); };
  }, [parpadeo, menos, apagada, pedida]);

  const quiere = parpadeando ? 'ojos-cerrados' : pedida;
  const visible = fallidas.has(quiere) ? 'normal' : quiere;
  const texto = alt ?? `Zinn-IA ${apagada ? 'apagada (modo semilla)' : NOMBRE[pedida]}`;
  const fallo = (e) => () => setFallidas((s) => (s.has(e) ? s : new Set(s).add(e)));

  return (
    <span
      className={`zinnia-avatar zinnia-avatar-${recorte === 'cara' ? 'cara' : 'cuerpo'} ${apagada ? 'zinnia-avatar-apagada' : ''} ${menos ? 'sin-fundido' : ''} ${className}`}
      data-expresion={visible} data-base={pedida}
      {...(texto ? { role: 'img', 'aria-label': texto } : { 'aria-hidden': true })}>
      {/* Base fija: normal.png siempre debajo */}
      <img src={rutaExpresion('normal')} alt="" className="capa base" draggable={false} onError={fallo('normal')} />
      {EXPRESIONES.filter((e) => e !== 'normal').map((e) => (
        <img key={e} src={rutaExpresion(e)} alt="" draggable={false} onError={fallo(e)}
          className={`capa capa-${e} ${visible === e ? 'visible' : ''}`} />
      ))}
    </span>
  );
}
