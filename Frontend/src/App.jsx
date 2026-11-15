import { JuegoProvider, useJuego } from './juego/JuegoContext.jsx';
import Escena from './componentes/Escena.jsx';
import TarjetaCapitulo from './componentes/TarjetaCapitulo.jsx';
import Resumen from './componentes/Resumen.jsx';
import Guia from './componentes/Guia.jsx';
import Inicio from './componentes/Inicio.jsx';
import { Creditos, MenuJuego, PanelGuardar, Historial } from './componentes/Pantallas.jsx';
import { MapaRuta, MapaMarte, poiActual } from './componentes/Mapas.jsx';
import { Modal } from './componentes/Modal.jsx';
import { PanelZinnia, Tutorial, SinConexion, Avisos } from './componentes/Zinnia.jsx';
import { usePuedeJugar, PantallaSoloComputadora } from './componentes/SoloComputadora.jsx';

function Overlay() {
  const j = useJuego();
  const enJuego = j.pantalla === 'juego' ? j.partida : null;
  switch (j.overlay?.tipo) {
    case 'menu': return <MenuJuego />;
    case 'guardar': return <PanelGuardar modo="guardar" />;
    case 'cargar': return <PanelGuardar modo="cargar" />;
    case 'historial': return <Historial />;
    case 'guia': return <Guia pestanaInicial={j.overlay.pestana} />;
    case 'mapaRuta':
      return (
        <Modal titulo="Mapa de la ruta · tablet de Zinn-IA" onCerrar={j.cerrarOverlay} ancho>
          <MapaRuta modo="completo" capa={j.capa} setCapa={j.setCapa} capas={j.catalogo.capas} pois={j.catalogo.pois}
            poi={poiActual(enJuego)} apagado={Boolean(enJuego && enJuego.bateria <= 0)} />
        </Modal>
      );
    case 'mapaMarte':
      return (
        <Modal titulo="Mapa de Marte" onCerrar={j.cerrarOverlay} ancho>
          <MapaMarte fichas={j.fichas} enMarte={Boolean(enJuego && enJuego.capitulo >= 3)} onGale={() => j.abrir('mapaRuta')} />
        </Modal>
      );
    default: return null;
  }
}

function Escenario() {
  const j = useJuego();
  const enJuego = j.pantalla === 'juego' && j.partida;
  return (
    <main className="escenario">
      {(j.pantalla === 'inicio' || j.pantalla === 'creditos') && <Inicio />}
      {j.pantalla === 'creditos' && <Creditos />}
      {enJuego && <Escena />}
      {enJuego && j.tarjeta && <TarjetaCapitulo numero={j.tarjeta} />}
      {enJuego && j.resumen && <Resumen />}
      <Overlay />
      <Avisos />
      <SinConexion />
      <PanelZinnia />
      {!(enJuego && j.tarjeta) && <Tutorial />}
    </main>
  );
}

export default function App() {
  // Solo computadora: en celular o ventana chica se muestra el aviso. El JuegoProvider sigue montado,
  // así que al agrandar la ventana el juego vuelve sin perder la partida.
  const puedeJugar = usePuedeJugar();
  return (
    <JuegoProvider bloqueado={!puedeJugar}>
      {puedeJugar ? <Escenario /> : <PantallaSoloComputadora />}
    </JuegoProvider>
  );
}
