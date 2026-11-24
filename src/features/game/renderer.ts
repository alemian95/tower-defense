import {
  ENEMY_DEFINITIONS,
  TOWER_DEFINITIONS,
  getTowerStats,
} from './constants';
import type { GameEngine } from './engine';
import type { PlacementValidation } from './pathfinding';
import type { ActiveEnemy, GridCoord, PlacedTower } from './types';

export interface HoverState {
  col: number;
  row: number;
  validation: PlacementValidation | null;
}

export function renderGameCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: GameEngine,
  hover: HoverState | null,
  timeSec: number
): void {
  const map = engine.getMap();
  const cellSize = Math.min(width / map.cols, height / map.rows);
  const offsetX = (width - cellSize * map.cols) / 2;
  const offsetY = (height - cellSize * map.rows) / 2;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  drawGridTiles(ctx, map.cols, map.rows, cellSize);
  drawShortestPath(ctx, engine.getShortestPath(), cellSize, timeSec, false);

  // Preview new shortest path when hovering with a tower build selection
  const selectedBuildType = engine.getSelectedBuildType();
  if (
    hover &&
    selectedBuildType &&
    hover.validation &&
    hover.validation.valid &&
    hover.validation.previewPath.length > 0
  ) {
    drawShortestPath(
      ctx,
      hover.validation.previewPath,
      cellSize,
      timeSec,
      true
    );
  }

  drawObstacles(ctx, map.obstacles, cellSize);
  drawSpawnPortal(ctx, map.spawn, cellSize, timeSec);
  drawHouse(ctx, map.home, cellSize, timeSec);

  const selectedTowerId = engine.getSelectedTowerId();
  const towers = engine.getTowers();

  // Draw selected tower range ring below towers
  if (selectedTowerId) {
    const selected = towers.find((t) => t.id === selectedTowerId);
    if (selected) {
      drawTowerRange(ctx, selected, cellSize);
    }
  }

  for (const tower of towers) {
    drawTower(
      ctx,
      tower,
      cellSize,
      tower.id === selectedTowerId,
      timeSec
    );
  }

  // Hover ghost preview
  if (hover && selectedBuildType) {
    drawBuildGhost(ctx, hover, selectedBuildType, cellSize);
  } else if (hover) {
    drawTileHoverHighlight(ctx, hover.col, hover.row, cellSize);
  }

  // Draw enemies
  for (const enemy of engine.getEnemies()) {
    drawEnemy(ctx, enemy, cellSize, timeSec);
  }

  // Draw projectiles
  for (const proj of engine.getProjectiles()) {
    const px = proj.x * cellSize;
    const py = proj.y * cellSize;
    ctx.save();
    if (proj.towerType === 'cannon') {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(px, py, cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      const angle = Math.atan2(proj.targetLastY - proj.y, proj.targetLastX - proj.x);
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-cellSize * 0.14, -1.5, cellSize * 0.28, 3);
    }
    ctx.restore();
  }

  // Draw visual effects
  drawEffects(ctx, engine, cellSize);

  // If invalid hover placement, draw crisp reason badge above hovered tile
  if (
    hover &&
    selectedBuildType &&
    hover.validation &&
    !hover.validation.valid &&
    hover.validation.reason
  ) {
    drawInvalidLabel(
      ctx,
      hover.col,
      hover.row,
      hover.validation.reason,
      cellSize,
      map.cols
    );
  }

  ctx.restore();
}

function drawGridTiles(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  cellSize: number
): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAlt = (c + r) % 2 === 0;
      ctx.fillStyle = isAlt ? '#172327' : '#1b292e';
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    const x = Math.round(c * cellSize) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rows * cellSize);
  }
  for (let r = 0; r <= rows; r++) {
    const y = Math.round(r * cellSize) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(cols * cellSize, y);
  }
  ctx.stroke();
}

function drawShortestPath(
  ctx: CanvasRenderingContext2D,
  path: ReadonlyArray<GridCoord>,
  cellSize: number,
  timeSec: number,
  isPreview: boolean
): void {
  if (path.length < 2) return;

  ctx.save();
  // Subtle road bed under current path
  if (!isPreview) {
    ctx.strokeStyle = 'rgba(217, 179, 120, 0.14)';
    ctx.lineWidth = cellSize * 0.44;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((pt, idx) => {
      const x = (pt.col + 0.5) * cellSize;
      const y = (pt.row + 0.5) * cellSize;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Animated directional dash line
  ctx.strokeStyle = isPreview
    ? 'rgba(52, 211, 153, 0.72)'
    : 'rgba(245, 196, 110, 0.48)';
  ctx.lineWidth = isPreview ? 2.5 : 2;
  ctx.setLineDash([cellSize * 0.16, cellSize * 0.16]);
  ctx.lineDashOffset = -timeSec * cellSize * 0.65;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((pt, idx) => {
    const x = (pt.col + 0.5) * cellSize;
    const y = (pt.row + 0.5) * cellSize;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: ReadonlyArray<GridCoord>,
  cellSize: number
): void {
  for (const obs of obstacles) {
    const cx = (obs.col + 0.5) * cellSize;
    const cy = (obs.row + 0.5) * cellSize;
    const r = cellSize * 0.36;

    ctx.save();
    ctx.fillStyle = '#0f171a';
    ctx.fillRect(
      obs.col * cellSize + 2,
      obs.row * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );

    ctx.fillStyle = '#3b4a52';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.85, cy + r * 0.3);
    ctx.lineTo(cx - r * 0.45, cy - r * 0.75);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.9, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.78);
    ctx.lineTo(cx - r * 0.35, cy + r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Facet highlight
    ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy - r * 0.75);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.1, cy - r * 0.05);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawSpawnPortal(
  ctx: CanvasRenderingContext2D,
  spawn: GridCoord,
  cellSize: number,
  timeSec: number
): void {
  const cx = (spawn.col + 0.5) * cellSize;
  const cy = (spawn.row + 0.5) * cellSize;
  const r = cellSize * 0.36;

  ctx.save();
  const pulse = 1 + Math.sin(timeSec * 3.2) * 0.06;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.18 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#450a0a';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Forward chevron inside portal
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.2, cy - r * 0.28);
  ctx.lineTo(cx + r * 0.25, cy);
  ctx.lineTo(cx - r * 0.2, cy + r * 0.28);
  ctx.stroke();
  ctx.restore();
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  home: GridCoord,
  cellSize: number,
  timeSec: number
): void {
  const x = home.col * cellSize;
  const y = home.row * cellSize;
  const cx = x + cellSize * 0.5;
  const cy = y + cellSize * 0.5;
  const s = cellSize * 0.38;

  ctx.save();
  // Warm hearth glow around the house
  const glow = 0.22 + Math.sin(timeSec * 2) * 0.04;
  ctx.fillStyle = `rgba(245, 158, 11, ${glow})`;
  ctx.beginPath();
  ctx.arc(cx, cy, cellSize * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Chimney
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx + s * 0.28, cy - s * 0.92, s * 0.26, s * 0.45);

  // House stone/timber base
  ctx.fillStyle = '#e7e5e4';
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 1.5;
  ctx.fillRect(cx - s * 0.72, cy - s * 0.1, s * 1.44, s * 0.92);
  ctx.strokeRect(cx - s * 0.72, cy - s * 0.1, s * 1.44, s * 0.92);

  // Warm door & lit windows
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - s * 0.18, cy + s * 0.25, s * 0.36, s * 0.56);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(cx - s * 0.54, cy + s * 0.12, s * 0.24, s * 0.24);
  ctx.fillRect(cx + s * 0.3, cy + s * 0.12, s * 0.24, s * 0.24);

  // Terracotta pitched roof
  ctx.fillStyle = '#c2410c';
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.92, cy - s * 0.04);
  ctx.lineTo(cx, cy - s * 0.95);
  ctx.lineTo(cx + s * 0.92, cy - s * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawTowerRange(
  ctx: CanvasRenderingContext2D,
  tower: PlacedTower,
  cellSize: number
): void {
  const stats = getTowerStats(tower);
  const def = TOWER_DEFINITIONS[tower.type];
  const cx = (tower.col + 0.5) * cellSize;
  const cy = (tower.row + 0.5) * cellSize;

  ctx.save();
  ctx.fillStyle = `${def.accentColor}1a`;
  ctx.strokeStyle = `${def.accentColor}aa`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, stats.range * cellSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: PlacedTower,
  cellSize: number,
  isSelected: boolean,
  timeSec: number
): void {
  const def = TOWER_DEFINITIONS[tower.type];
  const cx = (tower.col + 0.5) * cellSize;
  const cy = (tower.row + 0.5) * cellSize;
  const pad = cellSize * 0.1;
  const size = cellSize - pad * 2;

  ctx.save();
  // Base pedestal
  ctx.fillStyle = '#26353b';
  ctx.strokeStyle = isSelected ? '#fbbf24' : '#475569';
  ctx.lineWidth = isSelected ? 2.4 : 1.5;
  ctx.beginPath();
  ctx.roundRect(
    tower.col * cellSize + pad,
    tower.row * cellSize + pad,
    size,
    size,
    cellSize * 0.16
  );
  ctx.fill();
  ctx.stroke();

  // Inner turret assembly
  ctx.save();
  ctx.translate(cx, cy);
  const kick = tower.recoil * cellSize * 0.07;

  if (tower.type === 'crossbow') {
    ctx.rotate(tower.angle);
    ctx.translate(-kick, 0);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.24, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-cellSize * 0.16, -2, cellSize * 0.44, 4);
  } else if (tower.type === 'cannon') {
    ctx.rotate(tower.angle);
    ctx.translate(-kick, 0);
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, -cellSize * 0.1, cellSize * 0.34, cellSize * 0.2);
    ctx.strokeRect(0, -cellSize * 0.1, cellSize * 0.34, cellSize * 0.2);
  } else if (tower.type === 'frost') {
    const pulse = 1 + Math.sin(timeSec * 3.5) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const r = cellSize * 0.24;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tower.type === 'tesla') {
    ctx.fillStyle = '#134e4a';
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#99f6e4';
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sniper rail turret
    ctx.rotate(tower.angle);
    ctx.translate(-kick, 0);
    ctx.fillStyle = '#4c0519';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fda4af';
    ctx.fillRect(0, -2.5, cellSize * 0.42, 5);
  }
  ctx.restore();

  // Level pips at bottom edge of tower
  const pipRadius = Math.max(2, cellSize * 0.055);
  const pipSpacing = pipRadius * 2.8;
  const startX = cx - ((tower.level - 1) * pipSpacing) / 2;
  const pipY = tower.row * cellSize + cellSize - pad - pipRadius * 1.4;
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = def.accentColor;
    ctx.beginPath();
    ctx.arc(startX + i * pipSpacing, pipY, pipRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBuildGhost(
  ctx: CanvasRenderingContext2D,
  hover: HoverState,
  towerType: PlacedTower['type'],
  cellSize: number
): void {
  const def = TOWER_DEFINITIONS[towerType];
  const valid = hover.validation?.valid ?? false;
  const cx = (hover.col + 0.5) * cellSize;
  const cy = (hover.row + 0.5) * cellSize;

  ctx.save();
  ctx.fillStyle = valid ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.26)';
  ctx.strokeStyle = valid ? '#10b981' : '#ef4444';
  ctx.lineWidth = 2;
  ctx.fillRect(
    hover.col * cellSize + 2,
    hover.row * cellSize + 2,
    cellSize - 4,
    cellSize - 4
  );
  ctx.strokeRect(
    hover.col * cellSize + 2,
    hover.row * cellSize + 2,
    cellSize - 4,
    cellSize - 4
  );

  if (valid) {
    ctx.fillStyle = `${def.accentColor}16`;
    ctx.strokeStyle = `${def.accentColor}88`;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, def.range * cellSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTileHoverHighlight(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  cellSize: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    col * cellSize + 2,
    row * cellSize + 2,
    cellSize - 4,
    cellSize - 4
  );
  ctx.restore();
}

function drawInvalidLabel(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  reason: string,
  cellSize: number,
  totalCols: number
): void {
  ctx.save();
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  const paddingX = 8;
  const textWidth = ctx.measureText(reason).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = 22;

  let bx = (col + 0.5) * cellSize - boxWidth / 2;
  bx = Math.max(4, Math.min(totalCols * cellSize - boxWidth - 4, bx));
  const by = row > 0 ? row * cellSize - boxHeight - 4 : (row + 1) * cellSize + 4;

  ctx.fillStyle = 'rgba(127, 29, 29, 0.94)';
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxWidth, boxHeight, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef2f2';
  ctx.textBaseline = 'middle';
  ctx.fillText(reason, bx + paddingX, by + boxHeight / 2);
  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: ActiveEnemy,
  cellSize: number,
  timeSec: number
): void {
  const def = ENEMY_DEFINITIONS[enemy.type];
  const cx = enemy.x * cellSize;
  const cy = enemy.y * cellSize;
  const r = cellSize * def.radiusScale;

  ctx.save();

  // Energy shield aura if active
  if (enemy.shield > 0) {
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Frost slow indicator ring
  if (enemy.slowRemaining > 0) {
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(enemy.facingAngle);

  const fillColor = enemy.hitFlash > 0.2 ? '#ffffff' : def.color;
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = def.trimColor;
  ctx.lineWidth = enemy.type === 'armored' || enemy.type === 'boss' ? 2.4 : 1.5;

  if (enemy.type === 'scout') {
    // Sleek arrow dart
    ctx.beginPath();
    ctx.moveTo(r * 1.15, 0);
    ctx.lineTo(-r * 0.85, -r * 0.78);
    ctx.lineTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.85, r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === 'armored' || enemy.type === 'boss') {
    // Heavy armored hexagon/octagon
    const sides = enemy.type === 'boss' ? 8 : 6;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === 'shaman') {
    // Circle with subtle regenerating cross
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(-enemy.facingAngle + timeSec * 1.8);
    ctx.strokeStyle = '#d1fae5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, 0);
    ctx.lineTo(r * 0.45, 0);
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(0, r * 0.45);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // HP & Shield bars above enemy
  const barW = Math.max(cellSize * 0.56, r * 2.1);
  const barH = 4;
  const barX = cx - barW / 2;
  const barY = cy - r - 9;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  if (enemy.maxShield > 0 && enemy.shield > 0) {
    const shieldRatio = Math.max(0, Math.min(1, enemy.shield / enemy.maxShield));
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, barY - 4, barW * shieldRatio, 3);
  }

  ctx.restore();
}

function drawEffects(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  cellSize: number
): void {
  for (const fx of engine.getEffects()) {
    const t = Math.max(0, Math.min(1, fx.life / fx.maxLife));
    ctx.save();

    if (fx.kind === 'explosion') {
      const progress = 1 - t;
      ctx.globalAlpha = t * 0.7;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        fx.x * cellSize,
        fx.y * cellSize,
        fx.radius * cellSize * (0.4 + 0.6 * progress),
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    } else if (fx.kind === 'frost_ring') {
      const progress = 1 - t;
      ctx.globalAlpha = t * 0.75;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        fx.x * cellSize,
        fx.y * cellSize,
        fx.radius * cellSize * (0.25 + 0.75 * progress),
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else if (fx.kind === 'lightning') {
      ctx.globalAlpha = t;
      ctx.strokeStyle = '#5eead4';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      fx.points.forEach((pt, idx) => {
        const px = pt.x * cellSize;
        const py = pt.y * cellSize;
        if (idx === 0) ctx.moveTo(px, py);
        else {
          const prev = fx.points[idx - 1];
          const midX = ((prev.x + pt.x) / 2) * cellSize + (Math.random() - 0.5) * 10;
          const midY = ((prev.y + pt.y) / 2) * cellSize + (Math.random() - 0.5) * 10;
          ctx.lineTo(midX, midY);
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
    } else if (fx.kind === 'beam') {
      ctx.globalAlpha = t;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(fx.fromX * cellSize, fx.fromY * cellSize);
      ctx.lineTo(fx.toX * cellSize, fx.toY * cellSize);
      ctx.stroke();
    } else if (fx.kind === 'floating_text') {
      ctx.globalAlpha = Math.min(1, t * 1.4);
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f171a';
      ctx.fillText(fx.text, fx.x * cellSize + 1, fx.y * cellSize + 1);
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, fx.x * cellSize, fx.y * cellSize);
    }

    ctx.restore();
  }
}
