import { useEffect, useState } from 'react';
import { CAPITULOS, INDEX } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { fichasDe, esDestacada } from '../juego/fichas.js';
import { Cajon } from './Modal.jsx';
import { Enlace, etiquetaCapa } from './Mapas.jsx';
import Recurso from './Recurso.jsx';
import GLOSARIO from '../data/glosario.json';
import RECURSOS from '../data/recursos_nasa.json';

const PESTANAS = ['Barras y reglas', 'Capas del mapa', 'Fichas', 'Recursos NASA', 'Glosario', 'Fuentes'];

export default function Guia({ pestanaInicial = 'Barras y reglas' }) {
  const j = useJuego();
  const [pestana, setPestana] = useState(pestanaInicial);
  const todas = fichasDe(j.catalogo.datos);
  const nuevas = j.fichasNuevas;

  // Al salir de la pestaña Fichas, las nuevas dejan de brillar
  useEffect(() => () => { if (pestana === 'Fichas') j.marcarFichasVistas(); }, [pestana]); // eslint-disable-line

  return (
    <Cajon titulo="Guía de supervivencia" onCerrar={j.cerrarOverlay}
      cabecera={<div className="cara"><Recurso src="/img/zinnia/triste.png" alt="" className="zinnia" respaldo={null} /></div>}>
      <div className="pestanas" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p} role="tab" aria-selected={p === pestana} onClick={() => setPestana(p)}>
            {p === 'Fichas' ? `Fichas (${j.fichas.length}/${todas.length})${nuevas.length ? ' · nuevas' : ''}` : p}
          </button>
        ))}
      </div>
      <div className="cajon-cuerpo" role="tabpanel">
        {pestana === 'Barras y reglas' && <Reglas />}
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
                  <strong>{d.id}</strong>{esDestacada(d) ? <em className="destacada"> (destacada)</em> : null} {d.texto}
                  <p className="fuente">Fuente: <Enlace url={d.fuente} />{d.verificado ? '' : ' · pendiente de revisión'}</p>
                </>
              ) : <span>{d.id} · Ficha bloqueada: {pista(d.capitulo)}</span>}
            </div>
          );
        })}
        {pestana === 'Recursos NASA' && <RecursosNasa />}
        {pestana === 'Glosario' && <dl>{GLOSARIO.map((g) => (
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

export function RecursosNasa() {
  return (
    <div>
      <p>Los 5 recursos oficiales del reto que usa el juego:</p>
      {RECURSOS.map((r) => (
        <div key={r.id} className="tarjeta-dato">
          <strong><a href={r.url} target="_blank" rel="noreferrer">{r.nombre}<span className="oculto-lector"> (se abre en otra pestaña)</span></a></strong>
          <p>{r.que_es}</p>
          <ul>{r.uso_en_el_juego.map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

const pista = (cap) => (cap === 'Mapa' ? 'ábrela en el Mapa de Marte' : cap === 'Final' ? 'se gana al ver un final' : `se gana en el capítulo ${String(cap).split(',')[0]}`);

function Reglas() {
  const e = INDEX.estadoInicial;
  return (
    <div>
      <p>Tienes <strong>5 barras de vida</strong> y un <strong>reloj</strong> de {e.minutos} minutos para volver al módulo de ascenso.</p>
      <ul>
        <li><strong>O2</strong> (oxígeno): llega a 0 → la misión termina.</li>
        <li><strong>Batería</strong>: en 0 Zinn-IA se apaga, el mapa pierde las capas y el oxígeno y la comida se gastan el doble.</li>
        <li><strong>Comida</strong> (alimentación): bajo 30 caminas lento (+50 % de tiempo); en 0 te desmayas y el rover te rescata tarde.</li>
        <li><strong>Traje</strong> (integridad): bajo 30 hay fuga (−10 de O2 en cada decisión); en 0 la misión termina.</li>
        <li><strong>Radiación</strong>: va al revés. En 100 la misión termina; con 70 o más al volver no puedes viajar a casa.</li>
      </ul>
      <p>Colores: <span style={{ color: 'var(--barra-verde)' }}>verde</span> más de 50, <span style={{ color: 'var(--barra-amarillo)' }}>amarillo</span> de 25 a 50, <span style={{ color: 'var(--barra-rojo)' }}>rojo</span> menos de 25. Radiación: verde menos de 40, amarillo 40–69, rojo 70 o más.</p>
      <h3>Los 3 finales</h3>
      <ul>
        <li><strong>Bueno:</strong> vuelves viv{'o/a/e'}, a tiempo y con radiación menor a 70.</li>
        <li><strong>Intermedio:</strong> te quedas en Marte si se te acabó el reloj, te desmayaste o tu radiación quedó entre 70 y 99.</li>
        <li><strong>Malo:</strong> oxígeno o traje en 0, o radiación en 100.</li>
      </ul>
      <p>Las muestras no cambian el final, cambian tu historia. Guarda desde el menú (las tres rayas) o con Esc; Zinn-IA (tecla Z) te acompaña siempre.</p>
    </div>
  );
}
