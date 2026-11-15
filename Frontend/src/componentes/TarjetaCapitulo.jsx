import { useEffect, useMemo } from 'react';
import { infoCapitulo } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import Recurso from './Recurso.jsx';

/** Pantalla de carga del capítulo: número + título sobre el fondo "cargando", Zinn-IA con efecto de onda
 *  y un dato de pantalla de carga (uso C). Se cierra sola a los 2,5 s o con clic. */
export default function TarjetaCapitulo({ numero }) {
  const j = useJuego();
  const info = infoCapitulo(numero);
  const dato = useMemo(() => {
    const deCarga = j.catalogo.datos.filter((d) => /C/.test(d.uso));
    return deCarga[Math.floor(Math.random() * deCarga.length)];
  }, [numero]); // eslint-disable-line react-hooks/exhaustive-deps

  // El tutorial espera a que se cierre la tarjeta (no al revés)
  const enEspera = j.panelZinnia || j.overlay;
  useEffect(() => {
    if (enEspera) return;
    const t = setTimeout(j.cerrarTarjeta, 2500);
    return () => clearTimeout(t);
  }, [enEspera, j.cerrarTarjeta]);

  return (
    <div className="tarjeta-capitulo" onClick={j.cerrarTarjeta} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); j.cerrarTarjeta(); } }}
      aria-label={`Capítulo ${numero}: ${info.titulo}. Pulsa para continuar.`}>
      <img src="/img/fondos/cargando.png" alt="" className="fondo" draggable={false} />
      <div className="contenido">
        <div className="numero">CAPÍTULO {numero} DE 10</div>
        <h1 className="titulo-capitulo">{info.titulo}</h1>
        {dato && <p className="dato-carga">¿Sabías que...? {dato.texto}</p>}
      </div>
      <div className="carga-pie" aria-hidden="true">
        <div className="carga-zinnia">
          <img src="/img/zinnia/onda.gif" alt="" className="zinnia-onda" draggable={false} />
          <span>{numero === 1 ? 'Te damos la bienvenida a bordo · Cargando…' : 'Cargando…'}</span>
        </div>
        <Recurso src="/img/logos/logotipo_zinnia_aurora.png" alt="" className="logo-carga" respaldo={null} />
      </div>
    </div>
  );
}
