// Zinn-IA con "menos movimiento" (prefers-reduced-motion: reduce), en un DOM real (jsdom):
// se ve igual (mismas imágenes y misma expresión), pero sin parpadeo y con cambio de expresión instantáneo (sin fundido).
// Sin la preferencia: sí parpadea y el cambio tiene fundido.
// Uso: node tools/probar-menos-movimiento.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;
for (const k of Object.getOwnPropertyNames(w)) if (!(k in globalThis)) { try { globalThis[k] = w[k]; } catch { /* solo lectura */ } }
Object.assign(globalThis, { window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let reducir = false; // lo que "pide el sistema" en cada parte de la prueba
w.matchMedia = globalThis.matchMedia = (q) => ({ matches: /prefers-reduced-motion: reduce/.test(q) && reducir, media: q, addEventListener() {}, removeEventListener() {} });

// El parpadeo espera 3 a 6 s al azar: con azar = 0 espera 3 s exactos
const azarReal = Math.random;
Math.random = () => 0;

// La regla CSS: con menos movimiento, las capas no tienen transición
const css = fs.readFileSync(path.join(raiz, 'src/estilos.css'), 'utf8');
ok(/span\.zinnia-avatar\.sin-fundido > img\.capa \{ transition: none; \}/.test(css), 'CSS: .sin-fundido quita la transición de las capas');
ok(/@media \(prefers-reduced-motion: reduce\) \{ span\.zinnia-avatar > img\.capa \{ transition: none; \} \}/.test(css), 'CSS: @media prefers-reduced-motion también la quita (antes de que cargue el JavaScript)');
ok(/span\.zinnia-avatar > img\.capa:not\(\.base\) \{ opacity: 0; transition: opacity/.test(css), 'CSS: sin la preferencia, el cambio tiene fundido');

const vite = await createServer({ root: raiz, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { React, act, createRoot } = await vite.ssrLoadModule('/tools/render-dom.js');
  const ZinniaAvatar = (await vite.ssrLoadModule('/src/componentes/ZinniaAvatar.jsx')).default;
  const h = React.createElement;
  const esperar = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));

  /** Monta a Zinn-IA, anota cada expresión visible durante `ms` y la cambia a seria. */
  async function observar(menos) {
    reducir = menos;
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    const root = createRoot(caja);
    await act(async () => { root.render(h(ZinniaAvatar, { expresion: 'normal' })); });
    const avatar = () => caja.querySelector('.zinnia-avatar');
    // act agrupa los cambios hasta que termina: se espera en pasos de 50 ms y se mira la expresión después de cada uno
    const vistas = new Set([avatar().dataset.expresion]);
    for (let t = 0; t < 3400; t += 50) { await esperar(50); vistas.add(avatar().dataset.expresion); } // pasa el primer parpadeo (3 s + 150 ms)
    const capas = [...caja.querySelectorAll('img.capa')].map((i) => i.getAttribute('src')).sort();
    const clase = avatar().className;
    await act(async () => { root.render(h(ZinniaAvatar, { expresion: 'seria' })); });
    const trasCambio = avatar().dataset.expresion; // en el mismo render, sin esperar
    const visibles = [...caja.querySelectorAll('img.capa.visible')].map((i) => i.getAttribute('src'));
    await act(async () => root.unmount());
    caja.remove();
    return { vistas, capas, clase, trasCambio, visibles };
  }

  const normal = await observar(false);
  const menos = await observar(true);

  ok(normal.vistas.has('ojos-cerrados'), 'sin la preferencia: parpadea (pasa por ojos-cerrados)');
  ok(!normal.clase.includes('sin-fundido'), 'sin la preferencia: el cambio de expresión tiene fundido');
  ok(!menos.vistas.has('ojos-cerrados') && menos.vistas.size === 1, 'con menos movimiento: no parpadea (siempre normal)');
  ok(menos.clase.includes('sin-fundido'), 'con menos movimiento: cambio de expresión instantáneo (clase sin-fundido)');
  ok(JSON.stringify(menos.capas) === JSON.stringify(normal.capas) && menos.capas.length === 6, 'con menos movimiento se ve igual: las mismas 6 imágenes');
  ok(menos.trasCambio === 'seria' && menos.visibles.join() === '/zinnia/seria.png', 'con menos movimiento: la expresión nueva se ve en el mismo instante');
  ok(![...menos.capas, ...normal.capas].some((s) => /isotipo|logotipo|logo/.test(s)), 'en ningún caso usa el logotipo');
} finally {
  Math.random = azarReal;
  await vite.close();
}

if (fallos) { console.log(`\n${fallos} prueba(s) de menos movimiento fallaron`); process.exit(1); }
console.log('\nMenos movimiento: Zinn-IA igual, sin parpadeo y sin fundido');
