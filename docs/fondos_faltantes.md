# Fondos que faltan (para ilustradores)

Faltan **5 fondos**. Mientras no lleguen, el juego muestra el fondo existente más parecido del mismo lugar con un desenfoque suave. El jugador nunca ve un aviso; en modo desarrollo sale un mensaje en la consola del navegador.

**Cuando llegue un fondo:** cópialo a `Frontend/public/img/fondos/` con el **nombre exacto** de la tabla. Puede ser `.jpg`, `.png` o `.webp`; el juego prueba las tres. No hay que cambiar código. Después borra su fila de esta tabla: la prueba `npm run probar` (archivo `tools/probar-pendientes.mjs`) avisa si la lista queda desactualizada.

Formato de los fondos actuales: horizontal 16:9 (se recorta como `cover`, centrado), estilo de `bg_c03_base.jpg` a `bg_c05_transicion.jpg`.

| Archivo esperado | Lugar | Escenas donde se ve | Qué debe mostrar (según el guion) | Mientras tanto se usa |
|---|---|---|---|---|
| `bg_c06_hondonada.jpg` | Marswalk | c06_01, c06_02a, c06_02b, c06_03, c06_04, c06_05 | Hondonada baja con arena rojiza y, al fondo, las primeras crestas; en c06_01 llega la tormenta de polvo | `bg_c05_transicion.jpg` |
| `bg_c06_atasco.jpg` | Marswalk | c06_atasco | Las botas hundidas en arena suelta, a mitad de la hondonada | `bg_c05_transicion.jpg` |
| `bg_c07_crestas.jpg` | Marswalk | c07_01, c07_02, c07_03b, c07_04, c07_05a, c07_05b | Crestas boxwork de 1 a 2 m formando una red, como una telaraña | `bg_c05_transicion.jpg` |
| `bg_c07_deposito.jpg` | Marswalk | c07_03a | Depósito de suministros que dejó un rover de apoyo (O2, batería, comida, parche) | `bg_c05_transicion.jpg` |
| `bg_c10_esclusa.jpg` | Base | ficha de peligro Z_PERCLORATOS (`pois.json`, campo `pov`) | Esclusa de la base, donde se limpia el traje antes de entrar | `bg_c03_base.jpg` |

La última fila es del campo `pov` de `pois.json`, que hoy ningún componente dibuja. Se piden para cuando se usen las fichas de peligro.
