// La Guía de supervivencia como memoria de Zinn-IA: fragmentos buscables con su sección y su fuente.
// Lo usan el respaldo del chat (src/juego/zinniaChat.js) y el agente del backend (Backend/src/zinnia/conocimiento.js).
// Solo lee el JSON de la guía (generado desde docs/guia_supervivencia.md con tools/guia-md-a-json.mjs).

/** Quita marcas de formato y citas [n] (la cita se devuelve aparte como fuente). */
export const limpiarGuia = (t) => String(t ?? '')
  .replace(/\s*\[\d+\]/g, '')
  .replace(/\*\*?/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const citas = (t) => [...String(t ?? '').matchAll(/\[(\d+)\]/g)].map((m) => m[1]);

/** Nombre de la sección para sugerir dónde buscar: "Parte 2 · Tu mapa: cómo leer cada capa". */
export const nombreSeccion = (s) => (s.numero ? `Parte ${s.numero} · ${s.titulo}` : s.titulo);

/**
 * Fragmentos de la guía: { id, seccion, parte, subtitulo, texto, fuente, referencias }.
 * fuente = URL de la primera cita del fragmento (o null). Se omiten las referencias (son la lista de fuentes).
 */
export function fragmentosGuia(guia) {
  const refs = guia?.referencias ?? {};
  const salida = [];
  for (const s of guia?.secciones ?? []) {
    if (s.id === 'referencias') continue;
    let subtitulo = null;
    s.bloques.forEach((b, i) => {
      if (b.tipo === 'subtitulo') { subtitulo = limpiarGuia(b.texto); return; }
      const textos = b.tipo === 'lista' ? b.items
        : b.tipo === 'tabla' ? b.filas.map((f) => {
          // Las columnas que solo tienen citas ([1][43]) se quitan del texto; las citas se guardan aparte
          const col = f.map((c, k) => ({ c, k })).filter(({ c }) => !/^(\[\d+\])+$/.test(c.trim()));
          const citasFila = f.filter((c) => /^(\[\d+\])+$/.test(c.trim())).join('');
          const cuerpo = col.length === 2 ? `${col[0].c}: ${col[1].c}`
            : col.map(({ c, k }) => (k === 0 ? c : `${b.encabezados[k]}: ${c}`)).join(' · ');
          return { t: `${cuerpo}. ${citasFila}`, lema: limpiarGuia(col[0]?.c) };
        })
        : [b.texto];
      textos.forEach((x, k) => {
        const t = typeof x === 'string' ? x : x.t;
        let texto = limpiarGuia(t).replace(/\.\.$/, '.');
        if (texto.length < 25) return; // "Lo real:" y otros rótulos sueltos
        const lema = (typeof x === 'string' ? null : x.lema) ?? String(t).match(/^\*\*([^*]+?):?\*\*/)?.[1]?.replace(/:$/, '') ?? null;
        // "Qué es:", "Para qué te sirve:"… solos no dicen de qué capa hablan: se les antepone el subtítulo
        if (subtitulo && /^(Qué es|Para qué te sirve|Limitación|Cómo se lee)\b/.test(texto)) texto = `${subtitulo}. ${texto}`;
        const nums = citas(t);
        salida.push({
          id: `guia:${s.id}:${i}:${k}`, seccion: s.id, parte: nombreSeccion(s), subtitulo, lema, texto,
          fuente: nums.map((n) => refs[n]?.url).find(Boolean) ?? null, referencias: nums,
        });
      });
    });
  }
  return salida;
}
