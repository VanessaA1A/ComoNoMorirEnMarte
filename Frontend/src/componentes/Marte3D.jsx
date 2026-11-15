// Marte en 3D (three.js) con datos REALES:
// - Globo: mosaico global Viking MDIM 2.1 (NASA/USGS, vía Mars Trek), aterrizajes con fuente oficial (marte.json) y Gale
//   (USGS Gazetteer, Feature 2071: −5,44°, 137,70° E). Clic en un punto → su ficha.
// - Región de Gale: malla del DEM 1 m de USGS (Parker y Calef, 2016) remuestreada a 512 × 512 vértices (~5,9 m), con la
//   ortofoto HiRISE de USGS encima, la ruta del juego (ruta_real.json), la ruta real de Curiosity (PDS PLACES) y las paradas.
// No cambia ningún estado del juego. Si no hay WebGL, muestra un aviso amable y el mapa 2D.
import { useEffect, useRef, useState } from 'react';
import MARTE from '../data/marte.json';
import * as C from '../juego/cartografia.js';
import MALLA from '../../public/cartografia/relieve_malla.json';
import { MapaCompleto } from './MapaReal.jsx';

const GALE = { id: 'gale', nombre: 'Cráter Gale', lat: -5.44, lon: 137.70, dato: 'Cráter de 155,3 km de diámetro; en su centro está Aeolis Mons (Mount Sharp). Aquí está la zona boxwork del juego.', fuente: 'https://planetarynames.wr.usgs.gov/Feature/2071', fuente_nombre: 'USGS Gazetteer of Planetary Nomenclature' };
const PUNTOS_GLOBO = [...MARTE.aterrizajes, ...MARTE.destinos].filter((p) => !p.pendiente && p.fuente);
const COLOR_PUNTO = { base: 0x01efac, parada: 0x0cd3b6, muestra: 0xcaff95, deposito: 0xfa932e, peligro: 0xdd2811 };
const COLOR_TRAMO = { principal: 0x01efac, alternativa: 0xfa932e, peligro: 0xdd2811 };
const TEXTURAS = [
  { id: 'optica', corto: 'Ortofoto', archivo: 'ortofoto_3d.jpg', nombre: 'Ortofoto HiRISE (USGS, Calef y Parker 2016)' },
  { id: 'relieve', corto: 'Sombreado', archivo: 'sombreado.png', nombre: 'Sombreado del relieve real (DEM 1 m USGS)' },
  { id: 'pendiente', corto: 'Pendiente', archivo: 'pendiente.png', nombre: 'Pendiente: < 15°, 15–23°, > 23° (umbrales de Curiosity)' },
];

export const hayWebGL = () => {
  try { const c = document.createElement('canvas'); return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
};

/** lat/lon → vector del globo (radio 1), con la misma convención que la textura (columna 0 = 180° O). */
function enGlobo(THREE, lat, lon, r = 1) {
  const fi = ((C.lon180(lon) + 180) * Math.PI) / 180; const te = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(te) * Math.cos(fi), r * Math.cos(te), r * Math.sin(te) * Math.sin(fi));
}

export default function Marte3D({ vistaInicial = 'globo', poi = null }) {
  const contenedor = useRef(null);
  const motor = useRef(null);
  const [webgl] = useState(() => (typeof window === 'undefined' ? true : hayWebGL()));
  const [vista, setVista] = useState(vistaInicial);
  const [ficha, setFicha] = useState(null);
  const [exag, setExag] = useState(2);
  const [textura, setTextura] = useState('optica');
  const [verRuta, setVerRuta] = useState(true);
  const [verCuriosity, setVerCuriosity] = useState(true);
  const [girar, setGirar] = useState(false);
  const [error, setError] = useState(null);
  const [capa2d, setCapa2d] = useState('optica'); // capa del mapa 2D de respaldo (sin WebGL)

  // ---------- motor (una vez) ----------
  useEffect(() => {
    if (!webgl || !contenedor.current) return undefined;
    let vivo = true; let cuadro = 0;
    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      if (!vivo) return;
      const div = contenedor.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(div.clientWidth, div.clientHeight);
      div.appendChild(renderer.domElement);
      const escena = new THREE.Scene(); escena.background = new THREE.Color(0x0a0214);
      const camara = new THREE.PerspectiveCamera(45, div.clientWidth / div.clientHeight, 0.01, 100000);
      const controles = new OrbitControls(camara, renderer.domElement);
      controles.enableDamping = true;
      escena.add(new THREE.AmbientLight(0xffffff, 0.9));
      const sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(-3, 2, 4); escena.add(sol);
      const cargador = new THREE.TextureLoader();
      const tex = (archivo) => { const t = cargador.load(`${C.BASE}/${archivo}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
      const recursos = [];

      // Globo
      const globo = new THREE.Group();
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: tex('globo_viking.jpg'), roughness: 1 }));
      globo.add(esfera); recursos.push(esfera);
      const pines = [];
      for (const p of [...PUNTOS_GLOBO, GALE]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(p === GALE ? 0.022 : 0.015, 12, 12), new THREE.MeshBasicMaterial({ color: p === GALE ? 0x01efac : p.anio ? 0x2082a6 : 0xfa932e }));
        m.position.copy(enGlobo(THREE, p.lat, p.lon, 1.005)); m.userData = { ficha: p }; globo.add(m); pines.push(m); recursos.push(m);
      }

      // Región de Gale
      const region = new THREE.Group(); region.visible = false;
      const lado = MALLA.vertices[0]; const L = MALLA.lado_m;
      const datos = new Uint16Array(await (await fetch(`${C.BASE}/relieve_malla.bin`)).arrayBuffer());
      const alturas = Float32Array.from(datos, (v) => MALLA.altura_min_m + v * MALLA.escala_m);
      const hMed = (MALLA.altura_min_malla_m + MALLA.altura_max_malla_m) / 2;
      // Malla con paso 1, 2 o 4 (512, 256 o 128 vértices por lado): calidad adaptativa según los FPS
      let paso = 1; let nLado = lado; let hMalla = alturas;
      const crearMalla = (k) => {
        paso = k; nLado = Math.floor((lado - 1) / k) + 1; hMalla = new Float32Array(nLado * nLado);
        for (let r = 0; r < nLado; r++) for (let c = 0; c < nLado; c++) hMalla[r * nLado + c] = alturas[(r * k) * lado + c * k];
        const g = new THREE.PlaneGeometry(L, L, nLado - 1, nLado - 1); g.rotateX(-Math.PI / 2); return g;
      };
      let geo = crearMalla(1);
      const mats = Object.fromEntries(TEXTURAS.map((t) => [t.id, new THREE.MeshStandardMaterial({ map: tex(t.archivo), roughness: 1, transparent: t.id === 'pendiente' })]));
      const terreno = new THREE.Mesh(geo, mats.optica); region.add(terreno); recursos.push(terreno, ...Object.values(mats));
      const altura = (x, y) => { // x, y en metros locales (desde la esquina NO)
        const c = Math.min(lado - 1, Math.max(0, Math.round((x / L) * (lado - 1)))); const r = Math.min(lado - 1, Math.max(0, Math.round((y / L) * (lado - 1))));
        return alturas[r * lado + c];
      };
      const enRegion = (lat, lon, sobre = 2) => { const { x, y } = C.aLocal(lat, lon); return new THREE.Vector3(x - L / 2, (altura(x, y) - hMed + sobre), y - L / 2); };
      const rutaJuego = new THREE.Group(); const rutaCuriosity = new THREE.Group(); const marcas = [];
      for (const t of C.TRAMOS) {
        const g = new THREE.BufferGeometry().setFromPoints(t.linea.map(([lon, lat]) => enRegion(lat, lon, 3)));
        rutaJuego.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: COLOR_TRAMO[C.tipoTramo(t.id)] })));
      }
      for (const p of C.PARADAS) {
        const m = new THREE.Mesh(new THREE.ConeGeometry(9, 26, 12), new THREE.MeshBasicMaterial({ color: COLOR_PUNTO[p.tipo] ?? 0xffffff }));
        m.rotation.x = Math.PI; m.userData = { ficha: p, sobre: 18, lat: p.lat, lon: p.lon }; rutaJuego.add(m); marcas.push(m);
      }
      fetch(`${C.BASE}/curiosity_ruta.geojson`).then((r) => r.json()).then((g) => {
        const pts = g.features[1].geometry.coordinates.filter(([lon, lat]) => { const { x, y } = C.aLocal(lat, lon); return x >= 0 && y >= 0 && x <= L && y <= L; });
        rutaCuriosity.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([lon, lat]) => enRegion(lat, lon, 2))), new THREE.LineBasicMaterial({ color: 0xffe5c9 })));
        motor.current?.aplicarExag?.();
      }).catch(() => {});
      region.add(rutaJuego, rutaCuriosity);
      escena.add(globo, region);

      const aplicarExag = () => {
        const e = motor.current?.exag ?? 2;
        const pos = geo.attributes.position;
        for (let k = 0; k < pos.count; k++) pos.setY(k, (hMalla[k] - hMed) * e);
        pos.needsUpdate = true; geo.computeVertexNormals();
        for (const ln of [...rutaJuego.children, ...rutaCuriosity.children]) {
          if (!ln.isLine) continue;
          const a = ln.geometry.attributes.position;
          if (!ln.userData.base) ln.userData.base = Float32Array.from(a.array);
          for (let k = 0; k < a.count; k++) {
            const x = ln.userData.base[k * 3] + L / 2; const y = ln.userData.base[k * 3 + 2] + L / 2;
            a.setY(k, (altura(x, y) - hMed) * e + 3);
          }
          a.needsUpdate = true;
        }
        for (const m of marcas) { const v = enRegion(m.userData.lat, m.userData.lon, 0); m.position.set(v.x, v.y * e + m.userData.sobre, v.z); }
      };

      const verGlobo = () => {
        region.visible = false; globo.visible = true; controles.minDistance = 1.2; controles.maxDistance = 8;
        const v = enGlobo(THREE, GALE.lat, GALE.lon, 3.2); camara.position.copy(v); camara.near = 0.01; camara.far = 100; camara.updateProjectionMatrix(); controles.target.set(0, 0, 0);
      };
      const verRegion = (centro) => {
        globo.visible = false; region.visible = true; controles.minDistance = 80; controles.maxDistance = 6000;
        camara.near = 1; camara.far = 50000; camara.updateProjectionMatrix();
        const p = centro ? enRegion(centro.lat, centro.lon, 0) : new THREE.Vector3(0, 0, 0);
        controles.target.copy(p); camara.position.set(p.x - 600, p.y + 1300, p.z + 1700);
      };

      // Clic → ficha
      const rayo = new THREE.Raycaster(); const raton = new THREE.Vector2();
      const alClic = (ev) => {
        const r = renderer.domElement.getBoundingClientRect();
        raton.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        rayo.setFromCamera(raton, camara);
        const golpe = rayo.intersectObjects(globo.visible ? pines : marcas, false)[0];
        if (!golpe) return;
        const f = golpe.object.userData.ficha;
        if (f === GALE) { setFicha(f); setVista('region'); } else setFicha(f);
      };
      renderer.domElement.addEventListener('click', alClic);
      const alTeclear = (e) => {
        const paso = globo.visible ? 0.05 : 60;
        if (e.key === '+' || e.key === '=') { camara.position.lerp(controles.target, 0.15); } else if (e.key === '-') { camara.position.sub(controles.target).multiplyScalar(1.15).add(controles.target); } else if (e.key === 'ArrowLeft') controles.target.x -= paso; else if (e.key === 'ArrowRight') controles.target.x += paso; else if (e.key === 'ArrowUp') controles.target.z -= paso; else if (e.key === 'ArrowDown') controles.target.z += paso; else return;
        e.preventDefault();
      };
      renderer.domElement.tabIndex = 0; renderer.domElement.addEventListener('keydown', alTeclear);
      const alCambiarTamano = () => { camara.aspect = div.clientWidth / div.clientHeight; camara.updateProjectionMatrix(); renderer.setSize(div.clientWidth, div.clientHeight); };
      window.addEventListener('resize', alCambiarTamano);

      // FPS (para el informe): promedio de los últimos 60 cuadros
      let t0 = performance.now(); let n = 0; let ultimoAjuste = Date.now();
      const animar = () => {
        cuadro = requestAnimationFrame(animar);
        controles.update(); renderer.render(escena, camara);
        n += 1; const t = performance.now();
        if (t - t0 > 1000) {
          const fps = Math.round((n * 1000) / (t - t0)); if (motor.current) motor.current.fps = fps; div.dataset.fps = fps; t0 = t; n = 0;
          // Calidad adaptativa: menos de 25 FPS → primero resolución 1×, luego malla más gruesa (256 y 128 vértices)
          if (fps < 25 && region.visible && Date.now() - ultimoAjuste > 2500) {
            ultimoAjuste = Date.now();
            if (renderer.getPixelRatio() > 1) renderer.setPixelRatio(1);
            else if (paso < 4) { const vieja = geo; geo = crearMalla(paso * 2); terreno.geometry = geo; vieja.dispose(); aplicarExag(); }
            div.dataset.malla = `${nLado}x${nLado}`;
          }
        }
      };
      motor.current = { THREE, renderer, escena, camara, controles, globo, region, terreno, mats, rutaJuego, rutaCuriosity, verGlobo, verRegion, aplicarExag, exag, recursos, alClic, alTeclear, alCambiarTamano, fps: 0 };
      aplicarExag();
      if (vistaInicial === 'region') verRegion(poi && C.parada(poi)); else verGlobo();
      animar();
    })().catch((e) => { console.warn('[3D]', e); setError(e.message); });
    return () => {
      vivo = false; cancelAnimationFrame(cuadro);
      const m = motor.current; if (!m) return;
      m.renderer.domElement.removeEventListener('click', m.alClic); m.renderer.domElement.removeEventListener('keydown', m.alTeclear);
      window.removeEventListener('resize', m.alCambiarTamano);
      m.escena.traverse((o) => { o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; mats.forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
      Object.values(m.mats).forEach((x) => { x.map?.dispose?.(); x.dispose(); });
      m.controles.dispose(); m.renderer.dispose(); m.renderer.forceContextLoss?.(); m.renderer.domElement.remove();
      motor.current = null; // libera la memoria de WebGL al cerrar
    };
  }, [webgl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- reacciones a los controles ----------
  useEffect(() => { const m = motor.current; if (!m) return; if (vista === 'region') m.verRegion(poi && C.parada(poi)); else m.verGlobo(); }, [vista]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const m = motor.current; if (!m) return; m.exag = exag; m.aplicarExag(); }, [exag]);
  useEffect(() => { const m = motor.current; if (!m) return; m.terreno.material = m.mats[textura]; }, [textura]);
  useEffect(() => { const m = motor.current; if (!m) return; m.rutaJuego.visible = verRuta; }, [verRuta]);
  useEffect(() => { const m = motor.current; if (!m) return; m.rutaCuriosity.visible = verCuriosity; }, [verCuriosity]);
  useEffect(() => { const m = motor.current; if (!m) return; m.controles.autoRotate = girar; }, [girar]);
  const zoom = (f) => { const m = motor.current; if (!m) return; m.camara.position.sub(m.controles.target).multiplyScalar(f).add(m.controles.target); };

  if (!webgl || error) {
    return (
      <div className="marte3d-sin-webgl">
        <p className="burbuja">Tu navegador no puede mostrar el 3D (no tiene WebGL activado). No pasa nada: aquí tienes el mapa 2D con los mismos datos reales.</p>
        <MapaCompleto poi={poi} capa={capa2d} setCapa={setCapa2d} />
      </div>
    );
  }
  const atrib = vista === 'globo'
    ? 'Viking MDIM 2.1 · NASA/USGS (Mars Trek) · aterrizajes: NASA NSSDC, PDS PLACES, NASA MMGIS · Gale: USGS Gazetteer'
    : `Relieve: DEM 1 m USGS (Parker y Calef, 2016), malla de ${MALLA.vertices[0]} × ${MALLA.vertices[1]} (~${MALLA.m_entre_vertices} m) · ${TEXTURAS.find((t) => t.id === textura)?.nombre} · Ruta de Curiosity: PDS PLACES`;
  return (
    <div className="marte3d">
      <div ref={contenedor} className="marte3d-lienzo" aria-label={vista === 'globo' ? 'Globo 3D de Marte' : 'Terreno 3D de la zona boxwork de Gale'} />
      <div className="mapa-iconos marte3d-controles" role="group" aria-label="Controles del 3D">
        <button title="Girar sola" aria-pressed={girar} onClick={() => setGirar(!girar)}>Girar</button>
        <button title="Acercar (+)" onClick={() => zoom(0.8)}>+</button>
        <button title="Alejar (−)" onClick={() => zoom(1.25)}>−</button>
        {vista === 'region'
          ? <button title="Volver al globo" onClick={() => setVista('globo')}>Globo</button>
          : <button title="Ver la zona de Gale en 3D" onClick={() => setVista('region')}>Gale 3D</button>}
        {vista === 'region' && (
          <>
            {TEXTURAS.map((t) => <button key={t.id} title={t.nombre} aria-pressed={textura === t.id} onClick={() => setTextura(t.id)}>{t.corto}</button>)}
            {[1, 2, 3].map((e) => <button key={e} title={`Exageración vertical ×${e}`} aria-pressed={exag === e} onClick={() => setExag(e)}>×{e}</button>)}
            <button title="Ruta del juego" aria-pressed={verRuta} onClick={() => setVerRuta(!verRuta)}>Ruta</button>
            <button title="Ruta real de Curiosity (PDS PLACES)" aria-pressed={verCuriosity} onClick={() => setVerCuriosity(!verCuriosity)}>Curiosity</button>
          </>
        )}
      </div>
      {vista === 'region' && <div className="marte3d-exag">relieve ×{exag}{exag === 1 ? ' (real)' : ''}</div>}
      <p className="marte3d-atrib">{atrib} · arrastra para girar, rueda para acercar, flechas y +/− con el teclado</p>
      {ficha && (
        <div className="ficha-capa marte3d-ficha" role="dialog" aria-label={`Ficha: ${ficha.nombre ?? ficha.mision}`}>
          <button className="boton-icono" onClick={() => setFicha(null)} aria-label="Cerrar la ficha">✕</button>
          <h3>{ficha.id && ficha.terreno ? `${ficha.id} · ${ficha.nombre}` : ficha.mision ? `${ficha.anio} · ${ficha.mision}` : ficha.nombre}</h3>
          {ficha.lugar && <p>{ficha.lugar}</p>}
          <p>{C.fmtLat(ficha.lat)}, {C.fmtLon(ficha.lon)}</p>
          <p>{ficha.terreno ?? ficha.dato}</p>
          <p className="fuente">Fuente: {(ficha.fuentes ?? [ficha.fuente]).filter(Boolean).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer">{u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]} </a>)}</p>
        </div>
      )}
    </div>
  );
}
