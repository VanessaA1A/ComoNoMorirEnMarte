# Cómo no morir en Marte

Novela visual web de supervivencia en Marte con datos reales de NASA. Equipo **Zinnia Aurora** · NASA Space Apps Challenge 2026 · Managua.

| Carpeta | Qué hay | Detalles |
|---|---|---|
| `Frontend/` | El juego (React + Vite). Funciona solo, sin backend ni internet | [Frontend/README.md](Frontend/README.md) |
| `Backend/` | API opcional (Express + PostgreSQL en Neon): guardado en la nube, catálogo científico y estadísticas | [Backend/README.md](Backend/README.md) |
| `Imagenes/` | Imágenes originales del equipo (se copian a `Frontend/public/img/`) | [Frontend/tools/mapa-imagenes.md](Frontend/tools/mapa-imagenes.md) |
| `render.yaml` | Blueprint de Render para la API | — |

## Correr en local

```bash
# Juego (http://localhost:5173)
cd Frontend && npm install && npm run dev

# API opcional (http://localhost:3001/api) — necesita Backend/.env con DATABASE_URL
cd Backend && npm install && npm run db:schema && npm run db:seed && npm run dev
```

Pruebas del juego: `cd Frontend && npm run probar` (motor: 154.197 rutas y 61,4 % de final bueno; Zinn-IA; guardado local; cola de sincronización).

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

Sin `VITE_API_URL`, o si la API no responde, el juego sigue funcionando: guarda en el navegador y sincroniza cuando vuelve la conexión.

**Nunca subas un `.env`**: están en `.gitignore` (raíz, `Backend/` y `Frontend/`). Solo se versionan los `.env.example`.
