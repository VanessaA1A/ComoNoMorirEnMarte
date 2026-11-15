import { useEffect, useState } from 'react';
import { puedeJugarAhora } from '../juego/dispositivo.js';
import Recurso from './Recurso.jsx';

/** true si se puede jugar en esta ventana. Se revisa de nuevo al cambiar el tamaño o el puntero. */
export function usePuedeJugar() {
  const [puede, setPuede] = useState(puedeJugarAhora);
  useEffect(() => {
    const revisar = () => setPuede(puedeJugarAhora());
    window.addEventListener('resize', revisar);
    window.addEventListener('orientationchange', revisar);
    const puntero = window.matchMedia?.('(any-pointer: fine)');
    puntero?.addEventListener?.('change', revisar);
    return () => {
      window.removeEventListener('resize', revisar);
      window.removeEventListener('orientationchange', revisar);
      puntero?.removeEventListener?.('change', revisar);
    };
  }, []);
  return puede;
}

/** Pantalla en celular o ventana chica: el juego sigue en memoria y aparece al agrandar la ventana. */
export function PantallaSoloComputadora() {
  return (
    <main className="solo-computadora" role="main">
      <div className="solo-computadora-caja">
        <Recurso src={['/img/zinnia/feliz.gif', '/img/zinnia_estatica.gif']} alt="Zinn-IA" className="pixel solo-computadora-zinnia" respaldo={null} />
        <p className="solo-computadora-texto">
          ¡Uy! Este viaje a Marte necesita una pantalla más grande. Ábreme en una computadora para jugar.
          Mientras tanto, puedes leer la Guía de supervivencia.
        </p>
        <a className="boton principal" href="/guia.html">Leer la Guía de supervivencia</a>
      </div>
    </main>
  );
}
