// Zinn-IA 24/7: ícono flotante + panel lateral, tutorial con spotlight y aviso de sin conexión.
// Todo el texto es PREESCRITO (src/data). Nada de esto cambia el estado ni las reglas del juego.
import { useLayoutEffect, useState } from 'react';
import { escena as escenaDe, lineasVisibles, opcionesVisibles } from '../engine/motor.js';
import { formatear } from '../engine/texto.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { comoVoy, expresionZinnia, comoRecuperoBateria } from '../juego/comoVoy.js';
import { fichasDe } from '../juego/fichas.js';
import { apiActiva } from '../api.js';
import { ZinnIA } from './Personajes.jsx';
import { Cajon, useFocoAtrapado } from './Modal.jsx';
import { Enlace } from './Mapas.jsx';
import Recurso from './Recurso.jsx';
import PISTAS from '../data/pistas.json';
import RESPUESTAS from '../data/zinnia_respuestas.json';

const CATEGORIAS = ['Mecánicas', 'Mapa y capas', 'Ciencia de Marte', 'Peligros'];

/** ¿Hay opciones en pantalla ahora mismo? (para mostrar la pista) */
function opcionesActuales(p, linea) {
  if (!p || p.final) return [];
  const esc = escenaDe(p.escena);
  const n = lineasVisibles(esc, p).length;
  return linea >= n - 1 ? opcionesVisibles(esc, p) : [];
}

/** Preguntas sugeridas: las del capítulo actual primero. */
export function sugeridas(p) {
  const cap = p?.capitulo;
  const delCap = cap ? RESPUESTAS.filter((r) => r.capitulos.includes(cap)) : [];
  const generales = ['guardar', 'ganar', 'capas'].map((id) => RESPUESTAS.find((r) => r.id === id));
  return [...new Set([...delCap, ...generales])].slice(0, 3);
}

function Pregunta({ r, p }) {
  const [abierta, setAbierta] = useState(false);
  const respuesta = r.dinamica ? comoRecuperoBateria(p) : formatear(r.respuesta, p ?? {});
  return (
    <div>
      <button className="pregunta" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>{r.pregunta}</button>
      {abierta && (
        <div className="burbuja">
          {respuesta}
          {r.fuente && <div className="fuente">Fuente: <Enlace url={r.fuente} /></div>}
        </div>
      )}
    </div>
  );
}

export function PanelZinnia() {
  const j = useJuego();
  const p = j.pantalla === 'juego' ? j.partida : null;
  const expresion = expresionZinnia(p);
  const emergencia = Boolean(p && p.bateria <= 0 && !p.final);
  const totalFichas = fichasDe(j.catalogo.datos).length;

  const icono = (
    <button className="icono-zinnia" data-tutorial="icono-zinnia" onClick={() => j.abrirPanelZinnia(!j.panelZinnia)}
      aria-label={`Zinn-IA, tu asistente (tecla Z)${j.avisoZinnia ? ': tiene algo nuevo para ti' : ''}`} aria-expanded={j.panelZinnia}
      title="Zinn-IA (tecla Z)">
      <Recurso src={['/img/ui/icono_zinnia.png', '/img/logos/isotipo.png']} alt="" className={expresion === 'apagada' ? 'zinnia-apagada' : ''} respaldo={null} />
      {j.avisoZinnia && <span className="punto" aria-hidden="true" />}
    </button>
  );
  if (!j.panelZinnia) return icono;

  const ops = opcionesActuales(p, j.linea);
  const pista = ops.length ? PISTAS[p.escena] : null;
  const lectura = comoVoy(p).map((t) => formatear(t, p ?? {}));
  const bateria = RESPUESTAS.find((r) => r.id === 'bateria');

  return (
    <>
      {icono}
      <Cajon titulo={emergencia ? 'Zinn-IA · modo emergencia' : 'Zinn-IA'} onCerrar={() => j.abrirPanelZinnia(false)} className="panel-zinnia"
        cabecera={<div className="cara"><ZinnIA expresion={expresion} /></div>}>
        <div className="cajon-cuerpo">
          {emergencia && <p className="emergencia">Batería en 0: casi no me queda energía. Solo puedo decirte cómo vas y cómo recuperarla.</p>}

          <section aria-labelledby="como-voy">
            <h3 id="como-voy">¿Cómo voy?</h3>
            <div className="burbuja"><ul>{lectura.map((t) => <li key={t}>{t}</li>)}</ul></div>
          </section>

          {emergencia ? (
            <section><h3>¿Cómo recupero batería?</h3><Pregunta r={bateria} p={p} /></section>
          ) : (
            <>
              {ops.length > 0 && (
                <section aria-labelledby="pista">
                  <h3 id="pista">Pista para esta decisión</h3>
                  {pista ? (
                    <div className="burbuja">
                      {formatear(pista.texto, p)}
                      {pista.capa && p.capitulo >= 3 && (
                        <div style={{ marginTop: '.5em' }}>
                          <button className="boton secundario" onClick={() => { j.setCapa(pista.capa); j.abrir('mapaRuta'); }}>Ver la capa</button>
                        </div>
                      )}
                    </div>
                  ) : <div className="burbuja">Aquí no tengo una pista especial: mira cómo vas arriba y decide con eso.</div>}
                </section>
              )}

              <section aria-labelledby="preguntas">
                <h3 id="preguntas">Pregúntale a Zinn-IA</h3>
                <p className="provisional">Sugeridas para este momento:</p>
                {sugeridas(p).map((r) => <Pregunta key={`s-${r.id}`} r={r} p={p} />)}
                {CATEGORIAS.map((c) => (
                  <details key={c}>
                    <summary>{c}</summary>
                    {RESPUESTAS.filter((r) => r.categoria === c).map((r) => <Pregunta key={r.id} r={r} p={p} />)}
                  </details>
                ))}
              </section>

              <section aria-label="Accesos rápidos" className="accesos">
                <button className="boton" onClick={() => j.abrir('guia')}>Guía de supervivencia</button>
                <button className="boton" onClick={() => j.abrir('mapaRuta')}>Mapa de la ruta</button>
                <button className="boton" onClick={() => j.abrir('mapaMarte')}>Mapa de Marte</button>
                <button className="boton" onClick={() => j.abrir('guia', { pestana: 'Fichas' })}>Fichas ({j.fichas.length}/{totalFichas})</button>
                <button className="boton secundario" onClick={j.repetirTutorial}>Repetir tutorial</button>
              </section>
            </>
          )}
        </div>
      </Cajon>
    </>
  );
}

export function Tutorial() {
  const j = useJuego();
  const paso = j.colaTutorial[0];
  const [rect, setRect] = useState(null);
  const ref = useFocoAtrapado(Boolean(paso));

  useLayoutEffect(() => {
    if (!paso) return;
    const medir = () => {
      const escenario = document.querySelector('.escenario')?.getBoundingClientRect();
      const el = document.querySelector(`[data-tutorial="${paso.objetivo}"]`)?.getBoundingClientRect();
      if (!escenario || !el || el.width === 0) { setRect(null); return; }
      setRect({ top: el.top - escenario.top - 6, left: el.left - escenario.left - 6, width: el.width + 12, height: el.height + 12, alto: escenario.height });
    };
    medir();
    const t = setInterval(medir, 300); // los elementos pueden moverse o animarse
    window.addEventListener('resize', medir);
    return () => { clearInterval(t); window.removeEventListener('resize', medir); };
  }, [paso]);

  if (!paso) return null;
  const abajo = !rect || rect.top + rect.height / 2 < rect.alto / 2; // la caja va al lado contrario del foco
  return (
    <div className="tutorial" ref={ref} role="dialog" aria-modal="true" aria-label="Tutorial de Zinn-IA" tabIndex={-1}>
      {rect ? <div className="foco" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} /> : <div className="velo-tutorial" />}
      <div className="caja" style={abajo ? { bottom: '6%' } : { top: '6%' }}>
        <div className="cara"><ZinnIA expresion={paso.zinnia} /></div>
        <div className="dialogo zinnia-habla" aria-live="polite">
          <span className="quien">Zinn-IA</span>
          {formatear(paso.texto, j.partida ?? {})}
          <div className="acciones">
            <button className="boton" onClick={j.saltarTutorial}>Saltar tutorial</button>
            <button className="boton principal" onClick={j.cerrarPasoTutorial} autoFocus>Entendido</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SinConexion() {
  const j = useJuego();
  if (!apiActiva || j.conectado || j.sinConexionDescartado) return null;
  // NO bloquea: el juego es 100 % jugable sin conexión. Solo avisa que el progreso se sincroniza después.
  return (
    <aside className="sin-conexion" role="status" aria-live="polite" aria-label="Sin señal con la Tierra">
      <div className="zinnia-sin-conexion">
        <Recurso src="/img/zinnia/sin_conexion.gif" alt="" className="zinnia" escalaEntera
          respaldo={<img src="/img/logos/isotipo.png" alt="" className="zinnia zinnia-respaldo zinnia-curiosa" />} />
      </div>
      <div>
        <strong>Sin señal con la Tierra</strong>
        <p>{formatear('Perdimos la señal con la Tierra. Tranquil{o|a|e}: tu partida se guarda aquí y la mando cuando vuelva la conexión.', j.partida ?? {})}</p>
        <button className="boton principal" onClick={j.descartarSinConexion}>Seguir sin conexión</button>
      </div>
    </aside>
  );
}

export function Avisos() {
  const { avisos } = useJuego();
  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => <div key={a.id} className="aviso">{a.texto}</div>)}
    </div>
  );
}
