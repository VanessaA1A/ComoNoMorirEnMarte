import { useEffect, useState } from 'react';
import { CAPITULOS } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { formatear } from '../engine/texto.js';
import { fichasDe, esDestacada } from '../juego/fichas.js';
import { Cajon } from './Modal.jsx';
import { Enlace, etiquetaCapa } from './Mapas.jsx';
import Recurso from './Recurso.jsx';
import GLOSARIO from '../data/glosario.json';
import RECURSOS from '../data/recursos_nasa.json';
// Una sola fuente: el mismo JSON que lee public/guia.html (va dentro del bundle para funcionar sin conexión)
import GUIA from '../../public/data/guia_supervivencia.json';

/** Índice: las secciones de la guía y, en "Más", las fichas desbloqueadas y el detalle que ya existía. */
const MAS = ['Fichas', 'Capas del mapa', 'Recursos NASA', 'Glosario completo', 'Fuentes'];
export const PESTANAS = [...GUIA.secciones.map((s) => s.id), ...MAS];

export default function Guia({ pestanaInicial = GUIA.secciones[0].id }) {
  const j = useJuego();
  const [pestana, setPestana] = useState(PESTANAS.includes(pestanaInicial) ? pestanaInicial : GUIA.secciones[0].id);
  const todas = fichasDe(j.catalogo.datos);
  const nuevas = j.fichasNuevas;
  const seccion = GUIA.secciones.find((s) => s.id === pestana);

  // Al salir de la pestaña Fichas, las nuevas dejan de brillar
  useEffect(() => () => { if (pestana === 'Fichas') j.marcarFichasVistas(); }, [pestana]); // eslint-disable-line

  return (
    <Cajon titulo="Guía de supervivencia" onCerrar={j.cerrarOverlay}
      cabecera={<div className="cara"><Recurso src="/img/zinnia/triste.png" alt="" className="zinnia" respaldo={null} /></div>}>
      <nav className="guia-indice" aria-label="Índice de la guía">
        <div className="pestanas" role="tablist" aria-label="Secciones">
          {GUIA.secciones.map((s) => (
            <button key={s.id} role="tab" aria-selected={s.id === pestana} onClick={() => setPestana(s.id)} title={formatear(s.titulo, j.partida)}>
              {s.numero}. {formatear(s.titulo, j.partida)}
            </button>
          ))}
        </div>
        <div className="pestanas pestanas-mas" role="tablist" aria-label="Más información">
          {MAS.map((p) => (
            <button key={p} role="tab" aria-selected={p === pestana} onClick={() => setPestana(p)}>
              {p === 'Fichas' ? `Fichas (${j.fichas.length}/${todas.length})${nuevas.length ? ' ✦' : ''}` : p}
            </button>
          ))}
        </div>
      </nav>
      <div className="cajon-cuerpo guia-cuerpo" role="tabpanel">
        {seccion && <SeccionGuia seccion={seccion} partida={j.partida} />}
        {pestana === 'Capas del mapa' && j.catalogo.capas.map((c) => (
          <div key={c.id} className="tarjeta-dato">
            <strong>{c.etiqueta ? `${etiquetaCapa(c)}: ${c.nombre}` : c.nombre}</strong>
            <p>{c.descripcion}</p>
            <p>Misión: {c.mision} · Instrumento: {c.instrumento}</p>
            <p>Limitación: {c.limitacion}</p>
            <p className="fuente">Fuente: <Enlace url={c.fuente} /></p>
          </div>
        ))}
        {pestana === 'Fichas' && todas.map((d) => {
          const tiene = j.fichas.includes(d.id);
          return (
            <div key={d.id} className={`tarjeta-dato ${tiene ? '' : 'bloqueada'} ${nuevas.includes(d.id) ? 'nueva' : ''}`}>
              {tiene ? (
                <>
                  <strong>{d.id}{esDestacada(d) ? ' ★' : ''}</strong> {d.texto}
                  <p className="fuente">Fuente: <Enlace url={d.fuente} />{d.verificado ? '' : ' · pendiente de revisión'}</p>
                </>
              ) : <span>{d.id} · Ficha bloqueada: {pista(d.capitulo)}</span>}
            </div>
          );
        })}
        {pestana === 'Recursos NASA' && <RecursosNasa />}
        {pestana === 'Glosario completo' && <dl>{GLOSARIO.map((g) => (
          <div key={g.termino} className="tarjeta-dato"><dt><strong>{g.termino}</strong></dt><dd style={{ margin: 0 }}>{g.definicion}</dd></div>
        ))}</dl>}
        {pestana === 'Fuentes' && (
          <>
            {CAPITULOS.map((c) => (
              <div key={c.capitulo} className="tarjeta-dato">
                <strong>Capítulo {c.capitulo}: {c.titulo}</strong>
                <p>{c.dato}</p>
                <ul className="fuente">{(c.fuentes ?? []).map((f) => <li key={f}><Enlace url={f} /></li>)}</ul>
              </div>
            ))}
            <div className="tarjeta-dato">
              <strong>Banco de datos (fichas y pantallas de carga)</strong>
              <ul className="fuente">{[...new Set(j.catalogo.datos.map((d) => d.fuente))].map((f) => <li key={f}><Enlace url={f} /></li>)}</ul>
            </div>
          </>
        )}
      </div>
    </Cajon>
  );
}

/** Texto con **negrita**, *cursiva* y marcadores de pronombre {o|a|e} (según la partida; sin partida, "o/a/e"). */
export function TextoGuia({ texto, partida }) {
  const t = formatear(texto, partida);
  return t.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((trozo, i) => {
    if (/^\*\*[^*]+\*\*$/.test(trozo)) return <strong key={i}>{trozo.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(trozo)) return <em key={i}>{trozo.slice(1, -1)}</em>;
    return trozo;
  });
}

export function SeccionGuia({ seccion, partida }) {
  return (
    <section className="guia-seccion" aria-labelledby={`guia-${seccion.id}`}>
      <h3 id={`guia-${seccion.id}`}>{seccion.numero}. <TextoGuia texto={seccion.titulo} partida={partida} /></h3>
      {seccion.bloques.map((b, i) => {
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
    <div>
      <p>Los 5 recursos oficiales del reto que usa el juego:</p>
      {RECURSOS.map((r) => (
        <div key={r.id} className="tarjeta-dato">
          <strong><a href={r.url} target="_blank" rel="noreferrer">{r.nombre} ↗</a></strong>
          <p>{r.que_es}</p>
          <ul>{r.uso_en_el_juego.map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

const pista = (cap) => (cap === 'Mapa' ? 'ábrela en el Mapa de Marte' : cap === 'Final' ? 'se gana al ver un final' : `se gana en el capítulo ${String(cap).split(',')[0]}`);
