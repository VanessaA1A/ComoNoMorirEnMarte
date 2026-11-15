import { useMemo } from 'react';
import { infoCapitulo } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import ZinniaAvatar from './ZinniaAvatar.jsx';

/** Pantalla de carga del capítulo: número + título sobre el fondo "cargando" y un dato de pantalla de carga (uso C).
 *  No se cierra sola: el jugador decide.
 *  - Capítulo 1: solo "Continuar" (todavía no hay nada que guardar) y Zinn-IA con efecto de estática.
 *  - Capítulo 2 en adelante: "Continuar" y "Guardar y cerrar" (autoguardado en localStorage y vuelta al Inicio). */
export default function TarjetaCapitulo({ numero }) {
  const j = useJuego();
  const info = infoCapitulo(numero);
  const primero = numero === 1;
  const dato = useMemo(() => {
    const deCarga = j.catalogo.datos.filter((d) => /C/.test(d.uso));
    return deCarga[Math.floor(Math.random() * deCarga.length)];
  }, [numero]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tarjeta-capitulo" role="dialog" aria-modal="true" aria-labelledby="titulo-tarjeta">
      <img src="/img/fondos/cargando.jpg" alt="" className="fondo" draggable={false} />
      <div className="contenido">
        <div className="numero">CAPÍTULO {numero} DE 10</div>
        <h1 id="titulo-tarjeta" className="titulo-capitulo">{info.titulo}</h1>
        {dato && <p className="dato-carga">¿Sabías que...? {dato.texto}</p>}
        <div className={`tarjeta-botones ${primero ? 'solo' : ''}`}>
          <button className="boton principal tarjeta-continuar" onClick={j.cerrarTarjeta} autoFocus>Continuar</button>
          {!primero && <button className="boton tarjeta-guardar" onClick={j.guardarYCerrar}>Guardar y cerrar</button>}
        </div>
      </div>
      <div className="carga-pie" aria-hidden="true">
        <div className="carga-zinnia">
          {primero
            ? <img src="/img/zinnia_estatica.gif" alt="" className="zinnia-estatica" draggable={false} />
            : <ZinniaAvatar className="zinnia-onda" alt="" />}
          <span>{primero ? 'Te damos la bienvenida a bordo' : 'Capítulo listo'}</span>
        </div>
      </div>
    </div>
  );
}
