import type { ActiveEnemy, GridCoord, PlacedTower } from './types';

export interface PlacementValidation {
  valid: boolean;
  reason?: string;
  previewPath: GridCoord[];
  previewDistField: Int32Array | null;
}

const DIRS: ReadonlyArray<GridCoord> = [
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
  { col: -1, row: 0 },
];

export function cellIndex(col: number, row: number, cols: number): number {
  return row * cols + col;
}

export function buildBlockedGrid(
  cols: number,
  rows: number,
  obstacles: ReadonlyArray<GridCoord>,
  towers: ReadonlyArray<PlacedTower>,
  extraBlocked?: GridCoord
): Uint8Array {
  const blocked = new Uint8Array(cols * rows);
  for (const obs of obstacles) {
    if (obs.col >= 0 && obs.col < cols && obs.row >= 0 && obs.row < rows) {
      blocked[cellIndex(obs.col, obs.row, cols)] = 1;
    }
  }
  for (const tower of towers) {
    if (
      tower.col >= 0 &&
      tower.col < cols &&
      tower.row >= 0 &&
      tower.row < rows
    ) {
      blocked[cellIndex(tower.col, tower.row, cols)] = 1;
    }
  }
  if (
    extraBlocked &&
    extraBlocked.col >= 0 &&
    extraBlocked.col < cols &&
    extraBlocked.row >= 0 &&
    extraBlocked.row < rows
  ) {
    blocked[cellIndex(extraBlocked.col, extraBlocked.row, cols)] = 1;
  }
  return blocked;
}

export function computeDistanceField(
  cols: number,
  rows: number,
  blocked: Uint8Array,
  home: GridCoord
): Int32Array {
  const total = cols * rows;
  const dist = new Int32Array(total);
  dist.fill(-1);

  const homeIdx = cellIndex(home.col, home.row, cols);
  if (blocked[homeIdx] === 1) {
    return dist;
  }

  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  dist[homeIdx] = 0;
  queue[tail++] = homeIdx;

  while (head < tail) {
    const idx = queue[head++];
    const curDist = dist[idx];
    const c = idx % cols;
    const r = (idx - c) / cols;

    for (const dir of DIRS) {
      const nc = c + dir.col;
      const nr = r + dir.row;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
        continue;
      }
      const nIdx = cellIndex(nc, nr, cols);
      if (blocked[nIdx] === 1 || dist[nIdx] !== -1) {
        continue;
      }
      dist[nIdx] = curDist + 1;
      queue[tail++] = nIdx;
    }
  }

  return dist;
}

export function extractShortestPath(
  cols: number,
  rows: number,
  distField: Int32Array,
  start: GridCoord,
  home: GridCoord
): GridCoord[] {
  const startIdx = cellIndex(start.col, start.row, cols);
  if (distField[startIdx] === -1) {
    return [];
  }

  const path: GridCoord[] = [{ col: start.col, row: start.row }];
  let curCol = start.col;
  let curRow = start.row;
  let prevDc = 1;
  let prevDr = 0;
  const maxSteps = cols * rows;

  for (let step = 0; step < maxSteps; step++) {
    if (curCol === home.col && curRow === home.row) {
      break;
    }
    const curDist = distField[cellIndex(curCol, curRow, cols)];
    if (curDist <= 0) {
      break;
    }

    let bestNeighbor: GridCoord | null = null;
    let bestScore = -Infinity;

    for (const dir of DIRS) {
      const nc = curCol + dir.col;
      const nr = curRow + dir.row;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
        continue;
      }
      const nd = distField[cellIndex(nc, nr, cols)];
      if (nd === curDist - 1) {
        // Tie-break gently: keep straight direction first, then closeness to home axis
        const straightBonus = dir.col === prevDc && dir.row === prevDr ? 2 : 0;
        const axisAlignment =
          Math.abs(home.col - nc) + Math.abs(home.row - nr);
        const score = straightBonus - axisAlignment * 0.01;
        if (score > bestScore) {
          bestScore = score;
          bestNeighbor = { col: nc, row: nr };
        }
      }
    }

    if (!bestNeighbor) {
      break;
    }
    prevDc = bestNeighbor.col - curCol;
    prevDr = bestNeighbor.row - curRow;
    curCol = bestNeighbor.col;
    curRow = bestNeighbor.row;
    path.push(bestNeighbor);
  }

  return path;
}

export function getNextStepTile(
  cols: number,
  rows: number,
  distField: Int32Array,
  col: number,
  row: number,
  home: GridCoord
): GridCoord | null {
  if (col === home.col && row === home.row) {
    return home;
  }
  const curIdx = cellIndex(col, row, cols);
  const curDist = distField[curIdx];
  if (curDist <= 0) {
    return null;
  }

  let best: GridCoord | null = null;
  let bestDist = curDist;

  for (const dir of DIRS) {
    const nc = col + dir.col;
    const nr = row + dir.row;
    if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
      continue;
    }
    const nd = distField[cellIndex(nc, nr, cols)];
    if (nd !== -1 && nd < bestDist) {
      bestDist = nd;
      best = { col: nc, row: nr };
    }
  }

  return best;
}

export function validateTowerPlacement(
  cols: number,
  rows: number,
  spawn: GridCoord,
  home: GridCoord,
  obstacles: ReadonlyArray<GridCoord>,
  towers: ReadonlyArray<PlacedTower>,
  enemies: ReadonlyArray<ActiveEnemy>,
  target: GridCoord
): PlacementValidation {
  if (
    target.col < 0 ||
    target.col >= cols ||
    target.row < 0 ||
    target.row >= rows
  ) {
    return {
      valid: false,
      reason: 'Fuori dalla griglia',
      previewPath: [],
      previewDistField: null,
    };
  }

  if (target.col === spawn.col && target.row === spawn.row) {
    return {
      valid: false,
      reason: 'Portale di ingresso',
      previewPath: [],
      previewDistField: null,
    };
  }

  if (target.col === home.col && target.row === home.row) {
    return {
      valid: false,
      reason: 'Casa da difendere',
      previewPath: [],
      previewDistField: null,
    };
  }

  for (const obs of obstacles) {
    if (obs.col === target.col && obs.row === target.row) {
      return {
        valid: false,
        reason: 'Roccia naturale',
        previewPath: [],
        previewDistField: null,
      };
    }
  }

  for (const tower of towers) {
    if (tower.col === target.col && tower.row === target.row) {
      return {
        valid: false,
        reason: 'Cella già occupata',
        previewPath: [],
        previewDistField: null,
      };
    }
  }

  for (const enemy of enemies) {
    const eCol = Math.floor(enemy.x);
    const eRow = Math.floor(enemy.y);
    if (eCol === target.col && eRow === target.row) {
      return {
        valid: false,
        reason: 'Nemico in transito',
        previewPath: [],
        previewDistField: null,
      };
    }
  }

  const trialBlocked = buildBlockedGrid(cols, rows, obstacles, towers, target);
  const trialDist = computeDistanceField(cols, rows, trialBlocked, home);

  if (trialDist[cellIndex(spawn.col, spawn.row, cols)] === -1) {
    return {
      valid: false,
      reason: 'Percorso bloccato!',
      previewPath: [],
      previewDistField: null,
    };
  }

  for (const enemy of enemies) {
    const eCol = Math.max(0, Math.min(cols - 1, Math.floor(enemy.x)));
    const eRow = Math.max(0, Math.min(rows - 1, Math.floor(enemy.y)));
    if (trialDist[cellIndex(eCol, eRow, cols)] === -1) {
      return {
        valid: false,
        reason: 'Intrappolerebbe i nemici!',
        previewPath: [],
        previewDistField: null,
      };
    }
  }

  const previewPath = extractShortestPath(cols, rows, trialDist, spawn, home);
  return {
    valid: true,
    previewPath,
    previewDistField: trialDist,
  };
}
