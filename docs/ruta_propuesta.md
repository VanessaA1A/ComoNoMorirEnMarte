# Propuesta de la ruta real del juego

**Estado: propuesta para revisar (usuaria y Sefora).** Todos los puntos están en `Frontend/src/data/ruta_real.json`: para mover uno, se cambia su lat/lon ahí y el mapa 2D, el minimapa y el 3D lo toman de ese archivo (después hay que volver a correr `tools/preparar-cartografia/corredor.py`).

**Regla: la historia manda en el orden; el terreno real decide dónde queda cada punto.** Orden del guion: cap. 3 **H** (base) · 4 **P1** (mirador) · 5 **P2** (transición) · 6 **D1** (atajo por la arena o camino firme) · 7 **P3** (cresta; desvío opcional al depósito **DEP**) · 8 de **P3** a **P4** (bajar de frente o rodear la cresta) · 9 **D2** ya de regreso (alerta solar: regresar ya, refugiarse en **REF** o subir al mirador alto **P5**) · 10 **H**.

**Criterio.** Las tres paradas de ciencia son las **perforaciones reales de Curiosity en 2025** (PDS PLACES, doi:10.17189/1520397): Altadena (P2, transición), Nevado Sajama (P3, cresta) y Valle de la Luna (P4, hondonada Monte Grande, con carbonatos). H, D1 y DEP están **sobre el recorrido real del rover**; P1, D2, REF y P5 se eligieron con el relieve real (DEM 1 m de USGS a 2 m). Los tramos a pie son **caminos de menor costo sobre el relieve real** (evitan > 15° y casi prohíben > 23°). Las opciones arriesgadas (atajo por la arena, bajar la cresta de frente, subir al mirador alto) son rectas a propósito. El recorrido real de Curiosity se muestra como capa aparte. Coordenadas: latitud planetocéntrica y longitud Este 0–360°. Distancias: haversine sobre una esfera de 3.396,2 km (NASA Mars Fact Sheet).

**Distancias.** Ida H → D2 (por el camino firme y rodeando la cresta): **1997 m**; regreso D2 → H: **1314 m**; total **3.31 km**. Opcionales: desvío al depósito 229 m (ida), refugio 14 m, subida al mirador alto 474 m.

| Punto | Capítulo | Lat | Lon E | Elevación | Qué hay en el terreno real | Pendiente | Distancia al anterior | Fuente |
|---|---|---|---|---|---|---|---|---|
| H · Base Aurora | 3, 10 | -4.788178 | 137.391803 | -3719.1 m | Terreno llano sobre el recorrido real de Curiosity (sitio 113, sol 4459, 2025-02-20), unos 1,0 km antes de Altadena. | 4.4° (punto: 4.0°) | — | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| P1 · Mirador de Mount Sharp | 4 | -4.793512 | 137.385889 | -3667.2 m | Loma 11.5 m más alta que su entorno de 150 m, a menos de 150 m del recorrido de Curiosity; desde aquí se ven las capas de Mount Sharp al sur. | 18.3° (punto: 5.5°) | 784 m desde H | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| P2 · Zona de transición (Altadena) | 5 | -4.799847 | 137.383541 | -3647.1 m | Altadena: primera perforación de Curiosity en el boxwork (8 jun 2025), en la transición antes de las crestas. · nombre real: Altadena | 8.7° (punto: 15.7°) | 427 m desde P1 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://science.nasa.gov/blog/curiosity-blog-sols-4568-4569-a-close-look-at-the-altadena-drill-hole-and-tailings/ · https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/ · https://science.nasa.gov/blog/curiosity-blog-sols-4573-4574-welcome-to-the-uyuni-quad/ |
| D1 · Hondonada: atajo o camino firme | 6 | -4.803606 | 137.380074 | -3640.7 m | Hondonada sobre el recorrido (sol 4596): 3.0 m más baja que su entorno de 80 m y de textura lisa en la ortofoto (arena). | 9.8° (punto: 12.7°) | 308 m desde P2 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm |
| P3 · Cresta boxwork (Nevado Sajama) | 7, 8 | -4.808008 | 137.381004 | -3607.7 m | Nevado Sajama: cresta boxwork donde Curiosity perforó (sol 4718); arcillas en la cresta. Desde aquí se baja a la hondonada (capítulo 8: de frente o rodeando). · nombre real: Nevado Sajama | 13.7° (punto: 14.1°) | 314 m desde D1 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://science.nasa.gov/solar-system/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama · https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit · https://science.nasa.gov/blog/curiosity-blog-sols-4573-4574-welcome-to-the-uyuni-quad/ |
| DEP · Depósito de suministros (desvío) | 7 | -4.811552 | 137.381812 | -3590.1 m | Punto llano junto al recorrido, a 215 m de la cresta. El depósito es ficción del juego; el lugar es real. | 7.4° (punto: 4.9°) | 229 m desde P3 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| P4 · Hondonada con carbonatos (Valle de la Luna) | 8 | -4.807839 | 137.381035 | -3610.4 m | Valle de la Luna: perforación de Curiosity en la hondonada Monte Grande (sol ~4693); carbonatos en la hondonada. · nombre real: Valle de la Luna (hondonada Monte Grande) | 14.2° (punto: 19.7°) | 41 m desde P3 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://science.nasa.gov/solar-system/curiosity-blog-sols-4695-4701-searching-for-answers-at-monte-grande · https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit · https://science.nasa.gov/blog/curiosity-blog-sols-4573-4574-welcome-to-the-uyuni-quad/ |
| D2 · Alerta solar: decisión | 9 | -4.805929 | 137.380760 | -3622.0 m | Ya de regreso, a 123 m de la hondonada por el camino: lugar llano (pendiente media 9° en 10 m) donde llega la alerta solar y se decide: regresar ya, refugiarse junto a una cresta o subir al mirador alto. | 10.1° (punto: 13.3°) | 123 m desde P4 | https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| REF · Refugio junto a la cresta | 9 | -4.805895 | 137.380591 | -3622.2 m | Al pie de una pared real (más de 23° y al menos 3 m de alto en el DEM), a 10 m de D2: la roca tapa una parte del cielo. | 11.8° (punto: 13.8°) | 14 m desde D2 | https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| P5 · Mirador alto (opcional) | 9 | -4.807346 | 137.388656 | -3524.4 m | Cima 32 m más alta que su entorno, a 475 m de D2; la subida directa pasa por pendientes de hasta 60°. | 28.7° (punto: 8.8°) | 474 m desde D2 | https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m · https://www.jpl.nasa.gov/news/nasas-curiosity-rover-faces-its-toughest-climb-yet-on-mars/ |

## Por qué se llaman así (nombres reales del equipo de Curiosity)

- **Altadena** (P2): Lleva el nombre de una comunidad cerca de JPL muy afectada por el incendio de Eaton Canyon en enero de 2025. Esta zona está en el cuadrante "Uyuni" del mapa de Curiosity: cada cuadrante lleva el nombre de un pueblo de la Tierra de menos de 100.000 habitantes (Uyuni, Bolivia, la puerta del salar más grande del mundo) y sus objetivos toman nombres de Uyuni y alrededores, incluido el desierto de Atacama en Chile.
- **Nevado Sajama** (P3): Nevado Sajama es un volcán extinto, el pico más alto de Bolivia. Esta zona está en el cuadrante "Uyuni" del mapa de Curiosity: cada cuadrante lleva el nombre de un pueblo de la Tierra de menos de 100.000 habitantes (Uyuni, Bolivia, la puerta del salar más grande del mundo) y sus objetivos toman nombres de Uyuni y alrededores, incluido el desierto de Atacama en Chile.
- **Valle de la Luna (hondonada Monte Grande)** (P4): Valle de la Luna se llama así por una zona de valles del desierto de Atacama, en Chile. Esta zona está en el cuadrante "Uyuni" del mapa de Curiosity: cada cuadrante lleva el nombre de un pueblo de la Tierra de menos de 100.000 habitantes (Uyuni, Bolivia, la puerta del salar más grande del mundo) y sus objetivos toman nombres de Uyuni y alrededores, incluido el desierto de Atacama en Chile. (No encontramos una fuente que explique el nombre "Monte Grande".)

Fuentes: Curiosity Blog, Sols 4573-4574 ("Welcome to the Uyuni Quad", Lauren Edgar, USGS, 18 jun 2025); NASA/JPL, 23 jun 2025 (Altadena); Curiosity Blog, Sols 4709-4715 (Catherine O'Connell-Cooper, 18 nov 2025).

## Tramos (pendiente calculada cada 2 m sobre el DEM a 2 m)

| Tramo | Largo | Pendiente media | Percentil 90 | Máxima | Parte > 15° |
|---|---|---|---|---|---|
| H-P1 | 784 m | 8.4° | 13.8° | 22.8° | 4 % |
| P1-P2 | 427 m | 7.8° | 13.6° | 18.9° | 5 % |
| P2-D1 | 308 m | 7.7° | 12.7° | 17.8° | 2 % |
| D1-P3 (camino firme) | 314 m | 10.2° | 14.6° | 18.8° | 5 % |
| D1-P3 (atajo por la arena) | 267 m | 13.8° | 21.6° | 33.8° | 41 % |
| P3-DEP (desvío) | 229 m | 8.1° | 13.2° | 16.9° | 2 % |
| P3-P4 (bajar de frente) | 10 m | 18.2° | 22.5° | 23.3° | 83 % |
| P3-P4 (rodear la cresta) | 41 m | 13.1° | 16.1° | 21.7° | 19 % |
| P4-D2 | 123 m | 10.7° | 15.0° | 22.1° | 10 % |
| D2-H (regresar ya) | 1314 m | 7.4° | 12.7° | 20.0° | 2 % |
| D2-REF (refugio) | 14 m | 12.8° | 13.8° | 13.8° | 0 % |
| REF-H (regreso tras el refugio) | 1317 m | 7.5° | 13.0° | 18.7° | 2 % |
| D2-P5 (subir al mirador alto) | 474 m | 17.0° | 37.7° | 61.9° | 39 % |
| P5-H (regreso desde el mirador) | 1570 m | 10.2° | 15.6° | 44.8° | 11 % |

Notas:
- Umbrales de pendiente: 15° para caminar y 23° de peligro (Curiosity se desvió 150 m ante una pendiente de 23° para buscar una de menos de 15°; NASA/JPL, 2023).
- El DEM a 2 m suaviza las crestas de 1–2 m del boxwork; las pendientes muy cortas pueden ser más fuertes en el terreno real.
- P3 y P4 están a unos 10 m: así de cerca están la cresta y la hondonada que perforó Curiosity. Las diferencias de escala con el guion están en `docs/correcciones_guion.md`.
- El depósito (DEP) y el refugio (REF) son reglas del juego; sus lugares son reales.
