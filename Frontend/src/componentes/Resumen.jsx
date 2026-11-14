import { useJuego } from '../juego/JuegoContext.jsx';
import { Barras, formatoReloj } from './HUD.jsx';
import { formatear } from '../engine/texto.js';
import { ZinnIA } from './Personajes.jsx';

const TITULO = { bueno: 'Volviste a casa', intermedio: 'Te quedas en Marte', malo: 'No sobreviviste a Marte' };

// Qué capa o dato del mapa habría cambiado el resultado, según la causa
const LECCION = {
  exito: 'Usaste bien el mapa: cada capa te ayudó a decidir. ¿Te animas a buscar las 3 muestras la próxima vez?',
  tiempo: 'El reloj también es una barra de vida. La capa Relieve (MOLA) muestra qué caminos son más cortos, y cada muestra o desvío cuesta minutos.',
  rescate: 'Caminar con traje gasta muchísima energía. Las raciones, la ración extra del viaje y el depósito de suministros estaban ahí por algo.',
  radiacion: 'La capa Radiación y clima (RAD y REMS de Curiosity) avisa de los eventos solares. Revisarla en el mirador y buscar refugio a tiempo cuida tu dosis.',
  oxigeno: 'Cada atajo, caída y desvío gasta oxígeno. Las capas Relieve (MOLA) y Terreno (THEMIS) muestran qué caminos cuestan menos.',
  integridad: 'Las crestas de 1 a 2 metros y las pendientes se ven en Óptica (HiRISE) y Relieve (MOLA). Rodearlas cuesta tiempo, pero protege el traje.',
};

export default function Resumen() {
  const j = useJuego();
  const p = j.partida;
  const { final, causa } = p.final;
  const decisiones = (p.decisiones ?? []).filter((d) => !/^c01_02$/.test(d.escena)).slice(-8);
  return (
    <div className="velo">
      <div className={`modal ancho resumen ${final}`} role="dialog" aria-modal="true" aria-labelledby="titulo-final">
        <div className="cabecera-final">
          {final === 'bueno' && <div className="zinnia-celebra"><ZinnIA expresion="inicio" /></div>}
          <h1 id="titulo-final" className="titulo-final">{TITULO[final]}</h1>
        </div>
        <div className="rejilla">
          <div>
            <h3>Cómo quedaron tus barras</h3>
            <div className="hud" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}><Barras estado={p} /></div>
            <p>Reloj: {formatoReloj(p.minutos)} · Muestras: {p.muestras.length} de 3</p>
            <h3>Qué capa habría cambiado el resultado</h3>
            <p>{LECCION[causa]}</p>
          </div>
          <div>
            <h3>Tus decisiones clave</h3>
            <ol>{decisiones.map((d, i) => <li key={i}>{formatear(d.opcion, p)}</li>)}</ol>
          </div>
        </div>
        <div className="lista-botones" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <button className="boton principal" onClick={j.volverInicio}>Volver al inicio</button>
          <button className="boton" onClick={() => j.abrir('guia')}>Ver la Guía</button>
        </div>
      </div>
    </div>
  );
}
