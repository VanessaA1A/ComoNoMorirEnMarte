// Ventana de Zinn-IA "disponible siempre": en un DOM real (jsdom) abre y cierra la ventana en cada pantalla
// (inicio, aviso sin conexión, tarjeta de capítulo, escena, minimapa, mapa de Marte, mapa de la ruta, Guía,
// guardar, cargar, final y batería en 0) con clic, X, Esc y tecla Z, y comprueba que el ESTADO DEL MOTOR
// (partida, línea, pantalla, overlay, tarjeta, resumen) queda exactamente igual. También: pausa del texto,
// foco en el campo, historial que sobrevive al cerrar, acciones desde cualquier pantalla y modo semilla.
// Uso: node tools/probar-ventana-zinnia.mjs
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

const vite = await createServer({ root: raiz, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });

// ---------- navegador simulado: computadora (?forzar=1), SIN red y con la API configurada (para el aviso sin conexión) ----------
const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', { url: 'http://localhost/?forzar=1', pretendToBeVisual: true });
const w = dom.window;
for (const k of Object.getOwnPropertyNames(w)) if (!(k in globalThis)) { try { globalThis[k] = w[k]; } catch { /* propiedad de solo lectura */ } }
Object.assign(globalThis, { window: w, document: w.document, localStorage: w.localStorage, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, KeyboardEvent: w.KeyboardEvent, MouseEvent: w.MouseEvent });
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
Object.defineProperty(w.navigator, 'onLine', { value: false, configurable: true });
w.matchMedia = globalThis.matchMedia = (q) => ({ matches: /pointer: fine/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.CNMM_API_URL = 'http://api.prueba/api'; // API configurada pero sin red: el aviso "Sin señal" aparece
globalThis.fetch = w.fetch = async () => { throw new TypeError('sin red en la prueba'); };

try {
  const { React, act, createRoot } = await vite.ssrLoadModule('/tools/render-dom.js');
  const { JuegoProvider, useJuego } = await vite.ssrLoadModule('/src/juego/JuegoContext.jsx');
  const { Escenario } = await vite.ssrLoadModule('/src/App.jsx');
  const { nuevaPartida } = await vite.ssrLoadModule('/src/engine/motor.js');
  const { escribirRanura } = await vite.ssrLoadModule('/src/juego/partidas.js');
  const { ejecutarAccion } = await vite.ssrLoadModule('/src/componentes/Zinnia.jsx');
  const chat = await vite.ssrLoadModule('/src/juego/zinniaChat.js');
  const h = React.createElement;

  let j = null;
  function Sonda() { j = useJuego(); return null; }
  const raizDom = document.getElementById('raiz');
  const root = createRoot(raizDom);
  await act(async () => { root.render(h(JuegoProvider, null, h(Sonda), h(Escenario))); });

  const esperar = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));
  const hacer = (f) => act(async () => { f(); });
  const $ = (sel) => document.querySelector(sel);
  const tecla = (key, destino = document.body) => hacer(() => destino.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
  const clic = (el) => hacer(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const estadoMotor = () => JSON.stringify({ partida: j.partida, linea: j.linea, pantalla: j.pantalla, overlay: j.overlay, tarjeta: j.tarjeta, resumen: j.resumen });
  const abierta = () => Boolean($('.panel-zinnia'));

  /** Abre y cierra la ventana de 4 maneras y comprueba que el estado del motor no cambia. */
  async function probarPantalla(nombre, { semilla = false } = {}) {
    const antes = estadoMotor();
    ok(Boolean($('.icono-zinnia')), `${nombre}: el ícono de Zinn-IA está visible`);
    // 1) clic en el ícono → abre; foco en el campo (o en "Abrir la Guía" en modo semilla)
    await clic($('.icono-zinnia'));
    await esperar(5);
    ok(abierta(), `${nombre}: un clic en el ícono abre la ventana`);
    const enfocado = document.activeElement;
    ok(semilla ? enfocado?.textContent === 'Abrir la Guía' : enfocado?.id === 'chat-texto', `${nombre}: el foco va ${semilla ? 'al botón "Abrir la Guía"' : 'al campo de texto'} (${enfocado?.id || enfocado?.textContent || enfocado?.tagName})`);
    ok(Boolean($('.icono-zinnia')), `${nombre}: con la ventana abierta el ícono sigue a mano`);
    // 2) otro clic en el ícono → cierra
    await clic($('.icono-zinnia'));
    ok(!abierta(), `${nombre}: otro clic la cierra`);
    // 3) tecla Z abre; Esc cierra (y Esc NO cierra el mapa/Guía/menú que estaba debajo)
    await tecla('z');
    ok(abierta(), `${nombre}: la tecla Z la abre`);
    await tecla('Escape');
    ok(!abierta(), `${nombre}: Esc la cierra`);
    // 4) Z abre; la X la cierra
    await tecla('Z');
    await clic($('.panel-zinnia button[aria-label="Cerrar (Esc)"]'));
    ok(!abierta(), `${nombre}: la X la cierra`);
    ok(estadoMotor() === antes, `${nombre}: el estado del motor queda igual (partida, línea, overlay, tarjeta, resumen)`);
  }

  // ---------- 1. Inicio con el aviso "Sin señal con la Tierra" ----------
  await esperar(20);
  ok(Boolean($('.sin-conexion')), 'aviso sin conexión en pantalla');
  await probarPantalla('Aviso sin conexión');
  await clic([...document.querySelectorAll('.sin-conexion button')].find((b) => /Seguir sin conexión/.test(b.textContent)));
  ok(j.colaTutorial.length > 0, 'al seguir sin conexión, Zinn-IA explica el modo sin conexión (paso del tutorial)');
  await hacer(() => j.saltarTutorial()); // durante un paso del tutorial la Z no actúa: el tutorial ES Zinn-IA hablando

  // ---------- 2. Inicio (antes de empezar) + acción desde cualquier pantalla ----------
  ok(j.pantalla === 'inicio' && !$('.sin-conexion'), 'pantalla de inicio');
  await probarPantalla('Inicio');
  await hacer(() => ejecutarAccion(j, { tipo: 'abrir_capa', id: 'relieve' }));
  ok(j.overlay?.tipo === 'mapaRuta' && j.capa === 'relieve', 'acción abrir_capa desde el inicio: abre el mapa en esa capa');
  await hacer(() => j.cerrarOverlay());

  // ---------- 3. Empezar: tarjeta de capítulo y escena (antes de elegir pronombre) ----------
  await hacer(() => j.empezar());
  await hacer(() => j.saltarTutorial());
  ok(j.tarjeta === 1, 'tarjeta del capítulo 1');
  await probarPantalla('Tarjeta de capítulo');
  await hacer(() => j.cerrarTarjeta());
  await hacer(() => j.saltarTutorial());
  await probarPantalla('Escena c01_01 (sin pronombre)');

  // ---------- 4. Escena del capítulo 5 con minimapa + pausa del texto ----------
  const cap5 = { ...nuevaPartida(), escena: 'c05_02', capitulo: 5, hud: true, nombre: 'Alex', pronombre: 'elle' };
  escribirRanura(1, cap5, 0, 0);
  await hacer(() => j.cargar(1));
  await hacer(() => j.saltarTutorial());
  ok(Boolean($('.minimapa')), 'escena del capítulo 5 con minimapa');
  await probarPantalla('Escena + minimapa (cap. 5)');
  const letras = () => $('.dialogo span[aria-hidden]')?.textContent.length ?? 0;
  await clic($('.icono-zinnia'));
  const conVentana = letras(); await esperar(250);
  ok(letras() === conVentana, `con la ventana abierta el texto no avanza (${conVentana} → ${letras()} letras)`);
  await tecla('Escape');
  await esperar(250);
  ok(letras() > conVentana, `al cerrarla el texto sigue desde la misma letra (${conVentana} → ${letras()})`);

  // Historial: un mensaje sigue ahí después de cerrar y volver a abrir
  await act(async () => { await chat.enviar('¿Qué es MOLA?', { partida: j.partida, fichas: j.fichas }); });
  await clic($('.icono-zinnia'));
  ok($('.chat-historial')?.textContent.includes('¿Qué es MOLA?') && /MOLA/.test($('.chat-historial .chat-zinnia-msg')?.textContent ?? ''), 'el historial se conserva al cerrar y abrir la ventana');
  ok(/Modo sin conexión/.test($('.indicador-ia')?.textContent ?? ''), 'sin red, el indicador dice "Modo sin conexión" (punto gris)');
  ok(Boolean($('#chat-texto[maxlength="500"]')) && Boolean($('label[for="chat-texto"]')) && Boolean($('.chat-sugerencias[role="group"]')), 'campo de 500 caracteres con etiqueta y sugerencias con aria');
  ok([...document.querySelectorAll('.chat-sugerencia')].some((b) => b.textContent === 'Cuéntame un chiste malo'), 'sugerencia "Cuéntame un chiste malo"');
  await tecla('Escape');

  // ---------- 5. Overlays: mapa de Marte, mapa de la ruta, Guía, guardar y cargar ----------
  for (const [nombre, tipo] of [['Mapa de Marte', 'mapaMarte'], ['Mapa de la ruta', 'mapaRuta'], ['Guía', 'guia'], ['Guardar', 'guardar'], ['Cargar', 'cargar'], ['Menú', 'menu']]) {
    await hacer(() => j.abrir(tipo));
    await probarPantalla(nombre);
    ok(j.overlay?.tipo === tipo, `${nombre}: sigue abierto debajo después de usar la ventana`);
    await hacer(() => j.cerrarOverlay());
  }

  // ---------- 6. Batería en 0: modo semilla ----------
  escribirRanura(2, { ...cap5, bateria: 0 }, 0, 0);
  await hacer(() => j.cargar(2));
  await probarPantalla('Batería en 0', { semilla: true });
  await clic($('.icono-zinnia'));
  ok(Boolean($('.semilla')) && !$('#chat-texto') && /Batería en cero: no puedo pensar bien\. Busca en la Guía o cambia la batería\./.test($('.semilla').textContent), 'batería en 0: modo semilla, sin preguntas libres y con su mensaje');
  await clic([...document.querySelectorAll('.semilla button')].find((b) => b.textContent === 'Abrir la Guía'));
  ok(j.overlay?.tipo === 'guia', 'modo semilla: "Abrir la Guía" abre la Guía');
  await hacer(() => j.cerrarOverlay());

  // ---------- 7. Pantalla de final ----------
  escribirRanura(3, { ...cap5, escena: 'final_bueno', capitulo: 10, final: { final: 'bueno', causa: 'exito' } }, 0, 0);
  await hacer(() => j.cargar(3));
  await hacer(() => j.setResumen(true));
  ok(Boolean($('.resumen')), 'pantalla de final (resumen)');
  await probarPantalla('Final');

  await act(async () => root.unmount());
} catch (e) {
  ok(false, `la prueba reventó: ${e.stack?.split('\n').slice(0, 4).join(' | ')}`);
} finally {
  await vite.close();
}

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) de la ventana de Zinn-IA fallaron`); process.exit(1); }
console.log('\n✅ Ventana de Zinn-IA: disponible en todas las pantallas sin tocar el estado del motor');
process.exit(0);
