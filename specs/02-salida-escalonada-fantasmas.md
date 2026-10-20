# SPEC 02 — Salida escalonada de los fantasmas

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-19
> **Objetivo:** Sacar a los cuatro fantasmas de la pen en fila y escalonados cada 5 segundos, sin que ninguno quede atascado dentro.

## Por qué existe este spec

Hoy `GHOST_STARTS` deja a Blinky fuera de la pen y a Pinky, Inky y Clyde dentro. La salida se resuelve con `isInPen()` y un objetivo forzado a la puerta, pero no hay estado de espera ni orden de salida: los tres fantasmas de dentro intentan salir a la vez. Además, cuando un fantasma activo vuelve a entrar en la pen, la regla de no revertir lo hace deambular dentro antes de encontrar la salida.

SPEC 01 aprobó que Blinky naciera fuera de la pen. Este spec reemplaza ese punto y el criterio de aceptación que exigía a los tres fantasmas de dentro salir en los primeros 5 segundos.

## Alcance

**Incluye:**

- Los cuatro fantasmas empiezan dentro de la pen, en la fila `y = 14`, columnas 12 a 15.
- Calendario de salida: Blinky a los 0 s, Pinky a los 5 s, Inky a los 10 s y Clyde a los 15 s.
- Los fantasmas que esperan su turno permanecen inmóviles en su celda.
- Reloj de tiempo real alimentado por el timestamp de `requestAnimationFrame`.
- Estados explícitos por fantasma: `waiting`, `exiting` y `active`.
- Salida dirigida a la celda transitable sobre la puerta, con reversión de 180° permitida mientras el fantasma está saliendo.
- Reentrada permitida: si un fantasma activo vuelve a entrar en la pen, pasa a `exiting` y la abandona otra vez.
- `resetPositions()` reinicia posiciones, estados y reloj, de modo que el calendario se repite al perder una vida.
- Actualización de las invariantes de `AGENTS.md` con la salida escalonada.

**Fuera de alcance (para specs futuros):**

- Bloquear la puerta de la pen para los fantasmas activos.
- Animación de rebote o deambular de los fantasmas que esperan.
- Ciclo de fases persecución/dispersión con temporizador.
- Power pellets, modo asustado, puntuación por comer fantasmas y estado `eaten`.
- Velocidades distintas por fantasma o dificultad progresiva.
- Cambios visuales en `src/js/render.js`, sprites o HUD.
- Niveles y vidas extra.

## Modelo de datos

`GHOST_STARTS` en `src/js/maze.js` cambia a cuatro entradas, todas en la fila de la pen:

```js
const GHOST_STARTS = [
  { x: 14, y: 14, kind: 'blinky' }, // primera salida, por la columna 14
  { x: 13, y: 14, kind: 'pinky' },  // segunda salida, por la columna 13
  { x: 12, y: 14, kind: 'inky' },   // tercera salida, se desplaza a la columna 13
  { x: 15, y: 14, kind: 'clyde' },  // cuarta salida, se desplaza a la columna 14
];
```

Constantes nuevas en `src/js/game.js`:

```js
const GHOST_RELEASE_MS = {
  blinky: 0,
  pinky: 5000,
  inky: 10000,
  clyde: 15000,
};
const PEN_EXIT_ROW = 11; // fila transitable justo encima de la puerta
const MAX_DT_MS = 100;   // tope de delta para evitar saltos tras una pestaña en segundo plano
```

El objeto de cada fantasma añade `mode`, con uno de los valores `'waiting'`, `'exiting'` o `'active'`:

```js
{
  x: 14,
  y: 14,
  dir: 'up',
  speed: GHOST_SPEED,
  kind: 'blinky',
  mode: 'waiting',
}
```

`game` añade dos campos para el calendario, inicializados en `createGame()`:

```js
ghostClockMs: 0,             // tiempo acumulado desde el inicio de la ronda
lastTime: performance.now(), // timestamp del último update
```

Funciones nuevas o modificadas en `src/js/game.js`:

- `exitCell( g )` — devuelve `{ x: g.x >= 14 ? 14 : 13, y: PEN_EXIT_ROW }`. La columna es la puerta más cercana a la posición actual.
- `chooseDirToward( grid, g, target, allowReverse )` — el cuarto parámetro permite ignorar la prohibición de revertir. Solo `exiting` lo usa.
- `moveGhost( game, g )` — gestiona los tres estados y las transiciones.
- `resetPositions( game )` — además de posiciones y direcciones, deja a los cuatro en `mode: 'waiting'` y pone `ghostClockMs = 0`.

`update( game, nowMs )` recibe el timestamp de `main.js` y acumula el delta antes de mover:

```js
const dt = Math.min( nowMs - game.lastTime, MAX_DT_MS );
game.lastTime = nowMs;
game.ghostClockMs += dt;
```

Transiciones de estado:

- `waiting` → `exiting` cuando `game.ghostClockMs >= GHOST_RELEASE_MS[ g.kind ]`.
- `exiting` → `active` cuando el fantasma llega a la fila `PEN_EXIT_ROW`.
- `active` → `exiting` cuando `isInPen( g )` vuelve a ser verdadero.

Mientras está `waiting`, el fantasma no se mueve. Mientras está `exiting`, su objetivo es `exitCell( g )` y puede revertir. Mientras está `active`, usa `GHOST_TARGETS` como hasta ahora.

## Plan de implementación

1. Actualizar `GHOST_STARTS` en `src/js/maze.js` con las cuatro entradas en `y = 14`. Prueba manual: al abrir el juego se ven los cuatro fantasmas en fila dentro de la pen y la partida sigue siendo jugable con la lógica actual.
2. Pasar el timestamp de `requestAnimationFrame` a `update( game, now )` desde `src/js/main.js` y acumular `ghostClockMs` con el tope `MAX_DT_MS` en `src/js/game.js`. Prueba manual: la partida se comporta igual que antes, sin errores en consola.
3. Añadir `mode: 'waiting'` en `createGame()` y hacer que `moveGhost()` no mueva a los fantasmas en espera hasta que `ghostClockMs` alcance `GHOST_RELEASE_MS[ g.kind ]`. Prueba manual: Blinky sale de inmediato y Pinky, Inky y Clyde salen a los 5, 10 y 15 segundos aproximadamente.
4. Añadir `exitCell()` y el parámetro `allowReverse` a `chooseDirToward()`. En estado `exiting`, usar ese objetivo y ese permiso; al llegar a la fila 11, cambiar a `active`. Prueba manual: cada fantasma sale en línea recta por la puerta y ninguno se queda dando vueltas dentro.
5. Detectar la reentrada: si un fantasma `active` cae en `isInPen()`, devolverlo a `exiting`. Prueba manual: en una partida larga, si un fantasma vuelve a la pen, la abandona en menos de 2 segundos.
6. Hacer que `resetPositions()` reinicie `mode` y `ghostClockMs`. Prueba manual: perder una vida y comprobar que los cuatro reaparecen en la fila y que el calendario 0/5/10/15 se repite.
7. Añadir la regla de salida escalonada a las invariantes de `AGENTS.md` y revisar los comentarios en español. Prueba manual: partida completa con inicio, pérdida de vida y reinicio, sin errores en consola.

Cada paso deja el juego ejecutable y se puede confirmar por separado.

## Criterios de aceptación

- [ ] `GHOST_STARTS` tiene cuatro entradas con `kind` `blinky`, `pinky`, `inky` y `clyde`, todas en `y = 14` y en las columnas 12, 13, 14 y 15.
- [ ] Al iniciar una partida se ven los cuatro fantasmas en fila dentro de la pen.
- [ ] Blinky empieza a salir en el primer frame de juego.
- [ ] Pinky cruza la puerta a los 5,0 s ± 0,5 s, Inky a los 10,0 s ± 0,5 s y Clyde a los 15,0 s ± 0,5 s.
- [ ] Las coordenadas de un fantasma en `waiting` no cambian hasta su turno.
- [ ] Cada fantasma alcanza la fila 11 antes de usar el objetivo de su personalidad.
- [ ] Tras su liberación, cada fantasma abandona la pen en 2 segundos o menos.
- [ ] Si un fantasma activo vuelve a entrar en la pen, la abandona en 2 segundos o menos y no se queda en bucle dentro.
- [ ] Tras perder una vida, los cuatro vuelven a la fila de la pen y el calendario se repite con Blinky inmediato.
- [ ] Los intervalos siguen siendo de ~5 s con la pestaña a 60 Hz y a 144 Hz.
- [ ] Después de salir, cada fantasma mantiene su personalidad de SPEC 01: Blinky persigue, Pinky se adelanta, Inky usa a Blinky y Clyde se retira a su esquina.
- [ ] Ningún fantasma atraviesa una pared ni sale del laberinto fuera de la fila del túnel.
- [ ] La consola del navegador no muestra errores al iniciar, jugar, perder una vida y reiniciar.
- [ ] `src/js/game.js` no contiene `Math.random`.

## Decisiones tomadas y descartadas

- **Sí:** Blinky empieza dentro de la pen en `(14,14)` y sale primero. Es lo pedido y deja a los cuatro en una sola fila; reemplaza la decisión de SPEC 01 de hacerlo nacer fuera.
- **Sí:** calendario 0/5/10/15 s. Blinky sale de inmediato y los otros tres mantienen el intervalo de 5 s pedido.
- **Sí:** fila en `y = 14`, columnas 12 a 15. Solo cambia la posición de Blinky; Pinky, Inky y Clyde conservan la suya.
- **Sí:** los fantasmas en espera quedan inmóviles. Es predecible, no tapan la salida del siguiente y se verifica con solo mirar sus coordenadas.
- **Sí:** tiempo real con el timestamp de `requestAnimationFrame`. Un contador de frames haría que 5 s fueran ~2 s a 144 Hz.
- **Sí:** tope de 100 ms por delta. Evita que una pestaña en segundo plano libere a los cuatro fantasmas de golpe al volver.
- **Sí:** el objetivo de salida es la fila 11, no la puerta. Apuntar a la puerta deja al fantasma en el borde de la pen y alarga la transición a `active`.
- **Sí:** permitir revertir solo en `exiting`. Es la forma de garantizar que un fantasma dentro encuentre la salida sin dar vueltas.
- **Sí:** permitir la reentrada de fantasmas activos. Es la decisión tomada; si vuelven a entrar, `exiting` los saca otra vez.
- **No:** bloquear la puerta para fantasmas activos. Se descartó para respetar la reentrada pedida.
- **No:** animación de rebote mientras esperan. Añade estado y no es necesaria para cumplir el objetivo.
- **No:** mantener el calendario entre vidas. Reiniciarlo es consistente con `resetPositions()` y fácil de verificar.
- **No:** convertir el movimiento a delta time. Las velocidades siguen siendo por frame; este spec solo hace que la liberación use tiempo real.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La pestaña pasa a segundo plano y el delta acumulado libera a todos los fantasmas a la vez. | `MAX_DT_MS = 100` limita el salto; las salidas se retrasan, no se amontonan. |
| Este spec cambia dos criterios de SPEC 01: Blinky fuera y los tres de dentro saliendo en 5 s. | Se documenta aquí el reemplazo y se actualizan las invariantes de `AGENTS.md`. |
| Con reentrada permitida, un fantasma activo puede oscilar alrededor de la puerta. | Al entrar en la pen pasa a `exiting`, revierte sin restricción y apunta a la fila 11; se verifica que salga en 2 s o menos. |
| El movimiento sigue siendo por frame y la liberación por tiempo real. | A frecuencias altas los fantasmas se mueven más rápido, pero los intervalos de salida siguen siendo de 5 s. Convertir el movimiento a delta time queda para otro spec. |
| El primer `dt` tras pulsar Reiniciar podría ser grande. | `createGame()` inicializa `lastTime` con `performance.now()` y `startGame()` crea una partida nueva. |

## Lo que **no** entra en este spec

- Bloquear la puerta de la pen para fantasmas activos.
- Animación de espera o rebote dentro de la pen.
- Fases de persecución y dispersión.
- Power pellets, fantasmas asustados y puntuación por comerlos.
- Ojos volviendo a la pen y estado `eaten`.
- Velocidades por fantasma, niveles y progresión de dificultad.
- Cambios en el dibujo de `src/js/render.js`.

Cada uno de esos puntos, si se implementa, va en su propio spec.
