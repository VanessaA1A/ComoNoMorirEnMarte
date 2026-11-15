// Estado de la interfaz. Toda regla del juego vive en src/engine (el motor): aquí solo se llama.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { nuevaPartida, escena as escenaDe, lineasVisibles, continuar, elegir as elegirMotor } from '../engine/motor.js';
import { formatear } from '../engine/texto.js';
import * as api from '../api.js';
import { leer, escribir, alFallarAlmacen } from './almacen.js';
import { escribirRanura, leerRanura } from './partidas.js';
import { fichasPara } from './fichas.js';
import { barrasEnRojo } from './comoVoy.js';
import * as tutorial from './tutorial.js';
import CAPAS from '../data/capas.json';
import POIS from '../data/pois.json';
import DATOS from '../data/datos.json';
import PISTAS from '../data/pistas.json';

export const JuegoContext = createContext(null); // exportado solo para tools/probar-render.mjs
export const useJuego = () => useContext(JuegoContext);

export const modoDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';

export function JuegoProvider({ children, bloqueado = false }) {
  const [pantalla, setPantalla] = useState('inicio');        // inicio | juego | creditos
  const [partida, setPartida] = useState(null);              // estado del motor
  const [linea, setLinea] = useState(0);                     // línea visible de la escena
  const [tarjeta, setTarjeta] = useState(null);              // número de capítulo de la tarjeta
  const [resumen, setResumen] = useState(false);             // pantalla de resumen del final
  const [overlay, setOverlay] = useState(null);              // { tipo: 'menu' | 'guardar' | 'cargar' | 'guia' | 'mapaRuta' | 'mapaMarte' | 'historial', ... }
  const [panelZinnia, setPanelZinnia] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [capa, setCapa] = useState('optica');
  const [fichas, setFichas] = useState(() => leer('fichas', []));
  const [fichasNuevas, setFichasNuevas] = useState(() => leer('fichas_nuevas', []));
  const [avisos, setAvisos] = useState([]);
  const [avisoZinnia, setAvisoZinnia] = useState(false);
  const [colaTutorial, setColaTutorial] = useState([]);
  const [catalogo, setCatalogo] = useState({ capas: CAPAS, pois: POIS, datos: DATOS });
  const [conectado, setConectado] = useState(api.conectado());
  const [sinConexionDescartado, setSinConexionDescartado] = useState(false);
  const [guiaAbiertaEn, setGuiaAbiertaEn] = useState(null);  // escena "esperarGuia" en la que ya se abrió la Guía

  const fichasRef = useRef(fichas);
  const jugadoRef = useRef(0); // segundos de juego de la partida actual (se guardan en cada ranura)

  // ---------- avisos y tutorial ----------
  const avisar = useCallback((texto) => {
    const id = Math.random();
    setAvisos((a) => [...a, { id, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3500);
  }, []);

  const disparar = useCallback((evento) => {
    setColaTutorial((cola) => {
      const nuevos = tutorial.pendientes(evento, tutorial.leerVistos(), cola.map((p) => p.id));
      if (!nuevos.length) return cola;
      // Se muestran en el orden del tutorial aunque los eventos lleguen juntos
      const orden = (p) => tutorial.PASOS.indexOf(p);
      // (sin mover el paso que quizá ya está en pantalla)
      if (!cola.length) return nuevos.sort((a, b) => orden(a) - orden(b));
      return [cola[0], ...[...cola.slice(1), ...nuevos].sort((a, b) => orden(a) - orden(b))];
    });
  }, []);

  const cerrarPasoTutorial = useCallback(() => {
    setColaTutorial((cola) => {
      if (cola[0]) tutorial.marcarVisto(cola[0].id);
      return cola.slice(1);
    });
  }, []);
  const saltarTutorial = useCallback(() => { tutorial.saltarTodo(); setColaTutorial([]); }, []);
  const repetirTutorial = useCallback(() => {
    tutorial.reiniciar();
    setColaTutorial([]);
    avisar('Listo: te vuelvo a explicar todo en cada momento clave.');
  }, [avisar]);

  // ---------- fichas ----------
  const desbloquear = useCallback((clave) => {
    const ids = fichasPara(clave, catalogo.datos).filter((id) => !fichasRef.current.includes(id));
    if (!ids.length) return;
    const todas = [...fichasRef.current, ...ids];
    fichasRef.current = todas;
    setFichas(todas);
    escribir('fichas', todas);
    setFichasNuevas((n) => { const v = [...new Set([...n, ...ids])]; escribir('fichas_nuevas', v); return v; });
    ids.forEach(api.registrarFicha);
    avisar(ids.length === 1 ? '¡Nueva ficha en la Guía!' : `¡${ids.length} fichas nuevas en la Guía!`);
    setAvisoZinnia(true);
    disparar('ficha-nueva');
  }, [catalogo.datos, avisar, disparar]);

  const marcarFichasVistas = useCallback(() => { setFichasNuevas([]); escribir('fichas_nuevas', []); }, []);

  // ---------- guardado ----------
  const conFichas = (s) => ({ ...s, fichas: fichasRef.current });
  const autoguardar = useCallback((s, lin = 0) => {
    escribirRanura(0, conFichas(s), lin, jugadoRef.current);
    api.guardarNube(0, conFichas(s));
  }, []);

  // ---------- avanzar en la historia ----------
  const aplicar = useCallback((res, previo) => {
    const s = res.estado;
    setPartida(s);
    setLinea(0);
    const esc = escenaDe(s.escena);
    if (esc?.capa) setCapa(esc.capa);
    if (s.hud && !previo.hud) disparar('hud');
    if (s.hud) {
      const antes = barrasEnRojo(previo);
      if (barrasEnRojo(s).some((b) => !antes.includes(b))) { setAvisoZinnia(true); disparar('barra-roja'); }
    }
    if (s.final && !previo.final) { desbloquear('Final'); api.registrarFinal(s); }
    if (res.cambioCapitulo) {
      disparar(`fin-capitulo:${previo.capitulo}`);
      setTarjeta(res.cambioCapitulo); // las fichas del capítulo se dan al cerrar la tarjeta
    }
    // Autoguardado (ranura 0) en cada cambio de escena y después de cada decisión
    if (s.escena !== previo.escena || res.decision) autoguardar(s, 0);
  }, [disparar, desbloquear, autoguardar]);

  const empezar = useCallback(() => {
    const s = nuevaPartida();
    jugadoRef.current = 0;
    api.olvidarJugador(); // el jugador nuevo se crea al elegir pronombre
    setPartida(s); setLinea(0); setHistorial([]); setResumen(false); setOverlay(null);
    setCapa('optica'); setTarjeta(1); setPantalla('juego');
    autoguardar(s, 0);
  }, [autoguardar]);

  /** El jugador hizo clic con la línea ya completa. */
  const avanzar = useCallback(() => {
    if (!partida) return;
    const esc = escenaDe(partida.escena);
    const n = lineasVisibles(esc, partida).length;
    if (linea < n - 1) { setLinea(linea + 1); return; }
    if (esc.opciones || esc.accion === 'pedirNombre') return; // espera una elección
    if (esc.esFinal) { setResumen(true); return; }
    aplicar(continuar(partida), partida);
  }, [partida, linea, aplicar]);

  /** Canción del cap. 1: el jugador completa el verso con el botón de una sola respuesta (sin efecto). */
  const responder = useCallback((texto) => {
    if (!partida) return;
    setHistorial((h) => [...h, { quien: partida.nombre || 'Tú', texto: formatear(texto, partida) }].slice(-50));
    avanzar();
  }, [partida, avanzar]);

  const ponerNombre = useCallback((nombre) => {
    const s = { ...partida, nombre: nombre.trim().slice(0, 30) };
    setHistorial((h) => [...h, { quien: 'Tú', texto: s.nombre }].slice(-50));
    aplicar(continuar(s), s);
  }, [partida, aplicar]);

  const elegir = useCallback((opcion) => {
    const s = partida;
    const res = elegirMotor(s, opcion, { modoDemo });
    if (opcion.pronombre) api.nuevoJugador(s.nombre, opcion.pronombre);
    api.registrarDecision({ ...res.estado, capitulo: s.capitulo }, s.escena, opcion.texto);
    setHistorial((h) => [...h, { quien: 'Tú elegiste', texto: formatear(opcion.texto, res.estado) }].slice(-50));
    aplicar({ ...res, decision: true }, s);
  }, [partida, aplicar]);

  /** La escena muestra sus opciones: autoguardado "antes de cada decisión" y avisos. */
  const opcionesEnPantalla = useCallback((opciones) => {
    autoguardar(partida, linea);
    if (partida.hud) disparar('opciones'); // c01_05; el pronombre (c01_02) no mueve barras
    if (opciones.some((o) => o.probabilidad)) disparar('probabilidad');
    if (PISTAS[partida.escena]) setAvisoZinnia(true);
  }, [partida, linea, autoguardar, disparar]);

  const cerrarTarjeta = useCallback(() => {
    setTarjeta(null);
    if (!partida) return;
    disparar(`inicio-capitulo:${partida.capitulo}`);
    desbloquear(partida.capitulo);
  }, [partida, disparar, desbloquear]);

  // Historial y capa de cada línea que se muestra
  useEffect(() => {
    if (!partida || tarjeta) return;
    const esc = escenaDe(partida.escena);
    const l = lineasVisibles(esc, partida)[linea];
    if (!l) return;
    if (l.capa) setCapa(l.capa);
    setHistorial((h) => {
      const entrada = { quien: formatear(l.quien, partida), texto: formatear(l.texto, partida), clave: `${partida.escena}:${linea}` };
      return h.at(-1)?.clave === entrada.clave ? h : [...h, entrada].slice(-50);
    });
  }, [partida, linea, tarjeta]);

  // ---------- guardar / cargar ----------
  const guardar = useCallback((slot) => {
    const ok = escribirRanura(slot, conFichas(partida), linea, jugadoRef.current);
    api.guardarNube(slot, conFichas(partida));
    avisar(ok ? `Partida guardada en la ranura ${slot}` : 'No se pudo guardar en este navegador. Puedes seguir jugando.');
  }, [partida, linea, avisar]);

  const cargar = useCallback((slot) => {
    const r = leerRanura(slot);
    if (!r) return;
    jugadoRef.current = r.jugado ?? 0;
    const esc = escenaDe(r.estado.escena);
    setPartida(r.estado); setLinea(r.linea ?? 0); setTarjeta(null); setResumen(false);
    setOverlay(null); setHistorial([]); setCapa(esc?.capa ?? 'optica'); setPantalla('juego');
    avisar('Partida cargada');
  }, [avisar]);

  const volverInicio = useCallback(() => {
    setPantalla('inicio'); setOverlay(null); setResumen(false); setTarjeta(null);
  }, []);

  const abrir = useCallback((tipo, extra = {}) => {
    setPanelZinnia(false);
    setOverlay({ tipo, ...extra });
    if (tipo === 'mapaMarte') desbloquear('Mapa');
    // "esperarGuia": la escena sigue cuando el jugador abre la Guía (avanza al cerrarla)
    if (tipo === 'guia' && partida && escenaDe(partida.escena)?.accion === 'esperarGuia') setGuiaAbiertaEn(partida.escena);
  }, [desbloquear, partida]);
  const cerrarOverlay = useCallback(() => setOverlay(null), []);

  const abrirPanelZinnia = useCallback((abierto = true) => {
    setPanelZinnia(abierto);
    if (abierto) setAvisoZinnia(false);
  }, []);

  // Si el navegador no deja guardar (modo privado, cuota llena), se avisa UNA vez y el juego sigue en memoria
  useEffect(() => alFallarAlmacen(() => avisar('Este navegador no deja guardar (modo privado o espacio lleno). Puedes jugar, pero el progreso no se guardará al cerrar.')), [avisar]);

  // ---------- conexión y catálogo ----------
  useEffect(() => api.alCambiarConexion((c) => {
    setConectado(c);
    if (c) setSinConexionDescartado(false);
  }), []);
  useEffect(() => { api.cargarCatalogo({ capas: CAPAS, pois: POIS, datos: DATOS }).then(setCatalogo); }, []);
  const descartarSinConexion = useCallback(() => { setSinConexionDescartado(true); disparar('sin-conexion'); }, [disparar]);

  // ---------- teclado global: Z abre a Zinn-IA, Esc abre/cierra menús ----------
  useEffect(() => {
    const alTeclear = (e) => {
      const escribiendo = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if (bloqueado || colaTutorial.length) return; // pantalla de solo computadora, o el tutorial tiene sus propios botones
      if ((e.key === 'z' || e.key === 'Z') && !escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        abrirPanelZinnia(!panelZinnia);
      } else if (e.key === 'Escape') {
        if (panelZinnia) setPanelZinnia(false);
        else if (overlay) setOverlay(null);
        else if (pantalla === 'juego' && !resumen) setOverlay({ tipo: 'menu' });
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [bloqueado, colaTutorial.length, panelZinnia, overlay, pantalla, resumen, abrirPanelZinnia]);

  // "bloqueado": pantalla de solo computadora (celular o ventana chica); el juego queda en pausa
  const pausado = Boolean(bloqueado || overlay || panelZinnia || colaTutorial.length || tarjeta || resumen);

  // Tiempo de juego: cuenta solo mientras se juega (sin menús abiertos y con la pestaña visible).
  useEffect(() => {
    if (pantalla !== 'juego' || pausado) return;
    const t = setInterval(() => { if (!document.hidden) jugadoRef.current += 1; }, 1000);
    return () => clearInterval(t);
  }, [pantalla, pausado]);

  const valor = useMemo(() => ({
    pantalla, setPantalla, partida, linea, tarjeta, resumen, overlay, panelZinnia, historial, capa, setCapa, guiaAbiertaEn, responder,
    fichas, fichasNuevas, avisos, avisoZinnia, colaTutorial, catalogo, conectado, sinConexionDescartado, pausado, modoDemo,
    empezar, avanzar, ponerNombre, elegir, opcionesEnPantalla, cerrarTarjeta, guardar, cargar, volverInicio,
    abrir, cerrarOverlay, abrirPanelZinnia, setResumen, marcarFichasVistas, disparar,
    cerrarPasoTutorial, saltarTutorial, repetirTutorial, descartarSinConexion,
  }), [pantalla, partida, linea, tarjeta, resumen, overlay, panelZinnia, historial, capa, guiaAbiertaEn, responder, fichas, fichasNuevas, avisos,
    avisoZinnia, colaTutorial, catalogo, conectado, sinConexionDescartado, pausado,
    empezar, avanzar, ponerNombre, elegir, opcionesEnPantalla, cerrarTarjeta, guardar, cargar, volverInicio,
    abrir, cerrarOverlay, abrirPanelZinnia, marcarFichasVistas, disparar, cerrarPasoTutorial, saltarTutorial,
    repetirTutorial, descartarSinConexion]);

  return <JuegoContext.Provider value={valor}>{children}</JuegoContext.Provider>;
}
