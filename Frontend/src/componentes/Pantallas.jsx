// Inicio, Créditos, Menú en juego, Guardar/Cargar e Historial.
import { useState } from 'react';
import { BARRAS, colorBarra } from '../engine/reglas.js';
import { CAPITULOS } from '../engine/guion.js';
import { useJuego } from '../juego/JuegoContext.jsx';
import { RANURAS, leerRanura, hayAutoguardado } from '../juego/partidas.js';
import { ZinnIA, Fondo } from './Personajes.jsx';
import { RecursosNasa } from './Guia.jsx';
import { Modal } from './Modal.jsx';
import { Enlace } from './Mapas.jsx';
import Recurso from './Recurso.jsx';

export function Inicio() {
  const j = useJuego();
  const [confirmar, setConfirmar] = useState(false);
  const hayPartida = hayAutoguardado();
  return (
    <div className="inicio">
      <Fondo archivo="inicio.png" capitulo={1} />
      <h1 className="oculto-lector">Cómo no morir en Marte</h1>
      <Recurso src="/img/logos/titulo.png" alt="" className="logo-nombre"
        respaldo={<span className="titulo-texto" aria-hidden="true">Cómo no morir en Marte</span>} />
      <div className="zinnia-inicio"><ZinnIA expresion="inicio" /></div>
      <div className="botones">
        <button className="boton principal" onClick={() => (hayPartida ? setConfirmar(true) : j.empezar())} autoFocus>Empezar</button>
        <button className="boton" disabled={!hayPartida} onClick={() => j.cargar(0)}>Continuar</button>
        <button className="boton" onClick={() => j.abrir('cargar')}>Cargar</button>
        <button className="boton" onClick={() => j.abrir('mapaMarte')}>Mapa de Marte</button>
        <button className="boton" onClick={() => j.abrir('guia')}>Guía de supervivencia</button>
        <button className="boton secundario" onClick={() => j.setPantalla('creditos')}>Créditos y fuentes</button>
      </div>
      <p className="provisional">Equipo Zinnia Aurora · NASA Space Apps Challenge 2026 · Managua</p>
      {confirmar && (
        <Modal titulo="¿Empezar de nuevo?" onCerrar={() => setConfirmar(false)}>
          <p>Ya tienes una partida en el autoguardado. Si empiezas otra, el autoguardado se reemplaza (tus ranuras manuales no se tocan).</p>
          <div className="lista-botones">
            <button className="boton principal" onClick={() => { setConfirmar(false); j.empezar(); }}>Sí, empezar de nuevo</button>
            <button className="boton" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Creditos() {
  const j = useJuego();
  const fuentes = [...new Set([...CAPITULOS.flatMap((c) => c.fuentes ?? []), ...j.catalogo.datos.map((d) => d.fuente)])];
  return (
    <Modal titulo="Créditos y fuentes" onCerrar={() => j.setPantalla('inicio')} ancho>
      <div className="creditos-logos">
        <Recurso src="/img/logos/logotipo_zinnia_aurora.png" alt="Logotipo del equipo Zinnia Aurora" className="logo-equipo" respaldo={null} />
        <Recurso src="/img/zinnia/triste.png" alt="Zinn-IA" className="logo-equipo" respaldo={null} />
      </div>
      <p><strong>Equipo Zinnia Aurora:</strong> Vanessa, Valeria, Sefora, Ulisis, Kelly y Moises.</p>
      <p><strong>Tipografías:</strong> AMORIA de gunastudio (versión demo, solo para uso personal y no comercial) y FORCED SQUARE de Paul IJsendoorn (Drawperfect).</p>
      <p><strong>Imágenes:</strong> NASA/JPL-Caltech (y NASA/JPL-Caltech/MSSS en las fotos de Curiosity).</p>
      <p><strong>Zinn-IA:</strong> todos sus diálogos están escritos por el equipo; no usa IA generativa en vivo.</p>
      <h3>Recursos NASA del reto</h3>
      <RecursosNasa />
      <h3>Fuentes científicas</h3>
      <ul className="fuente">{fuentes.map((f) => <li key={f}><Enlace url={f} /></li>)}</ul>
    </Modal>
  );
}

export function MenuJuego() {
  const j = useJuego();
  return (
    <Modal titulo="Menú" onCerrar={j.cerrarOverlay}>
      <p className="provisional">El juego está en pausa.</p>
      <div className="lista-botones">
        <button className="boton principal" onClick={j.cerrarOverlay}>Seguir jugando</button>
        <button className="boton" onClick={() => j.abrir('guardar')}>Guardar</button>
        <button className="boton" onClick={() => j.abrir('cargar')}>Cargar</button>
        <button className="boton" onClick={() => j.abrir('guia')}>Guía de supervivencia</button>
        <button className="boton" onClick={() => j.abrir('mapaRuta')} disabled={j.partida?.capitulo < 3}>Mapa de la ruta</button>
        <button className="boton" onClick={() => j.abrir('mapaMarte')}>Mapa de Marte</button>
        <button className="boton" onClick={() => j.abrir('historial')}>Historial</button>
        <button className="boton secundario" onClick={j.volverInicio}>Volver al inicio</button>
      </div>
    </Modal>
  );
}

const fechaCorta = (iso) => new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
const COLOR = { verde: 'var(--barra-verde)', amarillo: 'var(--barra-amarillo)', rojo: 'var(--barra-rojo)' };

export function PanelGuardar({ modo }) {
  const j = useJuego();
  const [, refrescar] = useState(0);
  const [confirmar, setConfirmar] = useState(null);
  const guardando = modo === 'guardar';
  const ranuras = guardando ? RANURAS.filter((n) => n > 0) : RANURAS;

  const accion = (n) => {
    const ocupada = leerRanura(n);
    if (guardando && ocupada && confirmar !== n) { setConfirmar(n); return; }
    if (guardando) { j.guardar(n); setConfirmar(null); refrescar((x) => x + 1); } else j.cargar(n);
  };

  return (
    <Modal titulo={guardando ? 'Guardar partida' : 'Cargar partida'} onCerrar={j.cerrarOverlay}>
      {ranuras.map((n) => {
        const r = leerRanura(n);
        return (
          <div key={n} className="ranura">
            <div>
              <strong>{n === 0 ? 'Autoguardado' : `Ranura ${n}`}</strong>
              {r ? (
                <>
                  <div>Capítulo {r.capitulo}: {r.titulo}{r.estado.nombre ? ` · ${r.estado.nombre}` : ''}</div>
                  <div className="mini-barras" aria-hidden="true">
                    {BARRAS.map((b) => <span key={b} style={{ background: COLOR[colorBarra(b, r.estado[b])] }} />)}
                  </div>
                  <div className="provisional">{fechaCorta(r.fecha)}</div>
                </>
              ) : <div className="provisional">Vacía</div>}
            </div>
            <button className={`boton ${confirmar === n ? 'peligro' : ''}`} disabled={!guardando && !r} onClick={() => accion(n)}>
              {guardando ? (confirmar === n ? '¿Sobrescribir? Sí' : 'Guardar aquí') : 'Cargar'}
            </button>
          </div>
        );
      })}
      {!guardando && <p className="provisional">Al cargar vuelves a la misma línea con las mismas barras.</p>}
    </Modal>
  );
}

export function Historial() {
  const j = useJuego();
  return (
    <Modal titulo="Historial" onCerrar={j.cerrarOverlay}>
      {j.historial.length === 0 && <p>Todavía no hay líneas leídas en esta sesión.</p>}
      <ol style={{ paddingLeft: '1.2em' }}>
        {j.historial.map((h, i) => <li key={i}><strong>{h.quien === 'Narración' ? '' : `${h.quien}: `}</strong>{h.texto}</li>)}
      </ol>
    </Modal>
  );
}
