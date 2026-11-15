# Fondos que faltan (para ilustradores)

Faltan **14 fondos**. Mientras no lleguen, el juego muestra el fondo existente más parecido del mismo lugar con un desenfoque suave. El jugador nunca ve un aviso; en modo desarrollo sale un mensaje en la consola del navegador.

**Cuando llegue un fondo:** cópialo a `Frontend/public/img/fondos/` con el **nombre exacto** de la tabla. Puede ser `.jpg`, `.png` o `.webp`; el juego prueba las tres. No hay que cambiar código. Después borra su fila de esta tabla: la prueba `npm run probar` (archivo `tools/probar-pendientes.mjs`) avisa si la lista queda desactualizada.

Formato de los fondos actuales: horizontal 16:9 (se recorta como `cover`, centrado), estilo de `bg_c03_base.jpg` a `bg_c05_transicion.jpg`.

| Archivo esperado | Lugar | Escenas donde se ve | Qué debe mostrar (según el guion) | Mientras tanto se usa |
|---|---|---|---|---|
| `bg_c06_hondonada.jpg` | Marswalk | c06_01, c06_02a, c06_02b, c06_03, c06_04, c06_05 | Hondonada baja con arena rojiza y, al fondo, las primeras crestas; en c06_01 llega la tormenta de polvo | `bg_c05_transicion.jpg` |
| `bg_c06_atasco.jpg` | Marswalk | c06_atasco | Las botas hundidas en arena suelta, a mitad de la hondonada | `bg_c05_transicion.jpg` |
| `bg_c07_crestas.jpg` | Marswalk | c07_01, c07_02, c07_03b, c07_04, c07_05a, c07_05b | Crestas boxwork de 1 a 2 m formando una red, como una telaraña | `bg_c05_transicion.jpg` |
| `bg_c07_deposito.jpg` | Marswalk | c07_03a | Depósito de suministros que dejó un rover de apoyo (O2, batería, comida, parche) | `bg_c05_transicion.jpg` |
| `bg_c08_bajada.jpg` | Marswalk | c08_01, c08_caida, c08_02a, c08_02b, c08_03, c08_kit | Borde de la cresta y bajada a la hondonada de al lado | `bg_c05_transicion.jpg` |
| `bg_c08_carbonatos.jpg` | Marswalk | c08_04, c08_05a, c08_05b | Fondo de la hondonada con roca clara (carbonatos) | `bg_c05_transicion.jpg` |
| `bg_c09_alerta.jpg` | Marswalk (regreso) | c09_01, c09_02a, c09_02b, c09_03, c09_04a, c09_05, c09_bat, c09_rac, c09_06 | Camino de regreso a la base con el cielo de la alerta solar | `bg_c04_mirador.jpg` |
| `bg_c09_refugio.jpg` | Marswalk (regreso) | c09_04b | Al pie de una pared de roca de una cresta, que tapa parte del cielo | `bg_c04_mirador.jpg` |
| `bg_c09_mirador_alto.jpg` | Marswalk (regreso) | c09_04c, c09_caida | Cima alta con vista lejana; subida y bajada empinadas | `bg_c04_mirador.jpg` |
| `final_bueno.jpg` | Final (base) | final_bueno | El módulo de ascenso despega con el atardecer marciano de fondo | `bg_c03_base.jpg` |
| `final_intermedio.jpg` | Final (base) | final_intermedio_tiempo, final_intermedio_rescate, final_intermedio_radiacion | Base Aurora: el módulo ya se fue o llega tarde, y toca esperar el rescate | `bg_c03_base.jpg` |
| `final_malo.jpg` | Final (Marswalk) | final_malo_oxigeno, final_malo_integridad, final_malo_radiacion | La caminata termina mal: terreno de Marte, sin dramatismo gráfico (juego 13+) | `bg_c05_transicion.jpg` |
| `bg_tormenta_polvo.jpg` | Marswalk | ficha de peligro Z_TORMENTA (`pois.json`, campo `pov`) | Tormenta de polvo que oscurece el cielo | `bg_c05_transicion.jpg` |
| `bg_c10_esclusa.jpg` | Base | ficha de peligro Z_PERCLORATOS (`pois.json`, campo `pov`) | Esclusa de la base, donde se limpia el traje antes de entrar | `bg_c03_base.jpg` |

Las dos últimas filas son del campo `pov` de `pois.json`, que hoy ningún componente dibuja. Se piden para cuando se usen las fichas de peligro.
