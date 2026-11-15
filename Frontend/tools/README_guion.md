# Guion de "Cómo no morir en Marte" — formato y reglas del motor

Borrador completo de los 10 capítulos + 7 escenas de final, listo para cargar en `Frontend/src/data/capitulos/`.
**Sefora** revisa la ciencia, **Valeria** revisa que cada escena tenga su fondo y expresión, **Kelly** revisa el flujo.
Después de cualquier cambio: `node tools/validar.mjs src/data/capitulos` (revisa enlaces y simula todas las rutas).

## Archivos

| Archivo | Contenido |
| --- | --- |
| `capitulos/index.json` | Título, estado inicial de las barras y lista de los 10 capítulos (archivo, escena de inicio, fondo de la tarjeta) |
| `capitulos/cap01.json` … `cap10.json` | Escenas de cada capítulo + `dato` y `fuentes` del capítulo (para la Guía de supervivencia) |
| `capitulos/finales.json` | 7 escenas de final: bueno, intermedio (tiempo / rescate / radiación), malo (oxígeno / integridad / radiación) |
| `validar.mjs` | Validador de enlaces + simulador de todas las rutas |

## Campos de una escena

| Campo | Qué hace |
| --- | --- |
| `id` | Único en todo el juego (`c06_02a`) |
| `fondo` | Archivo en `public/img/fondos/` (nombres de la lista de Valeria) |
| `astro` | Pose del astronauta: `neutral`, `caminando`, `muestra`, `herido`, `asustado` |
| `zinnia` | Ambiente de la escena cuando Zinn-IA no habla: `feliz`/`curiosa` (se ve normal), `alerta` (seria), `peligro` (asustada), `triste` (llorona). También acepta las 6 expresiones nuevas |
| `expresion` | En una línea de Zinn-IA: `normal`, `ojos-cerrados`, `seria`, `asustada`, `enojada` o `llorona` (imágenes en `public/zinnia/`). Sin el campo, normal. Otra palabra se muestra como normal. Con la batería en 0 se ve en modo semilla |
| `lineas` | Lista de `{ quien, texto }`. `quien` puede ser `Zinn-IA`, `Narración`, `{nombre}` o `Control de misión`. Una línea con `requiere` solo se muestra si se cumple. Una línea con `capa` cambia la capa visible del minimapa |
| `efecto` | Cambios de barras al **entrar** a la escena (tramos de camino, atascos, caídas) |
| `opciones` | Botones: `{ texto, efecto?, marca?, muestra?, pronombre?, probabilidad?, requiere?, ir }` |
| `probabilidad` | En una opción: `{ exito: 0.6, ir_fallo: "c06_atasco" }`. Con éxito va a `ir`, si no a `ir_fallo`. En **modo demo** siempre es éxito |
| `ramas` | Saltos automáticos según condiciones: `[{ si: { flag: "racion_extra" }, ir: "c06_04" }]`; si ninguna se cumple, usa `ir` |
| `ir` | Escena siguiente cuando no hay opciones |
| `siguienteCapitulo` | Número del capítulo al que se pasa (muestra la tarjeta del capítulo) |
| `poi` | Punto del mapa que se resalta: `P1`–`P5`, `D1`, `DEP` (depósito) |
| `abrirTablet` / `capa` | Abre el minimapa ampliado y muestra esa capa: `optica`, `relieve`, `termico`, `minerales`, `radiacion` |
| `accion` | `pedirNombre`, `mostrarHUD`, `evaluarFinal`, `pantallaResumen` |

Condiciones (`requiere`, `ramas[].si`): `flag`, `noFlag`, `muestrasMin`, `muestrasMax`.

Textos: `{nombre}` = nombre del jugador; `{muestras}` = número de muestras; `{o|a|e}` y cualquier `{x|y|z}` = forma para él / ella / elle.

## Reglas del motor (deben ser iguales a las de `validar.mjs`)

1. Barras entre 0 y 100. El reloj (`minutos`) empieza en 210 y puede quedar negativo.
2. **Batería en 0**: Zinn-IA se apaga, el minimapa muestra solo la imagen base, y las pérdidas de oxígeno y alimentación se duplican.
3. **Alimentación bajo 30**: las pérdidas de tiempo se multiplican por 1,5 (paso lento). **Alimentación en 0**: marca `rescate`.
4. **Integridad bajo 30**: fuga de aire, −10 de oxígeno extra en cada decisión.
5. Después de cada efecto: oxígeno 0 → `final_malo_oxigeno`; integridad 0 → `final_malo_integridad`; radiación ≥ 100 → `final_malo_radiacion`.
6. En `evaluarFinal` (capítulo 10), en este orden: los malos de arriba → reloj negativo → `final_intermedio_tiempo` → marca `rescate` → `final_intermedio_rescate` → radiación ≥ 70 → `final_intermedio_radiacion` → si no, `final_bueno`.

## Marcas que conectan capítulos

| Marca | Se gana en | Efecto después |
| --- | --- | --- |
| `racion_extra` | Cap. 1 (racionar) | Cap. 6: opción de comer la ración (+25 alimentación) |
| `equipo_bateria` / `equipo_kit` / `equipo_raciones` | Cap. 3 | Cap. 9 (+40 batería) / Cap. 8 (+30 integridad) / Cap. 9 (+30 alimentación) |
| `clima_revisado` | Cap. 4 | Cap. 9: alerta con 20 min de ventaja; sin ella, +10 radiación |
| `muestra1_valiosa` | Cap. 5 (roca de CRISM) | Puntaje y epílogo |
| `deposito` | Cap. 7 | Recarga O₂ +20, batería +30, alimentación +25, integridad +10 |
| `mirador_alto` | Cap. 9 | Línea extra en el final bueno |

## Equilibrio actual (simulación de todas las rutas)

Jugando al azar: 61 % final bueno, 24 % intermedio, 15 % malo; las 7 variantes de final son alcanzables.
Un jugador cuidadoso que toma las 3 muestras llega al final bueno solo si regresa en cuanto suena la alerta solar.
Si cambian números, vuelvan a correr `node tools/validar.mjs src/data/capitulos` y revisen que ningún final quede en 0 %.

## Uso en el PDF

La salida del simulador es evidencia de rigor para el apartado 6 (resultados): número de rutas posibles y distribución de finales.
