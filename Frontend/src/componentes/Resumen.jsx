import { useJuego } from '../juego/JuegoContext.jsx';
import { formatoReloj, ETIQUETA } from './HUD.jsx';
import { BARRAS, colorBarra } from '../engine/reglas.js';
import { formatear } from '../engine/texto.js';
import ZinniaAvatar from './ZinniaAvatar.jsx';

const TITULO = { bueno: 'Volviste a casa', intermedio: 'Te quedas en Marte', malo: 'No sobreviviste a Marte' };
const SELLO = { bueno: 'Misión cumplida', intermedio: 'Misión incompleta', malo: 'Misión fallida' };

// Qué capa o dato del mapa habría cambiado el resultado, según la causa
const LECCION = {
  exito: 'Usaste bien el mapa: cada capa te ayudó a decidir. ¿Te animas a buscar las 3 muestras la próxima vez?',
  tiempo: 'El reloj también es una barra de vida. La capa Relieve (MOLA) muestra qué caminos son más cortos, y cada muestra o desvío cuesta minutos.',
  rescate: 'Caminar con traje gasta muchísima energía. Las raciones, la ración extra del viaje y el depósito de suministros estaban ahí por algo.',
  radiacion: 'La capa Radiación y clima (RAD y REMS de Curiosity) avisa de los eventos solares. Revisarla en el mirador y buscar refugio a tiempo cuida tu dosis.',
  oxigeno: 'Cada atajo, caída y desvío gasta oxígeno. Las capas Relieve (MOLA) y Terreno (THEMIS) muestran qué caminos cuestan menos.',
  integridad: 'Las crestas de 1 a 2 metros y las pendientes se ven en Óptica (HiRISE) y Relieve (MOLA). Rodearlas cuesta tiempo, pero protege el traje.',
};

// Nombre completo para el reporte (en la barra de arriba se usan versiones cortas)
const NOMBRE_VITAL = { oxigeno: 'Oxígeno', bateria: 'Batería', alimentacion: 'Comida', integridad: 'Traje', radiacion: 'Radiación' };
const ESTADO = { verde: 'Estable', amarillo: 'Atención', rojo: 'Crítico' };
const ESTADO_RADIACION = { verde: 'Baja', amarillo: 'Media', rojo: 'Alta' };

function Vital({ clave, valor }) {
  const color = colorBarra(clave, valor);
  const estado = clave === 'radiacion' ? ESTADO_RADIACION[color] : ESTADO[color];
  return (
    <div className={`vital ${color}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor}
      aria-label={`${NOMBRE_VITAL[clave] ?? ETIQUETA[clave]}: ${valor} de 100, ${estado}`}>
      <span className="vital-nombre">{NOMBRE_VITAL[clave] ?? ETIQUETA[clave]}</span>
      <span className="vital-valor">{valor}<small>/100</small></span>
      <span className="vital-riel"><span style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} /></span>
      <span className="vital-estado">{estado}</span>
    </div>
  );
}

export default function Resumen() {
  const j = useJuego();
  const p = j.partida;
  const { final, causa } = p.final;
  const decisiones = (p.decisiones ?? []).filter((d) => !/^c01_02$/.test(d.escena)).slice(-8);
  const muestras = p.muestras.length;
  const tarde = p.minutos < 0;
  return (
    <div className="velo">
      <div className={`modal ancho resumen ${final}`} role="dialog" aria-modal="true" aria-labelledby="titulo-final">
        <header className="cabecera-final">
          {/* Final bueno: tranquila y contenta; intermedio o malo: llora (despedida) */}
          <div className="zinnia-celebra"><ZinniaAvatar expresion={final === 'bueno' ? 'normal' : 'llorona'} /></div>
          <div className="reporte-titulos">
            <span className="reporte-kicker">Reporte de misión · Aurora-1</span>
            <h1 id="titulo-final" className="titulo-final">{TITULO[final]}</h1>
            <p className="reporte-sub texto-ui">{formatear('{nombre}, así terminó tu caminata por el cráter Gale.', p)}</p>
          </div>
          <span className="reporte-sello">{SELLO[final]}</span>
        </header>

        <section aria-labelledby="titulo-vitales">
          <h3 id="titulo-vitales" className="reporte-seccion">Signos vitales al final</h3>
          <div className="vitales">
            {BARRAS.map((b) => <Vital key={b} clave={b} valor={p[b]} />)}
            <div className={`vital ${tarde ? 'rojo' : p.minutos < 30 ? 'amarillo' : 'verde'}`}>
              <span className="vital-nombre">Reloj</span>
              <span className="vital-valor reloj-valor">{formatoReloj(p.minutos)}</span>
              <span className="vital-estado">{tarde ? 'Llegaste tarde' : p.minutos < 30 ? 'Justo a tiempo' : 'Tiempo de sobra'}</span>
            </div>
            <div className={`vital ${muestras === 3 ? 'verde' : muestras ? 'amarillo' : 'rojo'}`} aria-label={`Muestras: ${muestras} de 3`}>
              <span className="vital-nombre">Muestras</span>
              <span className="vital-valor">{muestras}<small>/3</small></span>
              <span className="muestras-puntos" aria-hidden="true">
                {[0, 1, 2].map((i) => <i key={i} className={i < muestras ? 'lleno' : ''} />)}
              </span>
              <span className="vital-estado">{muestras === 3 ? 'Colección completa' : 'Faltaron muestras'}</span>
            </div>
          </div>
        </section>

        <div className="reporte-cuerpo">
          <section aria-labelledby="titulo-bitacora">
            <h3 id="titulo-bitacora" className="reporte-seccion">Bitácora de decisiones</h3>
            <ol className="bitacora">
              {decisiones.map((d, i) => <li key={i}><span className="bitacora-n">{String(i + 1).padStart(2, '0')}</span>{formatear(d.opcion, p)}</li>)}
            </ol>
          </section>
          <section aria-labelledby="titulo-leccion" className="reporte-leccion">
            <h3 id="titulo-leccion" className="reporte-seccion">Lo que el mapa te diría</h3>
            <div className="burbuja texto-ui">{LECCION[causa]}</div>
            <div className="reporte-botones">
              <button className="boton principal" onClick={j.volverInicio} autoFocus>Volver al inicio</button>
              <button className="boton" onClick={() => j.abrir('guia')}>Ver la Guía</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}