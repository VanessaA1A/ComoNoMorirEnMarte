// Fuentes de la cartografía real (las genera tools/preparar-cartografia/preparar.py en public/cartografia/fuentes.json).
// Va dentro del bundle para que Créditos y la Guía las muestren también sin conexión.
import FUENTES from '../../public/cartografia/fuentes.json';
import { Enlace } from './Mapas.jsx';

export default function FuentesCartografia() {
  return (
    <div className="fuentes-cartografia">
      <p>{FUENTES.zona.descripcion}.</p>
      <ul className="fuente">
        {FUENTES.archivos.map((a) => (
          <li key={a.archivo}>
            <strong>{a.archivo}</strong>: {a.producto} · {a.instrumento} · {a.resolucion} · {a.fecha_producto} · {a.cita} · <Enlace url={a.url} />
          </li>
        ))}
      </ul>
    </div>
  );
}
