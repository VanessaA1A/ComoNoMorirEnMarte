# Correcciones del guion según el terreno real (para que decida Sefora)

**Estado (15 nov 2026):** en el commit 3fddf52 (Guion 1.0) se aplicaron 2 correcciones: `c06_01` (la línea de THEMIS) y la pista `c06_01`. Todo lo demás sigue pendiente de Sefora. `reglas.js` no se tocó. Cada propuesta sale de la ruta real (`Frontend/src/data/ruta_real.json` y `docs/ruta_propuesta.md`): DEM 1 m y ortofoto 25 cm de USGS, y posiciones de Curiosity de PDS PLACES. Si alguna se aplica, solo cambia texto, así que el balance no se mueve (154.197 rutas y 61,4 %).

## Líneas pendientes que contradicen el terreno o las capas reales (8)

| Id (escena # línea) | Texto actual | Problema con el terreno real | Texto propuesto |
|---|---|---|---|
| `c04_01#0` | "Medio kilómetro después llegas a un mirador." | De la base (H) al mirador (P1) hay **784 m** de camino real. | "Unos 800 metros después llegas a un mirador." |
| `c03_03#1` | "Ruta: mirador, zona de transición, hondonada, crestas, fondo con carbonatos y regreso. Unos 4 km." | Ida y vuelta por el camino seguro son **3,3 km** (2,0 de ida y 1,3 de regreso). Con la subida al mirador alto son unos **4,0 km**. | "Ruta: mirador, zona de transición, hondonada, crestas, fondo con carbonatos y regreso. Unos 3,3 km, o 4 si subes al mirador alto." |
| `c06_01#9` (antes #3) | "Si la rodeamos por el borde, el suelo es roca firme, pero el camino es el doble de largo." | Camino firme: **314 m**. Atajo por la arena: **267 m**. Es un 18 % más largo, no el doble. Lo que sí cambia es la pendiente: el atajo cruza tramos de más de 23° y el camino firme no pasa de 19°. | "Si la rodeamos por el borde, el suelo es roca firme: el camino es un poco más largo, pero más suave." |
| `c08_01#0` | "Para llegar al fondo con carbonatos tienes que pasar al otro lado de una cresta." | Ya estás arriba de la cresta (Nevado Sajama). La hondonada con carbonatos (Valle de la Luna) está **a unos 10 m, al lado**. | "Para llegar al fondo con carbonatos tienes que bajar de esta cresta a la hondonada de al lado." |
| `c03_02#4` (tutorial) | "Capa Terreno: datos térmicos de THEMIS. Lo que se enfría rápido de noche suele ser arena suelta." | La capa THEMIS está oculta en el mapa porque su alineación no se pudo verificar (ver el informe final). La afirmación es correcta en general, pero el jugador no va a ver la capa. | Si THEMIS sigue oculta: "Capa Terreno: los datos térmicos de THEMIS todavía los estoy alineando; por ahora miro la arena en la foto de HiRISE." Si se verifica, dejar la línea como está. |
| `final_malo_integridad#2` | "Lección: las crestas de 1 a 2 metros y las pendientes se ven en HiRISE y MOLA. Rodearlas cuesta tiempo, pero protege el traje." | MOLA mide una altura cada **300 m**: no ve crestas de 1 a 2 m (lo dice la propia Guía). El relieve del juego viene de los modelos 3D de HiRISE. | "Lección: las crestas de 1 a 2 metros y las pendientes se ven en las fotos y los modelos 3D de HiRISE. Rodearlas cuesta tiempo, pero protege el traje." |
| `c06_atasco#3` | "La capa Terreno tenía razón. Lo anoto en la guía." | Nombra la capa Terreno (THEMIS), que está oculta. Desde 3fddf52 la escena `c06_01` usa la foto de HiRISE. | "La foto de HiRISE tenía razón: era arena suelta. Lo anoto en la guía." |
| `final_malo_oxigeno#2` | "Lección: cada atajo, caída y desvío gasta oxígeno. Las capas Relieve y Terreno muestran qué caminos cuestan menos." | La capa Terreno (THEMIS) está oculta. La que muestra qué caminos cuestan menos es la de **Pendiente** (umbrales de 15° y 23°). | "Lección: cada atajo, caída y desvío gasta oxígeno. Las capas Relieve y Pendiente muestran qué caminos cuestan menos." |

## Otros textos fijos del juego con el mismo problema (2 pendientes)

No son del guion de capítulos, pero el jugador los lee. Tampoco se tocaron.

| Archivo e id | Texto actual | Problema | Texto propuesto |
|---|---|---|---|
| `Resumen.jsx` → `oxigeno` | "Cada atajo, caída y desvío gasta oxígeno. Las capas Relieve (MOLA) y Terreno (THEMIS) muestran qué caminos cuestan menos." | El relieve del mapa es el modelo de HiRISE de 1 m, no MOLA; la capa Terreno está oculta. | "Cada atajo, caída y desvío gasta oxígeno. Las capas Relieve y Pendiente (modelos 3D de HiRISE) muestran qué caminos cuestan menos." |
| `zinnia_respuestas.json` → "¿Qué es cada capa del mapa?" | "Óptica: fotos de HiRISE. Relieve: alturas de MOLA. Terreno: datos térmicos de THEMIS. ..." | El relieve del mapa viene de HiRISE (1 m); hay capa Pendiente; Terreno está oculta. Es un archivo de Zinn-IA (lo cuida la otra sesión). | "Óptica: fotos de HiRISE. Relieve y Pendiente: el modelo 3D de HiRISE. Terreno (THEMIS): oculta hasta verificar su alineación. Minerales: CRISM y Curiosity. ..." |

## Aplicadas (commit 3fddf52, Guion 1.0)

| Id | Texto que había | Texto aplicado |
|---|---|---|
| `c06_01#7` (antes #1) | "Activo la capa Terreno, con datos de THEMIS: esta hondonada se enfría muy rápido de noche." (capa `termico`) | "Mira la foto de HiRISE: esta hondonada está más baja que su entorno y se ve lisa, como arena suelta. Con tanto polvo en el aire, cruzarla pide mucho cuidado." (capa `optica`) |
| `pistas.json` → `c06_01` | "La capa Terreno marca arena suelta en la hondonada..." (capa `termico`) | "La foto de HiRISE muestra arena suelta en la hondonada. El atajo es rápido si no te hundes: hay 4 posibilidades en 10 de atascarte." (capa `optica`) |

## Observaciones (no son errores del texto)

| Id | Texto | Observación |
|---|---|---|
| `Frontend/src/data/guion.json` | "Activo la capa Terreno, con datos de THEMIS..." | Archivo viejo: ningún código ni prueba lo usa. Todavía tiene la línea de THEMIS de `c06_01`; si se borra o se actualiza, da igual para el juego. |
| `zinnia_respuestas.json` → "¿Qué es la inercia térmica?" | "...THEMIS lo mide desde órbita, y así sé dónde te puedes hundir." | Es correcto en general (THEMIS sí mide inercia térmica), aunque en el juego la capa esté oculta. |
| `c07_02#0` | "...un depósito de suministros... Está a 15 minutos." | El depósito (DEP) está a **229 m** de la cresta: unos 460 m ida y vuelta. Que tarde 15 minutos con la recarga es razonable. |
| `c08_01#2` y efectos de `c08_01` | "veo un paso que rodea la cresta, pero toma más tiempo" (rodear: −20 min; de frente: −5 min) | El texto es correcto: rodear son **41 m** y de frente **10 m**. Los minutos son una regla del juego (`reglas.js`/efectos) que no se toca; con 41 m, 20 minutos es mucho para la distancia real. |
| `c06_01` (efectos) | Atajo −20 min; camino firme −40 min | Son reglas del juego. El terreno real da 267 m contra 314 m, así que la diferencia de tiempo real sería pequeña. Si se ajusta el texto de `c06_01#3`, no hace falta tocar los efectos. |
| `c09_03#2`, `c09_04c#0`, `final_bueno#5` | "Desde allí se ve el borde del cráter Gale." | El mirador alto (P5) es una cima real **32 m más alta** que su entorno. Con estos datos no se puede comprobar la línea de vista hasta el borde del cráter (que está a decenas de kilómetros), pero tampoco hay nada que la contradiga. |
| `c09_caida#0` | "En la bajada empinada resbalas y ruedas varios metros." | Coincide con el terreno: la subida al mirador alto pasa por pendientes de hasta **62°** y la bajada de hasta **45°**. |
| `c09_04b#0` | "Te pegas a la pared de la cresta." | Coincide: el refugio (REF) está al pie de una pared real de más de 23° y al menos 3 m de alto, a 14 m de D2. |
| `c06_05#0` | "Subes el último tramo y, de pronto, las ves: las crestas boxwork." | Coincide: de la hondonada (D1) a la cresta (P3) se suben **33 m**. |
| `c07_01#2`, `c03_03#0`, `c08_01#1` | Crestas "de 1 a 2 metros de alto" | Coincide con NASA (Curiosity, 2026). El DEM a 2 m suaviza crestas tan bajas. |
