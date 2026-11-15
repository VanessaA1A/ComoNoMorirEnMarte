// Prueba de diseño en un navegador real (Chrome sin ventana, protocolo DevTools; no necesita Playwright).
// Recorre el tutorial del cap. 3 (c03_02 y c03_03, todas sus líneas), la decisión c03_04, el cap. 4 con el minimapa
// y un final, en 1366×768, 1536×864, 1920×1080 y 2560×1440. Falla si el panel de barras, el reloj, el minimapa,
// el cuadro de diálogo o las opciones se superponen, si el texto del diálogo se desborda, si hay franjas a los lados
// si el minimapa muestra botones, coordenadas o créditos, o si el globo de texto tapa al astronauta.
// Uso: node tools/probar-diseno.mjs <url> [chrome] [carpeta-capturas]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = process.argv[2] ?? 'http://localhost:4179/';
const chrome = process.argv[3] ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const salida = process.argv[4] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'cache', 'diseno');
mkdirSync(salida, { recursive: true });
const TAMANOS = [[1366, 768], [1536, 864], [1920, 1080], [2560, 1440]];
const perfil = path.join(os.tmpdir(), `cnmm-diseno-${process.pid}`);
const p = spawn(chrome, ['--headless=new', `--user-data-dir=${perfil}`, '--remote-debugging-port=9348', 'about:blank']);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; for (let i = 0; i < 40 && !ws; i++) { await esperar(250); try { ws = (await (await fetch('http://127.0.0.1:9348/json')).json()).find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const s = new WebSocket(ws); await new Promise((r) => (s.onopen = r));
let id = 0; const pend = new Map(); const errores = [];
s.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description?.slice(0, 160)); pend.get(d.id)?.(d.result); };
const cdp = (method, params = {}) => new Promise((r) => { pend.set(++id, r); s.send(JSON.stringify({ id, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
const foto = async (n) => writeFileSync(path.join(salida, `${n}.png`), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
let fallos = 0; let revisadas = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log(`✗ ${msg}`); } };

const MEDIR = `(() => {
  const W = innerWidth, H = innerHeight;
  const caja = (sel) => { const e = document.querySelector(sel); if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
  const c = { barras: caja('.hud'), reloj: caja('.reloj'), minimapa: caja('.minimapa-real') ?? caja('.tablet-escena'), dialogo: caja('.dialogo'), opciones: caja('.opciones') };
  const pisa = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
  const nombres = Object.keys(c); const choques = [];
  for (let i = 0; i < nombres.length; i++) for (let k = i + 1; k < nombres.length; k++) if (pisa(c[nombres[i]], c[nombres[k]])) choques.push(nombres[i] + '/' + nombres[k]);
  const d = document.querySelector('.dialogo');
  const esc = document.querySelector('.escenario')?.getBoundingClientRect();
  const mapa = document.querySelector('.minimapa-real, .tablet-escena');
  const visible = (sel) => [...(mapa?.querySelectorAll(sel) ?? [])].some((e) => e.getBoundingClientRect().width > 0);
  const fuera = Object.entries(c).filter(([, v]) => v && (v.l < -1 || v.t < -1 || v.r > W + 1 || v.b > H + 1)).map(([k]) => k);
  const im = document.querySelector('.personaje-astro img'); let astroTapado = 0;
  if (im && d && im.naturalWidth) { const b = im.getBoundingClientRect(); const k = Math.min(b.width / im.naturalWidth, b.height / im.naturalHeight); const w = im.naturalWidth * k, h = im.naturalHeight * k; const dd = d.getBoundingClientRect();
    const l = b.left + (b.width - w) / 2, r = l + w, t = b.bottom - h; if (Math.min(r, dd.right) > Math.max(l, dd.left)) astroTapado = Math.max(0, Math.round(Math.min(b.bottom, dd.bottom) - Math.max(t, dd.top))); }
  return { astroTapado, choques, fuera, desborde: d ? d.scrollHeight > d.clientHeight + 2 : false, franjas: esc ? Math.round(W - esc.width) + Math.round(H - esc.height) : null,
    extrasEnMapa: ['.mapa-iconos button', '.mapa-coords', '.leaflet-control-attribution'].filter(visible), mapaAncho: mapa ? Math.round(mapa.getBoundingClientRect().width) : null,
    texto: d?.textContent?.slice(0, 40) ?? '' };
})()`;

const revisar = async (donde) => {
  const r = await js(MEDIR); revisadas++;
  ok(!r.choques.length, `${donde}: se superponen ${r.choques.join(', ')}`);
  ok(!r.fuera.length, `${donde}: se sale de la ventana ${r.fuera.join(', ')}`);
  ok(!r.desborde, `${donde}: el texto del diálogo se desborda ("${r.texto}…")`);
  ok(r.franjas === 0, `${donde}: franjas a los lados o arriba/abajo (${r.franjas} px)`);
  ok(r.astroTapado <= 2, `${donde}: el globo de texto tapa al astronauta (${r.astroTapado} px)`);
  ok(!r.extrasEnMapa.length, `${donde}: el minimapa muestra ${r.extrasEnMapa.join(', ')}`);
  return r;
};

await cdp('Page.enable'); await cdp('Runtime.enable');
for (const [w, h] of TAMANOS) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: base }); await esperar(2500);
  await js(`localStorage.clear(); localStorage.setItem('cnmm_tutorial_vistos', JSON.stringify(['avanzar-texto','barras','reloj','decisiones','icono-zinnia','menu-guardar','minimapa-capas','mapa-marte','azar','barra-roja','ficha-nueva','sin-conexion']))`);
  await cdp('Page.navigate', { url: base }); await esperar(2000);
  await js(`[...document.querySelectorAll('button')].find((b) => /^Empezar/.test(b.textContent.trim()))?.click()`); await esperar(1500);
  const plantilla = await js(`localStorage.getItem('cnmm_ranura_0')`);
  const ir = async (escena, cap) => {
    const g = JSON.parse(plantilla); Object.assign(g.estado, { escena, capitulo: cap, hud: true, nombre: 'Alex', pronombre: 'ella' }); Object.assign(g, { escena, capitulo: cap, linea: 0 });
    await js(`localStorage.setItem('cnmm_ranura_0', ${JSON.stringify(JSON.stringify(g))})`);
    await cdp('Page.navigate', { url: base }); await esperar(2000);
    await js(`[...document.querySelectorAll('button')].find((b) => /^Continuar/.test(b.textContent.trim()))?.click()`); await esperar(1200);
    await js(`document.querySelector('.tarjeta-continuar')?.click()`); await esperar(2500);
  };
  const t = `${w}x${h}`;
  // Tutorial del cap. 3: c03_02 → c03_03 → c03_04 (decisión), línea por línea
  await ir('c03_02', 3);
  for (let paso = 0; paso < 16; paso++) {
    await js(`document.querySelector('.tutorial button')?.click()`); // cierra la burbuja del tutorial si aparece
    const r = await revisar(`${t} tutorial cap. 3, paso ${paso + 1}`);
    if (paso === 0) await foto(`${t}_c03_tutorial_capa`);
    if (await js(`Boolean(document.querySelector('.opciones .opcion'))`)) break;
    await js(`document.querySelector('.dialogo')?.click()`); await esperar(250);
    await js(`document.querySelector('.dialogo')?.click()`); await esperar(450);
  }
  await foto(`${t}_c03_decision`);
  await ir('c04_02', 4); await revisar(`${t} cap. 4 con minimapa`); await foto(`${t}_c04_minimapa`);
  await ir('c08_caida', 8); await revisar(`${t} cap. 8, caída`); await foto(`${t}_c08_caida`);
  await ir('final_bueno', 10); await revisar(`${t} final bueno`); await foto(`${t}_final_bueno`);
}
console.log(errores.length ? `✗ errores en la página: ${errores.join(' | ')}` : '✓ sin errores en la página');
if (errores.length) fallos++;
s.close(); p.kill();
console.log(fallos ? `\n❌ Diseño: ${fallos} problema(s) en ${revisadas} pantallas revisadas` : `\n✅ Diseño: ${revisadas} pantallas en 4 tamaños sin superposiciones, sin desbordes, sin franjas y minimapa solo con el mapa`);
process.exit(fallos ? 1 : 0);
