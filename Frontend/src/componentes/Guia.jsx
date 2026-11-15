import { useEffect, useRef, useState } from 'react';
import { CAPITULOS } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { formatear } from '../engine/texto.js';
import { fichasDe, esDestacada } from '../juego/fichas.js';
import { Cajon } from './Modal.jsx';
import { Enlace, etiquetaCapa } from './Mapas.jsx';
import ZinniaAvatar from './ZinniaAvatar.jsx';
import FuentesCartografia from './FuentesCartografia.jsx';
import Icono from './Iconos.jsx';
import GLOSARIO from '../data/glosario.json';
import RECURSOS from '../data/recursos_nasa.json';
// Una sola fuente: el mismo JSON que lee public/guia.html (va dentro del bundle para funcionar sin conexión)
import GUIA from '../../public/data/guia_supervivencia.json';

/** Índice: las secciones de la guía y, en "Más", las fichas desbloqueadas y el detalle que ya existía. */
const MAS = ['Fichas', 'Capas del mapa', 'Recursos NASA', 'Glosario completo', 'Fuentes'];
export const PESTANAS = [...GUIA.secciones.map((s) => s.id), ...MAS];

const ICONO_MAS = { Fichas: 'ficha', 'Capas del mapa': 'capas', 'Recursos NASA': 'cohete', 'Glosario completo': 'letras', Fuentes: 'enlace' };
const INTRO_MAS = {
  Fichas: 'Datos reales de NASA que desbloqueas al jugar. Las nuevas brillan.',
  'Capas del mapa': 'Qué muestra cada capa de la tablet de Zinn-IA, de qué misión viene y qué no puede ver.',
  'Recursos NASA': 'Los recursos oficiales del reto que usa el juego.',
  'Glosario completo': 'Palabras de Marte explicadas en una línea.',
  Fuentes: 'De dónde sale cada dato del juego, capítulo por capítulo.',
};

export default function Guia({ pestanaInicial = GUIA.secciones[0].id }) {
  const j = useJuego();
  const [pestana, setPestana] = useState(PESTANAS.includes(pestanaInicial) ? pestanaInicial : GUIA.secciones[0].id);
  const todas = fichasDe(j.catalogo.datos);
  const nuevas = j.fichasNuevas;
  const seccion = GUIA.secciones.find((s) => s.id === pestana);
  const cuerpo = useRef(null);

  // Al salir de la pestaña Fichas, las nuevas dejan de brillar
  useEffect(() => () => { if (pestana === 'Fichas') j.marcarFichasVistas(); }, [pestana]); // eslint-disable-line
  // Cada pestaña empieza arriba
  useEffect(() => { cuerpo.current?.scrollTo?.({ top: 0 }); }, [pestana]);

  const i = PESTANAS.indexOf(pestana);
  const anterior = PESTANAS[i - 1];
  const siguiente = PESTANAS[i + 1];
  const nombreDe = (id) => {
    const s = GUIA.secciones.find((x) => x.id === id);
    return s ? formatear(s.corto ?? s.titulo, j.partida) : id;
  };
  const progreso = todas.length ? Math.round((j.fichas.length / todas.length) * 100) : 0;

  return (
    <Cajon titulo="Guía de supervivencia" onCerrar={j.cerrarOverlay} className="cajon-guia"
      cabecera={<div className="cara"><ZinniaAvatar recorte="cara" alt="" /></div>}>
      <div className="guia-layout">
        <nav className="guia-indice" aria-label="Índice de la guía">
          <p className="guia-grupo">La guía</p>
          <div className="guia-lista" role="tablist" aria-label="Secciones">
            {GUIA.secciones.map((s, k) => (
              <button key={s.id} role="tab" aria-selected={s.id === pestana} onClick={() => setPestana(s.id)} title={formatear(s.titulo, j.partida)}>
                <span className="guia-num">{s.numero ?? (k === 0 ? 'i' : '·')}</span>
                <span className="guia-nombre">{formatear(s.corto ?? s.titulo, j.partida)}</span>
              </button>
            ))}
          </div>

          <p className="guia-grupo">Más</p>
          <div className="guia-lista" role="tablist" aria-label="Más información">
            {MAS.map((p) => (
              <button key={p} role="tab" aria-selected={p === pestana} onClick={() => setPestana(p)} className={p === 'Fichas' && nuevas.length ? 'con-nuevas' : ''}>
                <span className="guia-num"><Icono nombre={ICONO_MAS[p]} /></span>
                <span className="guia-nombre">{p}</span>
                {p === 'Fichas' && <span className="guia-contador">{j.fichas.length}/{todas.length}</span>}
              </button>
            ))}
          </div>

          {/* La misma guía como página aparte: para leerla o imprimirla (también funciona en celular) */}
          <a className="guia-imprimir" href="/guia.html" target="_blank" rel="noopener">
            <Icono nombre="imprimir" /> Versión para imprimir
          </a>
        </nav>

        <div className="cajon-cuerpo guia-cuerpo" role="tabpanel" ref={cuerpo}>
          {!seccion && (
            <header className="guia-portada">
              <span className="guia-kicker">Más información</span>
              <h3>{pestana}</h3>
              <p>{INTRO_MAS[pestana]}</p>
            </header>
          )}

          {seccion === GUIA.secciones[0] && GUIA.intro && <p className="guia-nota"><TextoGuia texto={GUIA.intro} partida={j.partida} /></p>}
          {seccion && <SeccionGuia seccion={seccion} partida={j.partida} />}

          {pestana === 'Capas del mapa' && (
            <div className="guia-tarjetas">
              {j.catalogo.capas.map((c) => (
                <article key={c.id} className="tarjeta-dato guia-capa">
                  <h4>{c.etiqueta ? `${etiquetaCapa(c)}: ${c.nombre}` : c.nombre}</h4>
                  <p>{c.descripcion}</p>
                  <p className="guia-etiquetas"><span>{c.mision}</span><span>{c.instrumento}</span></p>
                  <p className="guia-limite"><strong>Limitación:</strong> {c.limitacion}</p>
                  <p className="fuente">Fuente: <Enlace url={c.fuente} /></p>
                </article>
              ))}
            </div>
          )}

          {pestana === 'Fichas' && (
            <>
              <div className="guia-progreso" role="progressbar" aria-valuemin={0} aria-valuemax={todas.length} aria-valuenow={j.fichas.length}
                aria-label={`Fichas desbloqueadas: ${j.fichas.length} de ${todas.length}`}>
                <span className="guia-progreso-texto">{j.fichas.length} de {todas.length} fichas</span>
                <span className="guia-progreso-riel"><span style={{ width: `${progreso}%` }} /></span>
              </div>
              <div className="guia-tarjetas">
                {todas.map((d) => {
                  const tiene = j.fichas.includes(d.id);
                  return (
                    <article key={d.id} className={`tarjeta-dato guia-ficha ${tiene ? '' : 'bloqueada'} ${nuevas.includes(d.id) ? 'nueva' : ''}`}>
                      <header>
                        <span className="guia-ficha-id">{d.id}</span>
                        {tiene && esDestacada(d) && <span className="guia-ficha-estrella" title="Ficha destacada"><Icono nombre="estrella" /></span>}
                        {nuevas.includes(d.id) && <span className="guia-ficha-nueva">Nueva</span>}
                        {!tiene && <Icono nombre="candado" className="guia-ficha-candado" />}
                      </header>
                      {tiene ? (
                        <>
                          <p>{d.texto}</p>
                          <p className="fuente">Fuente: <Enlace url={d.fuente} />{d.verificado ? '' : ' · por verificar'}</p>
                        </>
                      ) : <p className="guia-ficha-pista">Bloqueada: {pista(d.capitulo)}</p>}
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {pestana === 'Recursos NASA' && <RecursosNasa />}

          {pestana === 'Glosario completo' && (
            <dl className="guia-glosario">
              {GLOSARIO.map((g) => (
                <div key={g.termino} className="tarjeta-dato"><dt>{g.termino}</dt><dd>{g.definicion}</dd></div>
              ))}
            </dl>
          )}

          {pestana === 'Fuentes' && (
            <>
              {CAPITULOS.map((c) => (
                <div key={c.capitulo} className="tarjeta-dato">
                  <h4>Capítulo {c.capitulo}: {c.titulo}</h4>
                  <p>{c.dato}</p>
                  <ul className="fuente">{(c.fuentes ?? []).map((f) => <li key={f}><Enlace url={f} /></li>)}</ul>
                </div>
              ))}
              <div className="tarjeta-dato">
                <h4>Banco de datos (fichas y pantallas de carga)</h4>
                <ul className="fuente">{[...new Set(j.catalogo.datos.map((d) => d.fuente))].map((f) => <li key={f}><Enlace url={f} /></li>)}</ul>
              </div>
              <div className="tarjeta-dato">
                <h4>Cartografía (mapas)</h4>
                <FuentesCartografia />
              </div>
            </>
          )}

          <nav className="guia-pasos" aria-label="Pasar de sección">
            {anterior ? (
              <button className="guia-paso" onClick={() => setPestana(anterior)}>
                <Icono nombre="izquierda" /><span><small>Anterior</small>{nombreDe(anterior)}</span>
              </button>
            ) : <span />}
            {siguiente && (
              <button className="guia-paso siguiente" onClick={() => setPestana(siguiente)}>
                <span><small>Siguiente</small>{nombreDe(siguiente)}</span><Icono nombre="derecha" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </Cajon>
  );
}

/** Cita [n]: enlace a su fuente (lista de Referencias de la guía). */
function Cita({ n }) {
  const r = GUIA.referencias?.[n];
  if (!r?.url) return `[${n}]`;
  return <a className="cita" href={r.url} target="_blank" rel="noreferrer" title={r.texto} aria-label={`Fuente ${n}: ${r.texto}`}>[{n}]</a>;
}

/** Texto plano con citas [n] y direcciones https:// convertidas en enlaces. */
function Enlazado({ texto }) {
  return String(texto).split(/(\[\d+\]|https?:\/\/[^\s)]+)/g).map((t, i) => {
    const cita = t.match(/^\[(\d+)\]$/);
    if (cita) return <Cita key={i} n={cita[1]} />;
    if (/^https?:\/\//.test(t)) return <a key={i} href={t} target="_blank" rel="noreferrer">{t}</a>;
    return t;
  });
}

/** Texto con **negrita**, *cursiva*, citas [n] y marcadores de pronombre {o|a|e} (según la partida; sin partida, "o/a/e"). */
export function TextoGuia({ texto, partida }) {
  const t = formatear(texto, partida);
  return t.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((trozo, i) => {
    if (/^\*\*[^*]+\*\*$/.test(trozo)) return <strong key={i}><Enlazado texto={trozo.slice(2, -2)} /></strong>;
    if (/^\*[^*]+\*$/.test(trozo)) return <em key={i}><Enlazado texto={trozo.slice(1, -1)} /></em>;
    return <Enlazado key={i} texto={trozo} />;
  });
}

export function SeccionGuia({ seccion, partida }) {
  return (
    <section className="guia-seccion" aria-labelledby={`guia-${seccion.id}`}>
      <header className="guia-portada">
        <span className="guia-kicker">{seccion.numero ? `Parte ${seccion.numero}` : 'Guía de supervivencia'}</span>
        <h3 id={`guia-${seccion.id}`}><TextoGuia texto={seccion.titulo} partida={partida} /></h3>
      </header>
      {seccion.bloques.map((b, i) => {
        if (b.tipo === 'subtitulo') return <h4 key={i}><TextoGuia texto={b.texto} partida={partida} /></h4>;
        if (b.tipo === 'parrafo') return <p key={i}><TextoGuia texto={b.texto} partida={partida} /></p>;
        if (b.tipo === 'nota') return <p key={i} className="guia-nota"><TextoGuia texto={b.texto} partida={partida} /></p>;
        if (b.tipo === 'lista') {
          const Lista = b.ordenada ? 'ol' : 'ul';
          return <Lista key={i}>{b.items.map((it, k) => <li key={k}><TextoGuia texto={it} partida={partida} /></li>)}</Lista>;
        }
        if (b.tipo === 'tabla') {
          return (
            <div key={i} className="guia-tabla">
              <table>
                <thead><tr>{b.encabezados.map((e, k) => <th key={k} scope="col"><TextoGuia texto={e} partida={partida} /></th>)}</tr></thead>
                <tbody>{b.filas.map((f, k) => (
                  <tr key={k}>{f.map((c, m) => (m === 0
                    ? <th key={m} scope="row"><TextoGuia texto={c} partida={partida} /></th>
                    : <td key={m}><TextoGuia texto={c} partida={partida} /></td>))}</tr>
                ))}</tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </section>
  );
}

export function RecursosNasa() {
  return (
    <div className="guia-tarjetas">
      {RECURSOS.map((r) => (
        <article key={r.id} className="tarjeta-dato">
          <h4><a href={r.url} target="_blank" rel="noreferrer">{r.nombre} ↗</a></h4>
          <p>{r.que_es}</p>
          <ul>{r.uso_en_el_juego.map((u) => <li key={u}>{u}</li>)}</ul>
        </article>
      ))}
    </div>
  );
}

const pista = (cap) => (cap === 'Mapa' ? 'ábrela en el Mapa de Marte' : cap === 'Final' ? 'se gana al ver un final' : `se gana en el capítulo ${String(cap).split(',')[0]}`);