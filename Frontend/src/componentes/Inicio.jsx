// Pantalla de Inicio (ZA-12): logo arriba, partida a la izquierda, tripulación al centro,
// exploración a la derecha y franja del hackathon abajo. Navegación por estado (JuegoContext).
import { useState } from 'react';
import { useJuego } from '../juego/JuegoContext.jsx';
import { leerRanura } from '../juego/partidas.js';
import { Modal } from './Modal.jsx';
import Recurso from './Recurso.jsx';

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
  const srcTitulo = '/img/NombrePaginaTitulo.png';
  const respaldoTitulo = <h1 className="titulo-texto">Cómo no morir en Marte</h1>;

  const alEmpezar = () => (auto ? setConfirmar(true) : j.empezar());

  return (
    <div className="inicio">
      <header className="inicio-cabecera">
        <Recurso src={srcTitulo} alt="Cómo no morir en Marte" className="logo-nombre" respaldo={respaldoTitulo} />
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
            <img src="/img/zinnia_multiexpresion.gif" alt="Zinn-IA, tu guía de supervivencia" className="pixel zinnia-principal" draggable={false} />
            <img src="/img/astronauta_prototipo.png" alt="El astronauta" className="pixel astronauta-inicio" draggable={false} />
          </div>
          <div className="consola-teclas" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
          </div>
        </figure>

        <nav className="inicio-col explorar" aria-label="Explorar">
          <BotonGrande className="secundario-borde" titulo="Mapa de Marte" detalle="Aterrizajes reales y destinos" onClick={() => j.abrir('mapaMarte')} />
          <BotonGrande className="secundario-borde" titulo="Guía" detalle="Reglas, capas, fichas y fuentes" onClick={() => j.abrir('guia')} />
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

      {confirmar && (
        <Modal titulo="¿Seguro que quieres reiniciar?" onCerrar={() => setConfirmar(false)}>
          <p className="texto-ui">Ya tienes una partida en el autoguardado. Si empiezas otra, el autoguardado se reemplaza (tus ranuras manuales no se tocan).</p>
          <div className="lista-botones">
            <button className="boton principal" onClick={() => { setConfirmar(false); j.empezar(); }}>Sí, empezar de nuevo</button>
            <button className="boton" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
