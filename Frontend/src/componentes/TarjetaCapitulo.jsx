import { useEffect, useMemo } from 'react';
import { infoCapitulo } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { Fondo } from './Personajes.jsx';
import Recurso from './Recurso.jsx';

/** Número + título del capítulo sobre su fondo, con un dato de pantalla de carga (uso C). 2,5 s o clic. */
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
      <Fondo archivo={info.fondoTarjeta} alternativas={['cargando.png']} capitulo={numero} />
      <div className="contenido">
        <div className="numero">CAPÍTULO {numero} DE 10</div>
        <h1 className="titulo-capitulo">{info.titulo}</h1>
        {dato && <p className="dato-carga">¿Sabías que...? {dato.texto}</p>}
      </div>
      <div className="carga-pie" aria-hidden="true">
        <Recurso src="/img/zinnia/apagada.png" alt="" className="semilla-cargando" respaldo={null} />
        <Recurso src="/img/logos/logotipo_zinnia_aurora.png" alt="" className="logo-carga" respaldo={null} />
      </div>
    </div>
  );
}
