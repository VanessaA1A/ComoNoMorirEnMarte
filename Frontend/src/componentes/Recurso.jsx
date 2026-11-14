import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const EXTENSIONES = ['.png', '.gif', '.jpg', '.webp'];
const resultado = new Map(); // ruta pedida -> url que funcionó o null (no existe ninguna)

/** Para "fondos/bg.jpg" devuelve: fondos/bg.jpg, fondos/bg.png, fondos/bg.gif, fondos/bg.jpg, fondos/bg.webp (sin repetir). */
export function variantes(ruta) {
  const m = ruta.match(/^(.*?)(\.[a-z0-9]+)?$/i);
  const base = m[1];
  return [...new Set([ruta, ...EXTENSIONES.map((e) => base + e)])];
}

/**
 * Muestra una imagen probando varias rutas y extensiones; si ninguna existe, muestra el respaldo.
 * - src: una ruta o una lista de rutas candidatas (la primera que exista gana).
 * - escalaEntera: pixel art nítido (escala 2×, 3×... o 1/2, 1/3 según el espacio disponible).
 * Así, cuando Valeria sube una imagen con el nombre acordado (en .png, .jpg, .gif o .webp), se usa sola.
 */
export default function Recurso({ src, alt = '', respaldo, className = '', escalaEntera = false, style, ...resto }) {
  const candidatos = useMemo(() => [src].flat().filter(Boolean).flatMap(variantes), [JSON.stringify(src)]); // eslint-disable-line
  const clave = candidatos.join('|');
  const conocido = resultado.get(clave);
  const [indice, setIndice] = useState(0);
  const [tam, setTam] = useState(null);
  const ref = useRef(null);
  useEffect(() => { setIndice(0); setTam(null); }, [clave]);

  const url = conocido !== undefined ? conocido : candidatos[indice];

  // Escala entera para pixel art: el tamaño natural por un entero (o su inverso) que quepa en el contenedor.
  useLayoutEffect(() => {
    if (!escalaEntera) return;
    const img = ref.current;
    const caja = img?.parentElement;
    if (!img || !caja) return;
    const medir = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const W = caja.clientWidth, H = caja.clientHeight;
      if (!w || !h || !W || !H) return;
      const s = Math.min(W / w, H / h);
      const k = s >= 1 ? Math.floor(s) : 1 / Math.ceil(1 / s);
      setTam({ width: Math.round(w * k), height: Math.round(h * k) });
    };
    medir();
    img.addEventListener('load', medir);
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    obs?.observe(caja);
    return () => { img.removeEventListener('load', medir); obs?.disconnect(); };
  }, [escalaEntera, url]);

  if (!url) return respaldo ?? null;
  return (
    <img
      ref={ref}
      src={url}
      alt={alt}
      className={className}
      draggable={false}
      style={tam ? { ...style, width: tam.width, height: tam.height, objectFit: 'fill' } : style}
      onLoad={() => resultado.set(clave, url)}
      onError={() => {
        if (indice + 1 < candidatos.length && conocido === undefined) setIndice(indice + 1);
        else { resultado.set(clave, null); setIndice(candidatos.length); }
      }}
      {...resto}
    />
  );
}
