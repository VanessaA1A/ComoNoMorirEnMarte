// Carga todo el guion (importación estática: funciona en Vite y en Node con import attributes).
import index from '../data/capitulos/index.json' with { type: 'json' };
import c01 from '../data/capitulos/cap01.json' with { type: 'json' };
import c02 from '../data/capitulos/cap02.json' with { type: 'json' };
import c03 from '../data/capitulos/cap03.json' with { type: 'json' };
import c04 from '../data/capitulos/cap04.json' with { type: 'json' };
import c05 from '../data/capitulos/cap05.json' with { type: 'json' };
import c06 from '../data/capitulos/cap06.json' with { type: 'json' };
import c07 from '../data/capitulos/cap07.json' with { type: 'json' };
import c08 from '../data/capitulos/cap08.json' with { type: 'json' };
import c09 from '../data/capitulos/cap09.json' with { type: 'json' };
import c10 from '../data/capitulos/cap10.json' with { type: 'json' };
import finales from '../data/capitulos/finales.json' with { type: 'json' };

const caps = [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10];

export const INDEX = index;
export const CAPITULOS = caps;
export const ESCENAS = new Map();
export const FINAL_POR_CAUSA = new Map();

for (const cap of caps) {
  for (const e of cap.escenas) ESCENAS.set(e.id, { ...e, capitulo: cap.capitulo });
}
for (const f of finales.escenas) {
  ESCENAS.set(f.id, { ...f, esFinal: true, capitulo: 10 });
  FINAL_POR_CAUSA.set(`${f.final}:${f.causa}`, f.id);
}

export const capitulo = (n) => caps[n - 1];
export const infoCapitulo = (n) => index.capitulos[n - 1];
export const inicioCapitulo = (n) => caps[n - 1].inicio;
