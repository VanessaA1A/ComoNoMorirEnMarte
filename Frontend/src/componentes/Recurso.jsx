import { useEffect, useState } from 'react';

/**
 * Intenta cargar una imagen; si no existe (onError), muestra el respaldo.
 * Cuando Valeria suba la imagen con el nombre acordado, se usa sola: no hay que cambiar código.
 */
export default function Recurso({ src, alt = '', respaldo, className, ...resto }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [src]);
  if (!src || fallo) return respaldo ?? null;
  return <img src={src} alt={alt} className={className} onError={() => setFallo(true)} draggable={false} {...resto} />;
}
