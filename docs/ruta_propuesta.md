# Propuesta de la ruta real del juego (Parte 2)

**Estado: propuesta para revisar (usuaria y Sefora).** Todos los puntos están en `Frontend/src/data/ruta_real.json`: para mover uno, se cambia su lat/lon ahí y el mapa 2D, el minimapa y el 3D lo toman de ese archivo.

**Criterio.** Las tres paradas de ciencia son las **perforaciones reales de Curiosity en 2025** (PDS PLACES, doi:10.17189/1520397): Altadena (transición), Nevado Sajama (cresta) y Valle de la Luna (hondonada con carbonatos). H, D1 y DEP están **sobre el recorrido real del rover**; P1, D2 y P5 se eligieron con el relieve real (DEM 1 m de USGS a 2 m) según la escena de cada capítulo. Los tramos a pie son **caminos de menor costo sobre el relieve real**: evitan pendientes de más de 15° y casi prohíben las de más de 23°. El atajo por la arena y la subida al mirador alto son rectas a propósito (son las opciones arriesgadas). El recorrido real de Curiosity se muestra como capa aparte. Coordenadas: latitud planetocéntrica y longitud Este 0–360°. Distancias: haversine sobre una esfera de 3.396,2 km (NASA Mars Fact Sheet).

**Distancias.** Ida H → P4: **1843 m**; regreso P4 → H: **1435 m**; total **3.28 km**. P5 es opcional: 451 m más desde P4.

| Punto | Capítulo | Lat | Lon E | Elevación | Qué hay en el terreno real | Pendiente | Distancia al anterior | Fuente |
|---|---|---|---|---|---|---|---|---|
| H · Base Aurora | 3, 10 | -4.788178 | 137.391803 | -3719.1 m | Terreno llano sobre el recorrido real de Curiosity (sitio 113, sol 4459, 2025-02-20), unos 1,0 km antes de Altadena. | 4.4° (punto: 4.0°) | — | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| P1 · Mirador de Mount Sharp | 4 | -4.793512 | 137.385889 | -3667.2 m | Loma 11.5 m más alta que su entorno de 150 m, a menos de 150 m del recorrido de Curiosity; desde aquí se ven las capas de Mount Sharp al sur. | 18.3° (punto: 5.5°) | 784 m desde H | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| P2 · Zona de transición (Altadena) | 5 | -4.799847 | 137.383541 | -3647.1 m | Altadena: primera perforación de Curiosity en el boxwork (8 jun 2025), en la transición antes de las crestas. | 8.7° (punto: 15.7°) | 427 m desde P1 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://science.nasa.gov/blog/curiosity-blog-sols-4568-4569-a-close-look-at-the-altadena-drill-hole-and-tailings/ |
| D1 · Hondonada (decisión de ruta) | 6 | -4.803606 | 137.380074 | -3640.7 m | Hondonada sobre el recorrido (sol 4596): 3.0 m más baja que su entorno de 80 m y de textura lisa en la ortofoto (arena). | 9.8° (punto: 12.7°) | 308 m desde P2 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm |
| P3 · Cresta boxwork (Nevado Sajama) | 7 | -4.808008 | 137.381004 | -3607.7 m | Nevado Sajama: cresta boxwork donde Curiosity perforó (sol 4718); arcillas en la cresta. | 13.7° (punto: 14.1°) | 314 m desde D1 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://science.nasa.gov/solar-system/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama |
| DEP · Depósito de suministros | 7 | -4.811552 | 137.381812 | -3590.1 m | Punto llano junto al recorrido, a 215 m de la cresta. El depósito es ficción del juego; el lugar es real. | 7.4° (punto: 4.9°) | 229 m desde P3 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| D2 · Bajar la cresta (decisión) | 8 | -4.807987 | 137.380996 | -3608.4 m | Borde de la cresta entre Nevado Sajama y Valle de la Luna: pendiente de 23° en el DEM a 2 m (la cresta mide 1–2 m). | 13.9° (punto: 23.3°) | 1 m desde P3 | https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m · https://science.nasa.gov/solar-system/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama |
| P4 · Hondonada con carbonatos (Valle de la Luna) | 8, 9 | -4.807839 | 137.381035 | -3610.4 m | Valle de la Luna: perforación de Curiosity en la hondonada Monte Grande (sol ~4693); carbonatos en la hondonada. | 14.2° (punto: 19.7°) | 9 m desde D2 | https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv · https://science.nasa.gov/solar-system/curiosity-blog-sols-4695-4701-searching-for-answers-at-monte-grande |
| P5 · Mirador alto (opcional) | 9 | -4.807515 | 137.388656 | -3523.7 m | Cima 31 m más alta que su entorno, a 452 m de P4; la subida directa pasa por pendientes de hasta 63°. | 29.8° (punto: 11.9°) | 451 m desde P4 | https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m · https://www.jpl.nasa.gov/news/nasas-curiosity-rover-faces-its-toughest-climb-yet-on-mars/ |

## Tramos (pendiente calculada cada 2 m sobre el DEM a 2 m)

| Tramo | Largo | Pendiente media | Percentil 90 | Máxima | Parte > 15° |
|---|---|---|---|---|---|
| H-P1 | 784 m | 8.4° | 13.8° | 22.8° | 4 % |
| P1-P2 | 427 m | 7.8° | 13.6° | 18.9° | 5 % |
| P2-D1 | 308 m | 7.7° | 12.7° | 17.8° | 2 % |
| D1-P3 (camino firme) | 314 m | 10.2° | 14.6° | 18.8° | 5 % |
| D1-P3 (atajo por la arena) | 267 m | 13.8° | 21.6° | 33.8° | 41 % |
| P3-DEP (desvío) | 229 m | 8.1° | 13.2° | 16.9° | 2 % |
| P3-D2 | 1 m | 20.2° | 23.3° | 23.3° | 67 % |
| D2-P4 (de frente) | 9 m | 18.7° | 21.9° | 23.3° | 100 % |
| D2-P4 (rodear) | 33 m | 15.6° | 21.5° | 23.3° | 59 % |
| P4-P5 (mirador alto, opcional) | 451 m | 16.1° | 34.5° | 62.6° | 40 % |
| P4-H (regreso) | 1435 m | 7.7° | 13.2° | 22.1° | 3 % |

Notas:
- Umbrales de pendiente: 15° para caminar y 23° de peligro (Curiosity se desvió 150 m ante una pendiente de 23° para buscar una de menos de 15°; NASA/JPL, 2023).
- El DEM a 2 m suaviza las crestas de 1–2 m del boxwork; las pendientes muy cortas pueden ser más fuertes en el terreno real.
- "Rodear" (capítulo 8) no tiene un recorrido medido aparte: se dibuja como un desvío corto a un lado de la cresta.
- El depósito (DEP) es ficción del juego; su lugar es real y llano.
- Las paradas P3 y P4 están a unos 10 m: así de cerca están la cresta y la hondonada que perforó Curiosity.
