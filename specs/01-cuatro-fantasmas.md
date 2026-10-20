# SPEC 01 — Cuatro fantasmas con personalidad propia

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-10-19
> **Objetivo:** Ampliar el juego a cuatro fantasmas con las personalidades clásicas de Pac-Man, todos con la misma velocidad y sin aleatoriedad en su toma de decisiones.

## Por qué existe este spec

Hoy el juego arranca con dos fantasmas definidos en `GHOST_STARTS`: uno llamado `hunter` que persigue con distancia Manhattan y otro `random` que elige al azar. El objetivo es que cada fantasma se sienta distinto y reconocible, no solo que haya más.

Se descarta el ciclo clásico de fases persecución/dispersión para que el spec quede contenido. La personalidad de cada fantasma se mantiene constante durante toda la partida.

## Alcance

**Incluye:**

- Cuatro entradas en `GHOST_STARTS` con los `kind` `'blinky'`, `'pinky'`, `'inky'` y `'clyde'`.
- Blinky fuera de la pen; Pinky, Inky y Clyde dentro.
- Salida forzada de la pen: mientras un fantasma esté dentro, su objetivo es la puerta en `(13,12)`.
- Targeting clásico por personalidad, sin `Math.random` en `src/js/game.js`.
- Desempate entre direcciones con prioridad fija: arriba > izquierda > abajo > derecha.
- Colores clásicos asociados al `kind`, no a la posición en el array.
- `resetPositions()` devuelve los cuatro fantasmas a su posición y dirección iniciales.

**Fuera de alcance (para specs futuros):**

- Ciclo de fases persecución/dispersión con temporizador.
- Power pellets y modo asustado (fantasmas azules y comestibles).
- Estado `eaten`: ojos volviendo a la pen y reaparición.
- Velocidades distintas por fantasma o dificultad progresiva.
- Sprites, animaciones de falda o mirada más allá de lo que ya dibuja `render.js`.
- Niveles, puntuación extra por comer fantasmas y vidas extra.

## Modelo de datos

`GHOST_STARTS` en `src/js/maze.js` pasa de dos a cuatro entradas:

```js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' }, // fuera de la pen, sobre la puerta
  { x: 13, y: 14, kind: 'pinky' },  // dentro de la pen
  { x: 12, y: 14, kind: 'inky' },   // dentro de la pen
  { x: 15, y: 14, kind: 'clyde' },  // dentro de la pen
];
```

Constantes nuevas en `src/js/game.js` para la salida de la pen:

```js
const PEN = { x0: 11, x1: 16, y0: 13, y1: 15 };
const PEN_DOOR = { x: 13, y: 12 };
const CLYDE_CORNER = { x: 1, y: 29 };
```

El objeto de cada fantasma conserva su forma actual: `{ x, y, dir, speed, kind }`. Los objetivos se calculan en cada decisión y no se guardan en el estado. `speed` sigue siendo `GHOST_SPEED = 0.1` para los cuatro.

Funciones nuevas o reemplazadas en `src/js/game.js`:

- `isInPen( g )` — indica si el fantasma está dentro de `PEN`.
- `ghostTarget( game, g )` — devuelve `{ x, y }` según el `kind`, o `PEN_DOOR` si está en la pen.
- `chooseDirToward( grid, g, target )` — elige entre las direcciones válidas con prioridad fija arriba > izquierda > abajo > derecha.
- `GHOST_TARGETS` — tabla `kind -> función`, con `blinky`, `pinky`, `inky` y `clyde`.

Objetivos por personalidad (coordenadas de celda; apuntar a una pared es válido porque solo se usa como referencia de distancia):

- **Blinky:** la celda actual de Pac-Man.
- **Pinky:** 4 celdas por delante de la dirección actual de Pac-Man.
- **Inky:** sea `pivote` = 2 celdas por delante de Pac-Man; objetivo = `pivote + (pivote - Blinky)`.
- **Clyde:** si está a más de 8 celdas de Pac-Man, apunta a Pac-Man; si está a 8 o menos, apunta a `CLYDE_CORNER`.

Colores en `src/js/render.js`, indexados por `kind`:

```js
const GHOST_COLORS = {
  blinky: '#ff0000',
  pinky:  '#ffb8ff',
  inky:   '#00ffff',
  clyde:  '#ffb852',
};
```

## Plan de implementación

1. Actualizar `GHOST_STARTS` en `src/js/maze.js` con las cuatro entradas. Prueba manual: al abrir el juego se ven cuatro fantasmas, tres dentro de la pen y uno encima de la puerta.
2. Cambiar `GHOST_COLORS` en `src/js/render.js` a un mapa por `kind` y usarlo en `draw()`. Prueba manual: los cuatro fantasmas tienen colores distintos (rojo, rosa, cian, naranja).
3. En `src/js/game.js`, añadir `chooseDirToward()` con la prioridad fija y reescribir `decideGhost()` para usarla. Eliminar las ramas `hunter` y `random`. Prueba manual: los cuatro fantasmas persiguen a Pac-Man y no atraviesan paredes.
4. Añadir `PEN`, `PEN_DOOR` e `isInPen()`, y hacer que `ghostTarget()` devuelva la puerta cuando el fantasma está dentro. Prueba manual: Pinky, Inky y Clyde salen de la pen en los primeros segundos y la partida sigue siendo jugable.
5. Implementar `GHOST_TARGETS` con las cuatro personalidades y conectar `decideGhost()` a la tabla. Prueba manual: observar en pantalla que Blinky recorta distancia, Pinky se adelanta, Inky cruza y Clyde se aleja al acercarse.
6. Revisar comentarios en español, quitar restos del comportamiento aleatorio y comprobar `resetPositions()` con cuatro fantasmas. Prueba manual: perder una vida y verificar que los cuatro reaparecen en su posición inicial.

Cada paso deja el juego ejecutable y se puede confirmar por separado.

## Criterios de aceptación

- [ ] `GHOST_STARTS` tiene cuatro entradas con `kind` `blinky`, `pinky`, `inky` y `clyde`.
- [ ] `game.ghosts.length` es `4` al iniciar una partida y tras perder una vida.
- [ ] En pantalla se ven cuatro fantasmas con cuatro colores distintos.
- [ ] Blinky arranca fuera de la pen y su distancia Manhattan a Pac-Man disminuye en la mayoría de los frames mientras haya línea de pasillo.
- [ ] Pinky apunta a la celda 4 por delante de la dirección actual de Pac-Man.
- [ ] El objetivo de Inky cambia cuando cambia la posición de Blinky.
- [ ] Clyde persigue a Pac-Man cuando está a más de 8 celdas y se dirige a `CLYDE_CORNER` cuando está a 8 o menos.
- [ ] Pinky, Inky y Clyde salen de la pen en los primeros 5 segundos de partida y ninguno queda atascado dentro.
- [ ] Ningún fantasma atraviesa una pared ni sale del laberinto fuera de la fila del túnel.
- [ ] Ningún fantasma invierte 180° salvo en un callejón sin salida.
- [ ] `src/js/game.js` no contiene `Math.random`.
- [ ] La consola del navegador no muestra errores al iniciar, jugar, perder una vida y reiniciar.
- [ ] Para un mismo estado de partida, la decisión de un fantasma es siempre la misma (comportamiento determinista).

## Decisiones tomadas y descartadas

- **Sí:** las cuatro personalidades clásicas (Blinky, Pinky, Inky, Clyde). Son reconocibles y cada una produce un patrón de movimiento distinto sin añadir estado.
- **No:** personalidades inventadas o un cuarto fantasma aleatorio. El azar hace las pruebas manuales irreproducibles y diluye la sensación de "cada uno se comporta distinto".
- **Sí:** comportamiento constante, sin ciclo scatter/chase. Menos estado y menos código; las fases merecen su propio spec.
- **Sí:** los cuatro a `GHOST_SPEED = 0.1`. Es la velocidad que mantiene la alineación de celdas cada 10 frames; la agresividad se consigue con el targeting.
- **No:** Blinky a `0.125`. Un perseguidor tan rápido como Pac-Man resulta injusto en un laberinto sin power pellets.
- **Sí:** desempate con prioridad fija arriba > izquierda > abajo > derecha. Es determinista y verificable; el azar en los empates rompería la reproducibilidad.
- **Sí:** toda la lógica en `src/js/game.js`. Evita un archivo nuevo, un cambio en `index.html` y una actualización de `AGENTS.md` por una cantidad de código pequeña.
- **Sí:** Blinky nace fuera de la pen en `(13,11)`. El perseguidor presiona desde el primer segundo y se evita el problema de sacar cuatro fantasmas de una pen de 6×3.
- **Sí:** objetivo forzado a la puerta mientras el fantasma está en la pen. Sin esa regla, el targeting puede dejar a un fantasma dando vueltas dentro.
- **Sí:** colores indexados por `kind`. El color deja de depender del orden del array y sobrevive a reordenamientos.
- **Sí:** Clyde usa su esquina `(1,29)` cuando está cerca. Reproduce su rasgo clásico sin necesitar un estado global de dispersión.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un fantasma se queda en bucle dentro de la pen por la regla de no revertir. | El objetivo de la puerta hace que la salida sea directa; se verifica a mano en los primeros 5 segundos. Si aparece un bucle, permitir revertir dentro de la pen. |
| Inky necesita a Blinky y Blinky podría no existir en el array. | `ghostTarget()` busca por `kind` y, si no lo encuentra, usa la celda de Pac-Man como referencia. |
| Blinky nace sobre un dot en `(13,11)`. | El dot permanece hasta que Pac-Man lo come; no se dibuja mal ni altera la puntuación. |
| La prioridad fija sin reversión puede producir rutas repetitivas y predecibles. | Es el comportamiento esperado del arcade; cualquier mejora de variedad va en otro spec. |

## Lo que **no** entra en este spec

- Fases de persecución y dispersión.
- Power pellets, fantasmas asustados y puntuación por comerlos.
- Ojos volviendo a la pen y estado `eaten`.
- Velocidades por fantasma y progresión de dificultad.
- Niveles y sprites nuevos.

Cada uno de esos puntos, si se implementa, va en su propio spec.
