// Dibuja los componentes principales en Node (Vite SSR + react-dom/server) para atrapar errores que el
// build no ve: variables que no existen, propiedades de null, etc. Si un panel revienta aquí, revienta en el navegador.
// Uso: node tools/probar-render.mjs
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = await createServer({ root: raiz, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

try {
  const { React, renderToString } = await vite.ssrLoadModule('/tools/render-react.js');
  const { JuegoProvider, JuegoContext, useJuego } = await vite.ssrLoadModule('/src/juego/JuegoContext.jsx');
  const { nuevaPartida } = await vite.ssrLoadModule('/src/engine/motor.js');
  const h = React.createElement;
  const cargar = async (ruta) => vite.ssrLoadModule(ruta);

  /** Dibuja `hijo` con el contexto real del juego, cambiando solo lo que diga `cambios`. */
  const dibujar = (hijo, cambios = {}) => {
    function Cambiar({ children }) {
      const j = useJuego();
      return h(JuegoContext.Provider, { value: { ...j, ...cambios } }, children);
    }
    return renderToString(h(JuegoProvider, null, h(Cambiar, null, hijo)));
  };
  const probar = (nombre, fn) => {
    try { const html = fn(); ok(typeof html === 'string', nombre); return html; }
    catch (e) { ok(false, `${nombre}: ${e.message}`); return ''; }
  };

  const enJuego = (pronombre) => ({ pantalla: 'juego', partida: { ...nuevaPartida(), escena: 'c03_01', capitulo: 3, hud: true, nombre: 'Alex', pronombre } });

  const App = (await cargar('/src/App.jsx')).default;
  probar('App en la pantalla de inicio', () => dibujar(h(App)));

  const Guia = (await cargar('/src/componentes/Guia.jsx')).default;
  const { PESTANAS } = await cargar('/src/componentes/Guia.jsx');
  for (const p of PESTANAS ?? []) {
    probar(`Guía · ${p} · sin partida`, () => dibujar(h(Guia, { pestanaInicial: p })));
    for (const pr of ['el', 'ella', 'elle']) probar(`Guía · ${p} · en juego (${pr})`, () => dibujar(h(Guia, { pestanaInicial: p }), enJuego(pr)));
  }

  const Z = await cargar('/src/componentes/Zinnia.jsx');
  probar('Panel de Zinn-IA sin partida', () => dibujar(h(Z.PanelZinnia)));
  probar('Panel de Zinn-IA en juego', () => dibujar(h(Z.PanelZinnia), enJuego('ella')));
  probar('Aviso sin conexión', () => dibujar(h(Z.SinConexion), { conectado: false }));

  const P = await cargar('/src/componentes/Pantallas.jsx');
  probar('Créditos', () => dibujar(h(P.Creditos)));
  probar('Menú del juego', () => dibujar(h(P.MenuJuego), enJuego('el')));
  probar('Panel Cargar', () => dibujar(h(P.PanelGuardar, { modo: 'cargar' })));
  const HUD = (await cargar('/src/componentes/HUD.jsx')).default;
  probar('HUD en juego', () => dibujar(h(HUD), enJuego('elle')));
  const Escena = (await cargar('/src/componentes/Escena.jsx')).default;
  probar('Escena en juego', () => dibujar(h(Escena), enJuego('ella')));

  // Canción del cap. 1 y "esperarGuia"
  const enEscena = (escena, pronombre) => ({ pantalla: 'juego', partida: { ...nuevaPartida(), escena, capitulo: 1, hud: true, nombre: 'Alex', pronombre } });
  for (const pr of ['el', 'ella', 'elle']) probar(`Escena de la canción (c01_04, ${pr})`, () => dibujar(h(Escena), enEscena('c01_04', pr)));
  probar('Escena esperarGuia (c01_04b)', () => dibujar(h(HUD), enEscena('c01_04b', 'elle')) + dibujar(h(Escena), enEscena('c01_04b', 'elle')));
  const hudEspera = dibujar(h(HUD), enEscena('c01_04b', 'ella'));
  ok(hudEspera.includes('parpadeo-guia'), 'en esperarGuia el libro parpadea');
  ok(!dibujar(h(HUD), { ...enEscena('c01_04b', 'ella'), guiaAbiertaEn: 'c01_04b' }).includes('parpadeo-guia'), 'al abrir la Guía deja de parpadear');
  ok(!dibujar(h(HUD), enEscena('c01_05', 'ella')).includes('parpadeo-guia'), 'fuera de esperarGuia el libro no parpadea');

  // Guía (docs/guia_supervivencia.md): partes, subtítulos, citas [n] como enlace a su fuente y sin marcas sueltas
  const reglas = dibujar(h(Guia, { pestanaInicial: 'reglas' }), enJuego('ella'));
  ok(reglas.includes('Parte 1. ') && reglas.includes('<h4') && reglas.includes('llegas con vida'), 'Guía · Parte 1: título, subtítulos y "llegas con vida"');
  const mapa = dibujar(h(Guia, { pestanaInicial: 'mapa' }));
  ok(/<a class="cita" href="https:\/\/www\.uahirise\.org\/ESP_039384_1085"[^>]*>\[<!-- -->16<!-- -->\]<\/a>/.test(mapa) || /class="cita" href="https:\/\/www\.uahirise\.org\/ESP_039384_1085"/.test(mapa), 'Guía · Parte 2: la cita [16] enlaza a HiRISE');
  const inicioGuia = dibujar(h(Guia));
  ok(inicioGuia.includes('tecla <strong>Z</strong>') && inicioGuia.includes('memoria de Zinn-IA'), 'Guía abre en "Cómo leer esta guía" con el atajo Z de Zinn-IA');
  const refs = dibujar(h(Guia, { pestanaInicial: 'referencias' }));
  ok((refs.match(/href="https?:/g) || []).length >= 59, 'Guía · Referencias: las 59 fuentes con enlace');
  for (const pr of [null, 'el', 'ella', 'elle']) {
    const todo = PESTANAS.filter((p) => !['Fichas', 'Capas del mapa', 'Recursos NASA', 'Glosario completo', 'Fuentes'].includes(p))
      .map((p) => dibujar(h(Guia, { pestanaInicial: p }), pr ? enJuego(pr) : {})).join('');
    ok(!/\{[^{}<]*\|/.test(todo) && !/\*\*/.test(todo), `Guía completa${pr ? ` (${pr})` : ' sin partida'}: sin marcas {o|a|e} ni ** sueltas`);
  }

  // Solo computadora
  const { PantallaSoloComputadora } = await cargar('/src/componentes/SoloComputadora.jsx');
  const aviso = probar('Pantalla de solo computadora', () => dibujar(h(PantallaSoloComputadora)));
  ok(aviso.includes('/guia.html') && aviso.includes('pantalla más grande'), 'el aviso enlaza a guia.html');
} finally {
  await vite.close();
}

if (fallos) { console.log(`\n❌ ${fallos} componente(s) revientan al dibujarse`); process.exit(1); }
console.log('\n✅ Render: todos los paneles se dibujan sin errores');
