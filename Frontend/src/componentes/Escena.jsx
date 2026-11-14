import { useEffect, useRef, useState } from 'react';
import { escena as escenaDe, lineasVisibles, opcionesVisibles } from '../engine/motor.js';
import { formatear } from '../engine/texto.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { Fondo, ZinnIA, Astronauta } from './Personajes.jsx';
import { MapaRuta, poiActual } from './Mapas.jsx';
import HUD from './HUD.jsx';
import { barrasEnRojo } from '../juego/comoVoy.js';

const VELOCIDAD_MS = 22; // por letra

export default function Escena() {
  const j = useJuego();
  const { partida, linea, pausado } = j;
  const esc = escenaDe(partida.escena);
  const lineas = lineasVisibles(esc, partida);
  const actual = lineas[linea];
  const texto = formatear(actual?.texto ?? '', partida);
  // Texto letra por letra. El contador va atado a la línea: al cambiar de línea vuelve a 0
  // en el mismo render (sin mostrar un instante el texto completo ni las opciones).
  const clave = `${partida.escena}:${linea}:${texto}`;
  const [tipeo, setTipeo] = useState({ clave, n: 0 });
  const letras = tipeo.clave === clave ? tipeo.n : 0;
  const setLetras = (n) => setTipeo({ clave, n });
  const completo = letras >= texto.length;
  useEffect(() => {
    if (pausado || completo) return;
    const t = setTimeout(() => setTipeo({ clave, n: letras + 1 }), VELOCIDAD_MS);
    return () => clearTimeout(t);
  }, [clave, letras, pausado, completo]);

  const finLineas = lineas.length === 0 || (linea >= lineas.length - 1 && completo);
  const opciones = finLineas ? opcionesVisibles(esc, partida) : [];
  const pidiendoNombre = finLineas && esc.accion === 'pedirNombre';

  // Una sola vez por escena: autoguardado antes de decidir y avisos de Zinn-IA
  const avisada = useRef(null);
  useEffect(() => {
    if (opciones.length && avisada.current !== partida.escena) {
      avisada.current = partida.escena;
      j.opcionesEnPantalla(opciones);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (esc.abrirTablet && !j.tarjeta) j.disparar('tablet'); }, [esc.id, j.tarjeta]); // eslint-disable-line

  const pulsar = () => {
    if (pausado) return;
    if (!completo) setLetras(texto.length);
    else if (!opciones.length && !pidiendoNombre) j.avanzar();
  };

  // Clic, Espacio o Enter
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.getAttribute?.('role') === 'button') return;
      e.preventDefault();
      pulsar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  const quien = actual ? formatear(actual.quien, partida) : '';
  const esZinnia = actual?.quien === 'Zinn-IA';
  const esNarracion = actual?.quien === 'Narración';
  // Con batería en 0 se repliega en semilla; con una barra en rojo usa el GIF de peligro
  const expresion = partida.bateria <= 0 ? 'apagada'
    : !esc.esFinal && barrasEnRojo(partida).length ? 'peligro'
    : esc.zinnia ?? 'feliz';
  const apagado = partida.bateria <= 0;
  const conTablet = Boolean(esc.abrirTablet);
  const verMinimapa = partida.capitulo >= 3 && !conTablet && !esc.esFinal;

  return (
    <div className={`escena capa-llena ${conTablet ? 'con-tablet' : ''}`}>
      <Fondo archivo={esc.fondo} capitulo={esc.esFinal ? 10 : partida.capitulo} />
      <div className="personaje-astro"><Astronauta pose={esc.astro ?? 'neutral'} /></div>

      {!esc.esFinal && <HUD />}

      {verMinimapa && (
        <MapaRuta modo="mini" capa={j.capa} capas={j.catalogo.capas} pois={j.catalogo.pois} poi={poiActual(partida)}
          apagado={apagado} onAbrir={() => j.abrir('mapaRuta')} />
      )}

      {conTablet && (
        <div className="tablet-escena">
          <MapaRuta modo="tablet" capa={j.capa} setCapa={j.setCapa} capas={j.catalogo.capas} pois={j.catalogo.pois}
            poi={poiActual(partida)} apagado={apagado} />
        </div>
      )}

      <div className="personaje-zinnia"><ZinnIA expresion={expresion} /></div>

      <div className="zona-dialogo">
        {opciones.length > 0 && (
          <div className="opciones" role="group" aria-label="Decisión" data-tutorial="opciones">
            {opciones.map((o, i) => (
              <button key={i} className="opcion" onClick={() => j.elegir(o)} autoFocus={i === 0}>
                <span>{formatear(o.texto, partida)}</span>
                {o.probabilidad && (
                  <span className="riesgo">
                    {j.modoDemo ? 'Modo demo: sin riesgo' : `Riesgo: ${Math.round((1 - o.probabilidad.exito) * 10)} de 10`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {pidiendoNombre && <CampoNombre onListo={j.ponerNombre} />}
        {actual && (
          <div className={`dialogo ${esZinnia ? 'zinnia-habla' : ''} ${esNarracion ? 'narracion' : ''}`}
            onClick={pulsar} data-tutorial="dialogo" aria-live="polite">
            {!esNarracion && <span className="quien">{quien}</span>}
            <span aria-hidden={!completo}>{texto.slice(0, letras)}</span>
            {!completo && <span className="oculto-lector">{texto}</span>}
            {completo && !opciones.length && !pidiendoNombre && <span className="seguir" aria-hidden="true">▼</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function CampoNombre({ onListo }) {
  const [nombre, setNombre] = useState('');
  const valido = nombre.trim().length >= 1 && nombre.trim().length <= 30;
  return (
    <form className="campo-nombre" onSubmit={(e) => { e.preventDefault(); if (valido) onListo(nombre); }}>
      <label className="oculto-lector" htmlFor="nombre">Tu nombre</label>
      <input id="nombre" value={nombre} maxLength={30} onChange={(e) => setNombre(e.target.value)} placeholder="Escribe tu nombre (1 a 30 letras)" autoFocus autoComplete="off" />
      <button className="boton principal" disabled={!valido}>Listo</button>
    </form>
  );
}
