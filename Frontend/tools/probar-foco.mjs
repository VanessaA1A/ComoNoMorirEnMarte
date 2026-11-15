// Después de abrir y cerrar una ventana desde la escena (minimapa, ☰, 📖, 🌍, ícono de Zinn-IA), Espacio y
// Enter tienen que seguir avanzando el diálogo. Antes, el foco volvía al botón que abrió la ventana y
// Espacio la volvía a abrir: el jugador quedaba atrapado y "no lo dejaba jugar".
// Simula lo que hace el navegador: Espacio o Enter sobre un botón enfocado lo pulsa, salvo que el juego lo impida.
// Uso: node tools/probar-foco.mjs
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const vite = await createServer({ root: raiz, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });

const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', { url: 'http://localhost/?forzar=1', pretendToBeVisual: true });
const w = dom.window;
for (const k of Object.getOwnPropertyNames(w)) if (!(k in globalThis)) { try { globalThis[k] = w[k]; } catch { /* solo lectura */ } }
Object.assign(globalThis, { window: w, document: w.document, localStorage: w.localStorage, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, KeyboardEvent: w.KeyboardEvent, MouseEvent: w.MouseEvent });
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
Object.defineProperty(w.navigator, 'onLine', { value: false, configurable: true });
w.matchMedia = globalThis.matchMedia = (q) => ({ matches: /pointer: fine|prefers-reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = w.fetch = async () => { throw new TypeError('sin red en la prueba'); };

try {
  const { React, act, createRoot } = await vite.ssrLoadModule('/tools/render-dom.js');
  const { JuegoProvider, useJuego } = await vite.ssrLoadModule('/src/juego/JuegoContext.jsx');
  const { Escenario } = await vite.ssrLoadModule('/src/App.jsx');
  const { nuevaPartida } = await vite.ssrLoadModule('/src/engine/motor.js');
  const { escribirRanura } = await vite.ssrLoadModule('/src/juego/partidas.js');
  const h = React.createElement;
  let j = null;
  function Sonda() { j = useJuego(); return null; }
  const root = createRoot(document.getElementById('raiz'));
  await act(async () => { root.render(h(JuegoProvider, null, h(Sonda), h(Escenario))); });

  const esperar = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));
  const hacer = (f) => act(async () => { f(); });
  const $ = (sel) => document.querySelector(sel);
  /** Tecla como en el navegador: keydown en el elemento enfocado; si nadie la impide y es un botón, se pulsa. */
  const pulsar = (key) => hacer(() => {
    const a = document.activeElement ?? document.body;
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    if (!ev.defaultPrevented && a.tagName === 'BUTTON') a.click();
  });
  const completo = () => ($('.dialogo span[aria-hidden]')?.textContent.length ?? 0) >= ($('.dialogo .oculto-lector')?.textContent.length ?? 0);
  const abierto = () => j.overlay?.tipo ?? (j.panelZinnia ? 'panelZinnia' : null);

  // Escena del capítulo 4 con minimapa y HUD
  escribirRanura(1, { ...nuevaPartida(), escena: 'c04_01', capitulo: 4, hud: true, nombre: 'Alex', pronombre: 'ella' }, 0, 0);
  await hacer(() => j.cargar(1));
  await hacer(() => j.cerrarTarjeta?.());
  await hacer(() => j.saltarTutorial?.());
  await esperar(50);
  ok(Boolean($('.minimapa')) && Boolean($('.zona-dialogo .dialogo')), 'escena del capítulo 4 con minimapa y diálogo');

  const DISPARADORES = [
    ['minimapa', '.minimapa', 'mapaRuta'],
    ['botón ☰ (menú)', '[aria-label="Menú (Esc)"]', 'menu'],
    ['botón 📖 (Guía)', '[aria-label="Guía de supervivencia"]', 'guia'],
    ['botón 🌍 (Mapa de Marte)', '[aria-label="Mapa de Marte"]', 'mapaMarte'],
    ['ícono de Zinn-IA', '.icono-zinnia', 'panelZinnia'],
  ];
  for (const [nombre, sel, tipo] of DISPARADORES) {
    for (const [cierre, cerrar] of [
      ['con ✕', () => [...document.querySelectorAll('.velo .cerrar, .cajon .cajon-cabecera .boton-icono')].pop()?.click()],
      ['con Esc', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))],
    ]) {
      const boton = $(sel);
      if (!boton) { ok(false, `${nombre}: no está en la escena`); continue; }
      await hacer(() => { boton.focus(); boton.click(); }); // clic con el mouse: el navegador enfoca el botón
      await esperar(30);
      ok(abierto() === tipo, `${nombre}: abre ${tipo}`);
      await hacer(cerrar); await esperar(30);
      ok(abierto() === null, `${nombre}: se cierra ${cierre}`);
      ok(document.activeElement !== boton, `${nombre} (${cierre}): el foco NO vuelve al botón que abrió la ventana`);
      for (const key of [' ', 'Enter']) {
        for (let n = 0; n < 3 && !completo(); n++) await pulsar(key); // completa el texto si se estaba escribiendo
        const antes = j.linea;
        await pulsar(key); await esperar(30);
        ok(abierto() === null && j.linea !== antes, `${nombre} (${cierre}): ${key === ' ' ? 'Espacio' : 'Enter'} avanza el diálogo y no reabre la ventana (línea ${antes} → ${j.linea})`);
        if (j.overlay || j.panelZinnia) await hacer(() => { j.cerrarOverlay(); j.abrirPanelZinnia(false); });
      }
      // volver al inicio de la escena para tener líneas por delante
      escribirRanura(1, { ...nuevaPartida(), escena: 'c04_01', capitulo: 4, hud: true, nombre: 'Alex', pronombre: 'ella' }, 0, 0);
      await hacer(() => j.cargar(1)); await hacer(() => j.cerrarTarjeta?.()); await esperar(30);
    }
  }

  // Desde el menú, el foco SÍ vuelve dentro del menú (ventana abierta desde otra ventana)
  const { debeVolverFoco } = await vite.ssrLoadModule('/src/componentes/Modal.jsx');
  const dialogo = document.createElement('div'); dialogo.setAttribute('role', 'dialog');
  const b = document.createElement('button'); dialogo.append(b); document.body.append(dialogo);
  ok(debeVolverFoco(b) === true && debeVolverFoco($('.minimapa')) === false, 'si la ventana se abrió desde otra ventana (menú), el foco vuelve a esa ventana; desde la escena, no');
  dialogo.remove();

  await act(async () => root.unmount());
} catch (e) {
  ok(false, `la prueba reventó: ${e.stack?.split('\n').slice(0, 4).join(' | ')}`);
} finally {
  await vite.close();
}

if (fallos) { console.log(`\n❌ ${fallos} prueba(s) de foco fallaron`); process.exit(1); }
console.log('\n✅ Foco: después de cerrar cualquier ventana, Espacio y Enter siguen el juego');
process.exit(0);
