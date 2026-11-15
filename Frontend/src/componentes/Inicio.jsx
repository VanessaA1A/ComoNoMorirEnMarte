// Pantalla de Inicio (ZA-12): logo arriba, partida a la izquierda, tripulación al centro,
// exploración a la derecha y franja del hackathon abajo. Navegación por estado (JuegoContext).
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useJuego } from '../juego/JuegoContext.jsx';
import { leerRanura } from '../juego/partidas.js';
import Recurso from './Recurso.jsx';
import { Astronauta } from './Personajes.jsx';

function BotonGrande({ titulo, detalle, className = '', ...resto }) {
  return (
    <button className={`boton boton-grande ${className}`} {...resto}>
      <span className="boton-titulo">{titulo}</span>
      {detalle && <span className="boton-detalle">{detalle}</span>}
    </button>
  );
}

export default function Inicio() {
  const j = useJuego();
  const [confirmar, setConfirmar] = useState(false);
  const auto = leerRanura(0);

  // Empezar: si ya hay autoguardado, pedir confirmación antes de reemplazarlo.
  const alEmpezar = () => (auto ? setConfirmar(true) : j.empezar());

  // Cerrar la confirmación con la tecla Escape.
  useEffect(() => {
    if (!confirmar) return;
    const alTeclear = (e) => { if (e.key === 'Escape') setConfirmar(false); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [confirmar]);

  return (
    <div className="inicio">
      <header className="inicio-cabecera">
        <Recurso
          src="/img/NombrePaginaTitulo.png"
          alt="Cómo no morir en Marte"
          className="logo-nombre"
          respaldo={<h1 className="titulo-texto">Cómo no morir en Marte</h1>}
        />
      </header>

      <div className="inicio-cuerpo">
        <nav className="inicio-col partida" aria-label="Partida">
          <BotonGrande className="principal" titulo="Empezar" detalle="Nueva misión desde el despegue" onClick={alEmpezar} autoFocus />
          <BotonGrande
            titulo="Continuar"
            detalle={auto ? `Capítulo ${auto.capitulo}${auto.titulo ? ` · ${auto.titulo}` : ''}` : 'Aún no hay partida guardada'}
            disabled={!auto}
            onClick={() => j.cargar(0)}
          />
          <BotonGrande titulo="Cargar" detalle="3 ranuras + autoguardado" onClick={() => j.abrir('cargar')} />
        </nav>

        <figure className="consola" aria-label="Tripulación: Zinn-IA y el astronauta">
          <div className="consola-barra" aria-hidden="true">
            <span className="luz" /><span className="luz" /><span className="luz" />
            <span className="consola-etiqueta">Tripulación · Aurora-1</span>
          </div>
          <div className="consola-escena">
            <img src="/img/zinnia_multiexpresion.webp" alt="Zinn-IA, tu guía de supervivencia" className="pixel zinnia-principal" draggable={false} />
            <Astronauta pose="saludando" className="pixel astronauta-inicio" />
          </div>
          <div className="consola-teclas" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
          </div>
        </figure>

        <nav className="inicio-col explorar" aria-label="Explorar">
          <BotonGrande className="secundario-borde" titulo="Mapa de Marte" detalle="Aterrizajes reales y destinos" onClick={() => j.abrir('mapaMarte')} />
          <BotonGrande className="secundario-borde" titulo="Guía" detalle="Reglas, capas, fichas y fuentes" onClick={() => j.abrir('guia')} />
          {/* Página independiente: se lee e imprime en cualquier pantalla, también en celular */}
          <a className="boton boton-grande secundario-borde" href="/guia.html" target="_blank" rel="noopener">
            <span className="boton-titulo">Guía de supervivencia</span>
            <span className="boton-detalle">Para leer o imprimir · pestaña nueva</span>
          </a>
          <BotonGrande className="secundario-borde" titulo="Créditos" detalle="Equipo y fuentes NASA/JPL" onClick={() => j.setPantalla('creditos')} />
        </nav>
      </div>

      <footer className="inicio-pie">
        <div className="estado-sistema" role="status">
          <img src="/img/zinnia_estatica.gif" alt="" className="pixel zinnia-estatica" draggable={false} />
          <span>{j.conectado ? 'Sistema en línea' : 'Sin señal con la Tierra · modo local'}</span>
        </div>
        <div className="pie-textos">
          <span className="pie-evento">NASA Space Apps Challenge - Sede Managua 2026</span>
          <span className="pie-leyenda">Incluye ilustraciones hechas a mano</span>
        </div>
      </footer>

      {confirmar && createPortal(
        // Velo a pantalla completa (difumina todo) con el cuadro centrado. Clic afuera = cancelar.
        // Se monta directo en <body> para que ningún estilo del inicio lo empuje hacia abajo.
        <div
          className="confirmar-velo"
          onClick={() => setConfirmar(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'grid', placeItems: 'center', padding: '1em',
            background: 'rgba(10, 2, 20, .55)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            fontSize: 'clamp(13px, 1.25vw, 18px)',
          }}
        >
          <div
            className="modal confirmar-caja"
            style={{ width: 'min(92%, 40em)', maxHeight: '90%' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="boton-icono cerrar" aria-label="Cerrar" onClick={() => setConfirmar(false)}>✕</button>
            <h2 id="titulo-confirmar">¿De verdad quieres reiniciar?</h2>
            <p className="texto-ui">Ya tienes una partida en el autoguardado. Si empiezas otra, el autoguardado se reemplaza (tus ranuras manuales no se tocan).</p>
            <div className="lista-botones">
              <button className="boton principal" onClick={() => { setConfirmar(false); j.empezar(); }} autoFocus>Sí, empezar de nuevo</button>
              <button className="boton" onClick={() => setConfirmar(false)}>Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}