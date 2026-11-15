import { useEffect, useRef, useState } from 'react';
import { escena as escenaDe, lineasVisibles, opcionesVisibles } from '../engine/motor.js';
import { formatear } from '../engine/texto.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { Fondo, Astronauta, fondoTraeAstronauta } from './Personajes.jsx';
import ZinniaAvatar from './ZinniaAvatar.jsx';
import { MapaRuta, poiActual } from './Mapas.jsx';
import HUD from './HUD.jsx';
import { BARRAS } from '../engine/reglas.js';
import { expresionEscena } from '../juego/expresiones.js';

const VELOCIDAD_MS = 22; // por letra
const ESPERA_GUIA_MS = 15000; // "esperarGuia": a los 15 s aparece "La abro después"
const REACCION_MS = 1800; // llorona al perder un recurso: dura un momento
const PERDIDA = 15; // una barra baja 15 o más de golpe (la radiación sube 15 o más)

/**
 * Reacción breve de Zinn-IA cuando se MUESTRA la consecuencia: llanto si se pierde un recurso.
 * Al elegir una opción no reacciona (no debe revelar qué opción era la peligrosa antes de ver qué pasó).
 */
function useReaccion(partida) {
  const [reaccion, setReaccion] = useState(null);
  const antes = useRef(partida);
  useEffect(() => {
    const a = antes.current;
    antes.current = partida;
    if (!a?.hud || !partida?.hud || a === partida) return;
    const perdio = BARRAS.some((b) => (b === 'radiacion' ? partida[b] - a[b] : a[b] - partida[b]) >= PERDIDA);
    if (perdio) setReaccion({ e: 'llorona', t: Date.now() });
  }, [partida]);
  useEffect(() => {
    if (!reaccion) return undefined;
    const t = setTimeout(() => setReaccion(null), REACCION_MS);
    return () => clearTimeout(t);
  }, [reaccion]);
  return reaccion?.e ?? null;
}

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
  // Canción del cap. 1: la línea termina con un botón de UNA respuesta (sin efecto) que completa el verso
  const verso = completo && actual?.respuesta ? formatear(actual.respuesta, partida) : null;
  // "esperarGuia": no se avanza hasta que se abra la Guía (o se elija "La abro después")
  const [despues, setDespues] = useState(null);
  const [verDespues, setVerDespues] = useState(null);
  const esperandoGuia = finLineas && esc.accion === 'esperarGuia' && j.guiaAbiertaEn !== partida.escena;
  useEffect(() => {
    if (!esperandoGuia || pausado) return;
    const t = setTimeout(() => setVerDespues(partida.escena), ESPERA_GUIA_MS);
    return () => clearTimeout(t);
  }, [esperandoGuia, pausado, partida.escena]);
  const bloqueadoPorGuia = esperandoGuia && despues !== partida.escena;

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
    else if (!opciones.length && !pidiendoNombre && !verso && !bloqueadoPorGuia) j.avanzar();
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
  const esJugador = actual?.quien === '{nombre}';
  // Fondo del cuadro (public/img/ui/dialogo_*.png): Zinn-IA y el jugador traen su pestaña con el nombre dibujada;
  // la narración y los demás (Control de misión) usan el cuadro de narración.
  const tipoDialogo = esZinnia ? 'zinnia-habla' : esJugador ? 'jugador-habla' : esNarracion ? 'narracion' : 'otro-habla';
  const nombreEnImagen = esZinnia || esJugador;
  // Expresión: la de la línea de Zinn-IA, una reacción breve, o la de la escena y los recursos (src/juego/expresiones.js)
  const reaccion = useReaccion(partida);
  const { expresion, apagada } = expresionEscena({ partida, escena: esc, linea: actual, reaccion });
  const apagado = partida.bateria <= 0;
  const conTablet = Boolean(esc.abrirTablet);
  const verMinimapa = partida.capitulo >= 3 && !conTablet && !esc.esFinal;
  // Cap. 1: el astronauta de espaldas, a la derecha, mirando por la ventanilla. La escala de cada lugar está en estilos.css.
  const cap = esc.esFinal ? 10 : partida.capitulo;
  const lugar = cap === 1 ? 'lugar-cabina' : cap === 2 ? 'lugar-nave' : 'lugar-marte';
  const pose = cap === 1 ? 'espalda' : (esc.astro ?? 'neutral');

  return (
    <div className={`escena capa-llena ${lugar} ${conTablet ? 'con-tablet' : ''}`}>
      <Fondo archivo={esc.fondo} capitulo={cap} />
      {!fondoTraeAstronauta(esc.fondo) && <div className="personaje-astro"><Astronauta pose={pose} /></div>}

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

      {/* Misma caja siempre (habla o no): al cambiar de expresión no se mueve. Apagada (batería 0) nunca habla. */}
      <div className={`personaje-zinnia ${esZinnia && !apagado ? 'hablando' : ''}`}>
        <ZinniaAvatar expresion={expresion} apagada={apagada} />
      </div>

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
        {verso && (
          <div className="opciones" role="group" aria-label="Completa el verso">
            <button className="opcion opcion-verso" onClick={() => j.responder(actual.respuesta)} autoFocus>
              <span>{verso}</span>
            </button>
          </div>
        )}
        {bloqueadoPorGuia && verDespues === partida.escena && (
          <div className="opciones" role="group" aria-label="Guía de supervivencia">
            <button className="opcion opcion-verso" onClick={() => { setDespues(partida.escena); j.avanzar(); }} autoFocus>
              <span>La abro después</span>
            </button>
          </div>
        )}
        {actual && (
          <div className={`dialogo dialogo-imagen ${tipoDialogo}`}
            onClick={pulsar} data-tutorial="dialogo" aria-live="polite">
            {!esNarracion && <span className={nombreEnImagen ? 'oculto-lector' : 'quien'}>{quien}</span>}
            <span aria-hidden={!completo}>{texto.slice(0, letras)}</span>
            {!completo && <span className="oculto-lector">{texto}</span>}
            {completo && !opciones.length && !pidiendoNombre && !verso && !bloqueadoPorGuia && <span className="seguir" aria-hidden="true">▼</span>}
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
