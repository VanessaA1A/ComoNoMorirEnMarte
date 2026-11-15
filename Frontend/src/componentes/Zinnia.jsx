// Zinn-IA 24/7: ícono flotante + panel lateral, tutorial con spotlight y aviso de sin conexión.
// El tutorial, las pistas y "Pregúntale a Zinn-IA" son texto PREESCRITO (src/data). El chat usa IA (Claude Haiku)
// limitada a datos verificados, con respaldo preescrito sin conexión. Nada de esto cambia el estado ni las reglas del juego.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { enviar, suscribir, leerChat, MAX_TEXTO, PEDIR_CHISTE, SEMILLA, enSemilla } from '../juego/zinniaChat.js';
import MARTE from '../data/marte.json';
import { escena as escenaDe, lineasVisibles, opcionesVisibles } from '../engine/motor.js';
import { formatear } from '../engine/texto.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { comoVoy, comoRecuperoBateria } from '../juego/comoVoy.js';
import { expresionPanel } from '../juego/expresiones.js';
import { fichasDe } from '../juego/fichas.js';
import { apiActiva, iaDisponible } from '../api.js';
import ZinniaAvatar from './ZinniaAvatar.jsx';
import Icono from './Iconos.jsx';
import { Cajon, Modal, useFocoAtrapado } from './Modal.jsx';
import { Enlace, visible } from './Mapas.jsx';
import { PARADAS } from '../juego/cartografia.js';
const PARADAS_REALES = new Set(PARADAS.map((p) => p.id));
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
  return [...new Set([...delCap, ...generales].filter(Boolean))].slice(0, 3); // filter: por si falta una pregunta (PR #4)
}

// ---------- Chat con Zinn-IA ----------
const LUGARES_MARTE = new Set([...MARTE.destinos, ...MARTE.aterrizajes, ...(MARTE.zonas ?? [])].filter(visible).map((x) => x.id)); // sin pendientes
const ETIQUETA_ACCION = { abrir_capa: 'Ver capa', marcar_poi: 'Ver en el mapa', mostrar_ficha: 'Ver ficha', abrir_3d: 'Ver en 3D' };

/** Ejecuta una acción del agente con lo que ya existe en el juego. Ids desconocidos: se ignoran. */
export function ejecutarAccion(j, a) {
  if (a?.tipo === 'abrir_capa' && j.catalogo.capas.some((c) => c.id === a.id)) { j.setCapa(a.id); j.abrir('mapaRuta'); return true; }
  if (a?.tipo === 'marcar_poi' && PARADAS_REALES.has(a.id)) { j.abrir('mapaRuta', { poi: a.id }); return true; } // el mapa completo se abre con ese punto seleccionado
  if (a?.tipo === 'abrir_3d' && ['globo', 'region'].includes(a.id)) { j.abrir('marte3d', { vista: a.id }); return true; }
  if (a?.tipo === 'marcar_poi' && LUGARES_MARTE.has(a.id)) { j.abrir('mapaMarte', { lugar: a.id }); return true; } // abre el Mapa de Marte con la ficha de ese lugar
  if (a?.tipo === 'mostrar_ficha' && j.catalogo.datos.some((d) => d.id === a.id)) { j.abrir('guia', { pestana: 'Fichas' }); return true; }
  return false;
}
const accionValida = (j, a) => (a?.tipo === 'abrir_3d' && ['globo', 'region'].includes(a.id)) || ['abrir_capa', 'marcar_poi', 'mostrar_ficha'].includes(a?.tipo) && (
  PARADAS_REALES.has(a.id) ||
  j.catalogo.capas.some((c) => c.id === a.id) || j.catalogo.pois.some((x) => x.id === a.id && visible(x)) || LUGARES_MARTE.has(a.id) || j.catalogo.datos.some((d) => d.id === a.id));

/** Punto verde "IA en vivo" o gris "modo sin conexión": según la última respuesta o, antes de la primera, según /salud. */
export function IndicadorIA({ modo, iaSalud }) {
  const enVivo = modo === 'ia' || (modo === null && iaSalud === true);
  return (
    <p className={`indicador-ia ${enVivo ? 'ia-en-vivo' : 'ia-sin-conexion'}`} role="status">
      <span className="punto-ia" aria-hidden="true" />{enVivo ? 'IA en vivo' : 'Modo sin conexión'}
    </p>
  );
}

function ChatZinnia({ p }) {
  const j = useJuego();
  const { mensajes, pensando, modo } = useSyncExternalStore(suscribir, leerChat, leerChat);
  const [texto, setTexto] = useState('');
  const [iaSalud, setIaSalud] = useState(null);
  const lista = useRef(null);
  const campo = useRef(null);
  useEffect(() => { lista.current?.scrollTo?.({ top: lista.current.scrollHeight }); }, [mensajes.length, pensando]);
  // Al abrir, el foco va al campo de texto (después de que el panel ponga su foco inicial)
  useEffect(() => { const t = setTimeout(() => campo.current?.focus(), 0); return () => clearTimeout(t); }, []);
  useEffect(() => { let vivo = true; iaDisponible().then((v) => vivo && setIaSalud(v)); return () => { vivo = false; }; }, []);

  const mandar = async (t) => {
    const r = await enviar(t, { partida: p, fichas: j.fichas });
    if (!r) return;
    setTexto('');
    // La primera acción válida se ejecuta sola (después de un momento para leer la respuesta); las demás quedan como botones
    const primera = (r.acciones ?? []).find((a) => accionValida(j, a));
    if (primera) setTimeout(() => ejecutarAccion(j, primera), 1500);
  };
  const sugerencias = [...sugeridas(p).map((r) => r.pregunta), PEDIR_CHISTE];

  return (
    <section aria-labelledby="chat-zinnia" className="chat-zinnia">
      <header className="zp-encabezado">
        <h3 id="chat-zinnia" className="zp-titulo">Chat</h3>
        <IndicadorIA modo={modo} iaSalud={iaSalud} />
      </header>
      <div className="chat-historial" ref={lista} aria-live="polite" aria-label="Conversación con Zinn-IA">
        {!mensajes.length && <div className="burbuja chat-zinnia-msg"><span className="chat-quien" aria-hidden="true">Zinn-IA</span>¡Hola! Sé de Marte, del mapa y de tus barras. Pregúntame, o pídeme un chiste malo.</div>}
        {mensajes.map((m) => (
          <div key={m.id} className={m.rol === 'usuario' ? 'chat-yo' : 'burbuja chat-zinnia-msg'}>
            {m.rol === 'usuario' && <span className="oculto-lector">Tú: </span>}
            {m.rol !== 'usuario' && <span className="chat-quien" aria-hidden="true">Zinn-IA</span>}
            {m.texto}
            {m.fuente && /^https?:/.test(m.fuente) && <div className="fuente">Fuente: <Enlace url={m.fuente} /></div>}
            {m.chiste?.ficha && (
              <div><button className="boton secundario chat-chip" onClick={() => j.abrir('guia', { pestana: 'Fichas' })}>¿Es verdad?</button></div>
            )}
            {m.acciones?.some((a) => accionValida(j, a)) && (
              <div className="chat-acciones">
                {m.acciones.filter((a) => accionValida(j, a)).map((a) => (
                  <button key={`${a.tipo}-${a.id}`} className="boton secundario chat-chip" onClick={() => ejecutarAccion(j, a)}>{ETIQUETA_ACCION[a.tipo]}: {a.id}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {pensando && (
          <div className="burbuja chat-pensando" role="status">
            <span className="chat-pensando-cara"><ZinniaAvatar expresion="ojos-cerrados" recorte="cara" parpadeo={false} alt="" /></span>
            <span className="oculto-lector">Zinn-IA está pensando</span><span className="puntitos" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
          </div>
        )}
      </div>
      <div className="chat-sugerencias" role="group" aria-label="Preguntas sugeridas">
        {sugerencias.map((s) => <button key={s} className="pregunta chat-sugerencia" disabled={pensando} onClick={() => mandar(s)}>{s}</button>)}
      </div>
      <form className="chat-campo" onSubmit={(e) => { e.preventDefault(); mandar(texto); }}>
        <label className="oculto-lector" htmlFor="chat-texto">Mensaje para Zinn-IA (máximo {MAX_TEXTO} caracteres)</label>
        <input id="chat-texto" ref={campo} value={texto} maxLength={MAX_TEXTO} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe cualquier pregunta" autoComplete="off" />
        <button className="boton principal chat-enviar" disabled={pensando || !texto.trim()} aria-label="Enviar"><Icono nombre="enviar" /></button>
      </form>
      {texto.length > MAX_TEXTO - 50 && <p className="provisional">{texto.length}/{MAX_TEXTO}</p>}
    </section>
  );
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

/** Batería en 0: Zinn-IA "se apaga" (modo semilla). No responde preguntas libres; solo lleva a la Guía. */
function Semilla() {
  const j = useJuego();
  const boton = useRef(null);
  useEffect(() => { const t = setTimeout(() => boton.current?.focus(), 0); return () => clearTimeout(t); }, []);
  return (
    <section className="semilla" aria-labelledby="semilla-texto">
      <div className="semilla-cara"><ZinniaAvatar apagada /></div>
      <p id="semilla-texto" className="burbuja">{SEMILLA}</p>
      <button ref={boton} className="boton principal" onClick={() => j.abrir('guia')}>Abrir la Guía</button>
    </section>
  );
}

export function PanelZinnia() {
  const j = useJuego();
  const p = j.pantalla === 'juego' ? j.partida : null;
  const emergencia = enSemilla(p);
  const { pensando, mensajes } = useSyncExternalStore(suscribir, leerChat, leerChat);
  const ops = opcionesActuales(p, j.linea);
  const pista = ops.length ? PISTAS[p.escena] : null;
  // Carita del ícono y de la cabecera: semilla, pensando, la de la última respuesta o la de los recursos; con una pista importante, seria
  const base = expresionPanel(p, { pensando, ultima: mensajes.at(-1) });
  const cara = pista && !pensando && base.expresion === 'normal' ? { ...base, expresion: 'seria' } : base;
  const totalFichas = fichasDe(j.catalogo.datos).length;

  const icono = (
    <button className="icono-zinnia" data-tutorial="icono-zinnia" onClick={() => j.abrirPanelZinnia(!j.panelZinnia)}
      aria-label={`Zinn-IA, tu asistente (tecla Z)${j.avisoZinnia ? ': tiene algo nuevo para ti' : ''}`} aria-expanded={j.panelZinnia}
      aria-controls="panel-zinnia" title="Zinn-IA (tecla Z)">
      <ZinniaAvatar expresion={cara.expresion} apagada={cara.apagada} recorte="cara" alt="" />
      {j.avisoZinnia && <span className="punto" aria-hidden="true" />}
    </button>
  );
  if (!j.panelZinnia) return icono;

  const lectura = comoVoy(p).map((t) => formatear(t, p ?? {}));

  return (
    <>
      {icono}
      <Cajon titulo={emergencia ? 'Zinn-IA · modo semilla' : 'Zinn-IA'} onCerrar={() => j.abrirPanelZinnia(false)} className="panel-zinnia"
        cabecera={<div className={`cara cara-${cara.expresion}`}><ZinniaAvatar expresion={cara.expresion} apagada={cara.apagada} recorte="cara" /></div>}>
        <div className="cajon-cuerpo" id="panel-zinnia">
          {emergencia ? <Semilla /> : <ChatZinnia p={p} />}

          {!emergencia && <section aria-labelledby="como-voy" className="zp-tarjeta">
            <h3 id="como-voy" className="zp-titulo">¿Cómo voy?</h3>
            <ul className="zp-lectura">{lectura.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>}

          {!emergencia && (
            <>
              {ops.length > 0 && (
                <section aria-labelledby="pista" className="zp-tarjeta zp-pista">
                  <h3 id="pista" className="zp-titulo"><Icono nombre="pista" /> Pista para esta decisión</h3>
                  {pista ? (
                    <div className="zp-pista-texto">
                      {formatear(pista.texto, p)}
                      {pista.capa && p.capitulo >= 3 && (
                        <div style={{ marginTop: '.5em' }}>
                          <button className="boton secundario" onClick={() => { j.setCapa(pista.capa); j.abrir('mapaRuta'); }}>Ver la capa</button>
                        </div>
                      )}
                    </div>
                  ) : <div className="zp-pista-texto">Aquí no tengo una pista especial: mira cómo vas arriba y decide con eso.</div>}
                </section>
              )}

              <section aria-labelledby="preguntas" className="zp-tarjeta">
                <h3 id="preguntas" className="zp-titulo">Preguntas frecuentes</h3>
                <p className="zp-sub">Sugeridas para este momento</p>
                {sugeridas(p).map((r) => <Pregunta key={`s-${r.id}`} r={r} p={p} />)}
                {CATEGORIAS.map((c) => (
                  <details key={c} className="zp-categoria">
                    <summary>{c}<span className="zp-cuenta">{RESPUESTAS.filter((r) => r.categoria === c).length}</span></summary>
                    {RESPUESTAS.filter((r) => r.categoria === c).map((r) => <Pregunta key={r.id} r={r} p={p} />)}
                  </details>
                ))}
              </section>

              <section aria-label="Accesos rápidos" className="zp-accesos">
                <button className="zp-acceso" onClick={() => j.abrir('guia')}><Icono nombre="guia" /><span>Guía</span></button>
                <button className="zp-acceso" onClick={() => j.abrir('mapaRuta')}><Icono nombre="ruta" /><span>Ruta</span></button>
                <button className="zp-acceso" onClick={() => j.abrir('mapaMarte')}><Icono nombre="marte" /><span>Marte</span></button>
                <button className="zp-acceso" onClick={() => j.abrir('guia', { pestana: 'Fichas' })}><Icono nombre="ficha" /><span>Fichas {j.fichas.length}/{totalFichas}</span></button>
              </section>
              <button className="zp-tutorial" onClick={j.repetirTutorial}><Icono nombre="repetir" /> Repetir tutorial</button>
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
        <div className="cara"><ZinniaAvatar expresion={paso.expresion ?? paso.zinnia} /></div>
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
  return (
    <div className="sin-conexion">
      <Modal titulo="Sin señal con la Tierra" onCerrar={j.descartarSinConexion}>
        <div className="zinnia-sin-conexion"><ZinniaAvatar expresion="seria" alt="Zinn-IA sin conexión" /></div>
        <p>{formatear('Perdimos la señal con la Tierra. Tranquil{o|a|e}: tu partida se guarda aquí y la mando cuando vuelva la conexión.', j.partida ?? {})}</p>
        <button className="boton principal" onClick={j.descartarSinConexion} autoFocus>Seguir sin conexión</button>
      </Modal>
    </div>
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