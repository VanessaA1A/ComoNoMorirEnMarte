# Cómo no morir en Marte

Novela visual web de supervivencia en Marte con datos reales de NASA. Equipo **Zinnia Aurora** · NASA Space Apps Challenge 2026 · Managua.

| Carpeta | Qué hay | Detalles |
|---|---|---|
| `Frontend/` | El juego (React + Vite). Funciona solo, sin backend ni internet | [Frontend/README.md](Frontend/README.md) |
| `Backend/` | API opcional (Express + PostgreSQL en Neon): guardado en la nube, catálogo científico y estadísticas | [Backend/README.md](Backend/README.md) |
| `Imagenes/` | Imágenes originales del equipo (se copian a `Frontend/public/img/`) | [Frontend/tools/mapa-imagenes.md](Frontend/tools/mapa-imagenes.md) |
| `render.yaml` | Blueprint de Render para la API | — |

## Desde cero (otra computadora)

Requisitos: **Node 20.6 o más reciente** y **git**. La base de datos es opcional: el juego funciona solo.

```bash
git clone https://github.com/VanessaA1A/DemoVisualNovel.git
cd DemoVisualNovel
git checkout prueba            # rama de trabajo (main = versión congelada)

# 1. Juego: http://localhost:5173
cd Frontend
npm install
cp .env.example .env           # opcional; en PowerShell: Copy-Item .env.example .env
                               # deja VITE_API_URL vacía para jugar solo en el navegador
npm run dev

# 2. API (opcional), en otra terminal: http://localhost:3001/api
cd Backend
npm install
cp .env.example .env           # pega DATABASE_URL de Neon (y ANTHROPIC_API_KEY si usas Zinn-IA con IA)
npm run db:schema              # crea las tablas (se puede repetir)
npm run db:seed                # carga capas, pois y datos
npm run dev
```

Para conectar el juego con tu API local, pon `VITE_API_URL=http://localhost:3001/api` en `Frontend/.env` y reinicia `npm run dev`.

### Plan B: sin internet

El juego no necesita internet ni la API: guarda en el navegador y usa solo archivos locales (fuentes e imágenes incluidas).

1. Con internet, una sola vez: clonar e instalar (`cd Frontend && npm install`).
2. Sin `VITE_API_URL` en `Frontend/.env`, compilar y servir la versión final: `npm run build` y luego `npx vite preview` (abre http://localhost:4173).
3. Para la presentación: **http://localhost:4173/?demo=1** (modo demo: toda decisión con riesgo sale bien). La guía queda en http://localhost:4173/guia.html.
4. Si algo falla con el build, `npm run dev` también funciona sin internet (http://localhost:5173/?demo=1).

## Correr en local

```bash
# Juego (http://localhost:5173)
cd Frontend && npm install && npm run dev

# API opcional (http://localhost:3001/api) — necesita Backend/.env con DATABASE_URL
cd Backend && npm install && npm run db:schema && npm run db:seed && npm run dev
```

Pruebas del juego: `cd Frontend && npm run probar` (motor: 154.197 rutas y 61,4 % de final bueno; Zinn-IA; guardado local; cola de sincronización; recorridos A, B y C; render de cada panel).

## Despliegue

El juego va en **Vercel** y la API en **Render**; la base de datos está en **Neon**.

| Servicio | Carpeta raíz | Variable | Valor |
|---|---|---|---|
| **Render** (API) | `Backend` (o usa `render.yaml`) | `DATABASE_URL` | URL **pooled** de Neon (la que tiene `-pooler`) — solo en el panel de Render |
| **Render** (API) | | `CORS_ORIGIN` | `https://tu-juego.vercel.app` (+ `,http://localhost:5173` si quieres probar en local) |
| **Render** (API) | | `ANTHROPIC_API_KEY` | Key de la Claude Console — solo en el panel de Render |
| **Render** (API) | | `ZINNIA_MODEL` | `claude-haiku-5-5` |
| **Vercel** (juego) | `Frontend` (Framework: Vite) | `VITE_API_URL` | `https://<tu-api>.onrender.com/api` (no lleva secretos) |

1. **Render:** New → Blueprint → este repo (lee `render.yaml`) y escribe `DATABASE_URL`, `CORS_ORIGIN`, `ANTHROPIC_API_KEY` y `ZINNIA_MODEL` en el panel. Comprueba `https://<tu-api>.onrender.com/api/salud` → `{ "ok": true, "db": true }`.
2. **Vercel:** New Project → este repo, Root Directory `Frontend`, y la variable `VITE_API_URL`.
3. **Vuelve a Render** y confirma que `CORS_ORIGIN` incluye el dominio exacto que te dio Vercel (con `https://`, sin `/` al final).

Todo va en planes gratis (Render **Free**, Vercel **Hobby**); no hace falta conectar ninguna tarjeta.

> **Aviso:** Render gratis se duerme tras 15 min sin uso; antes de una demo, abrir `/api/salud` unos 2 minutos antes.

Sin `VITE_API_URL`, o si la API no responde, el juego sigue funcionando: guarda en el navegador y sincroniza cuando vuelve la conexión.

## Antes de hacer push (una vez por persona)

1. Corre una sola vez `cd Frontend && npm install && npm run preparar-hooks`.
2. Desde ahí, cada `git push` corre `npm run probar` (motor, Zinn-IA, guardado, sincronización, recorridos y render) y **cancela el push si alguna prueba falla**.
3. Si falla, arregla lo que dice la consola o pide ayuda; `git push --no-verify` es solo para emergencias y hay que avisar al grupo.

**Nunca subas un `.env`**: están en `.gitignore` (raíz, `Backend/` y `Frontend/`). Solo se versionan los `.env.example`.
