// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Prioridad fija de desempate, como el arcade original.
const DIR_PRIORITY = [ 'up', 'left', 'down', 'right' ];

// Zona interior de la pen y puerta de salida.
const PEN = { x0: 11, x1: 16, y0: 13, y1: 15 };
const PEN_DOOR = { x: 13, y: 12 };
// Esquina de Clyde cuando esta cerca de Pac-Man.
const CLYDE_CORNER = { x: 1, y: 29 };

function isInPen( g ) {
  const x = Math.round( g.x );
  const y = Math.round( g.y );
  return x >= PEN.x0 && x <= PEN.x1 && y >= PEN.y0 && y <= PEN.y1;
}

// Celda (entera) que ocupa Pac-Man.
function pacmanCell( game ) {
  return { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };
}

// Objetivos por personalidad. Devuelven una celda de referencia: apuntar a
// una pared es valido porque solo se usa para medir distancias.
const GHOST_TARGETS = {
  // Persigue directo a Pac-Man.
  blinky: ( game ) => pacmanCell( game ),

  // Apunta 4 celdas por delante de la direccion de Pac-Man.
  pinky: ( game ) => {
    const d = DIRS[ game.pacman.dir ] || { x: 0, y: 0 };
    const cell = pacmanCell( game );
    return { x: cell.x + d.x * 4, y: cell.y + d.y * 4 };
  },

  // Flanquea: pivote a 2 celdas por delante de Pac-Man, proyectado desde
  // Blinky. Si Blinky no existe, usa la celda de Pac-Man como referencia.
  inky: ( game ) => {
    const d = DIRS[ game.pacman.dir ] || { x: 0, y: 0 };
    const cell = pacmanCell( game );
    const px = cell.x + d.x * 2;
    const py = cell.y + d.y * 2;
    const b = game.ghosts.find( ( g ) => g.kind === 'blinky' );
    const bx = b ? Math.round( b.x ) : cell.x;
    const by = b ? Math.round( b.y ) : cell.y;
    return { x: px + ( px - bx ), y: py + ( py - by ) };
  },

  // Persigue de lejos; a 8 celdas o menos se retira a su esquina.
  clyde: ( game, g ) => {
    const cell = pacmanCell( game );
    const dist = Math.abs( Math.round( g.x ) - cell.x ) + Math.abs( Math.round( g.y ) - cell.y );
    return dist > 8 ? cell : CLYDE_CORNER;
  },
};

// Objetivo del fantasma: la puerta si esta dentro de la pen; si no, el de
// su personalidad.
function ghostTarget( game, g ) {
  if ( isInPen( g ) ) return PEN_DOOR;
  const fn = GHOST_TARGETS[ g.kind ];
  return fn ? fn( game, g ) : pacmanCell( game );
}

// Elige la direccion valida que mas acerque al objetivo. Los empates se
// resuelven por DIR_PRIORITY, asi el comportamiento es determinista.
function chooseDirToward( grid, g, target ) {
  const options = DIR_PRIORITY.filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  if ( !options.length ) return OPPOSITE[ g.dir ];

  let best = options[ 0 ];
  let bestDist = Infinity;
  for ( const dir of options ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

function decideGhost( game, g ) {
  g.dir = chooseDirToward( game.grid, g, ghostTarget( game, g ) );
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
