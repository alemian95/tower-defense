import { soundEngine } from './audio';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_DEFINITIONS,
  ENEMY_COMBAT_RULES,
  ENEMY_DEFINITIONS,
  MAP_PRESETS,
  TARGET_WIN_WAVE,
  TOWER_DEFINITIONS,
  generateWave,
  getSellValue,
  getTowerStats,
  getUpgradeCost,
} from './constants';
import {
  buildBlockedGrid,
  cellIndex,
  computeDistanceField,
  extractShortestPath,
  getNextStepTile,
  validateTowerPlacement,
  type PlacementValidation,
} from './pathfinding';
import type {
  ActiveEnemy,
  DifficultyLevel,
  EnemyType,
  GamePhase,
  GameSnapshot,
  GridCoord,
  MapPreset,
  PlacedTower,
  Projectile,
  TargetPriority,
  TowerLevel,
  TowerType,
  VisualEffect,
} from './types';

interface PendingSpawn {
  enemyType: EnemyType;
  delay: number;
  hpMultiplier: number;
}

export class GameEngine {
  private map: MapPreset = MAP_PRESETS[0];
  private difficulty: DifficultyLevel = DEFAULT_DIFFICULTY;
  private phase: GamePhase = 'TITLE_MENU';
  private gold = MAP_PRESETS[0].startingGold;
  private lives = MAP_PRESETS[0].startingLives;
  private maxLives = MAP_PRESETS[0].startingLives;
  private wave = 0;
  private endlessMode = false;
  private score = 0;
  private enemiesKilled = 0;
  private waveActive = false;
  private speedMultiplier: 1 | 2 = 1;

  private towers: PlacedTower[] = [];
  private enemies: ActiveEnemy[] = [];
  private enemyTargets = new Map<string, GridCoord>();
  private projectiles: Projectile[] = [];
  private effects: VisualEffect[] = [];
  private spawnQueue: PendingSpawn[] = [];
  private spawnTimer = 0;
  private currentWaveBonus = 0;

  private selectedTowerId: string | null = null;
  private selectedBuildType: TowerType | null = 'crossbow';
  private statusNotice: string | null = null;
  private statusNoticeTimer = 0;

  private distField: Int32Array = new Int32Array(0);
  private shortestPath: GridCoord[] = [];
  private uidCounter = 1;
  private noticeCounter = 0;
  private lastUiSyncAt = 0;
  private onSnapshot: (snapshot: GameSnapshot) => void;

  constructor(onSnapshot: (snapshot: GameSnapshot) => void) {
    this.onSnapshot = onSnapshot;
    this.loadMap(MAP_PRESETS[0].id, 'TITLE_MENU');
  }

  private nextId(prefix: string): string {
    this.uidCounter += 1;
    return `${prefix}_${this.uidCounter}`;
  }

  getMap(): MapPreset {
    return this.map;
  }

  getShortestPath(): ReadonlyArray<GridCoord> {
    return this.shortestPath;
  }

  getTowers(): ReadonlyArray<PlacedTower> {
    return this.towers;
  }

  getEnemies(): ReadonlyArray<ActiveEnemy> {
    return this.enemies;
  }

  getProjectiles(): ReadonlyArray<Projectile> {
    return this.projectiles;
  }

  getEffects(): ReadonlyArray<VisualEffect> {
    return this.effects;
  }

  getSelectedTowerId(): string | null {
    return this.selectedTowerId;
  }

  getSelectedBuildType(): TowerType | null {
    return this.selectedBuildType;
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      mapId: this.map.id,
      difficulty: this.difficulty,
      gold: this.gold,
      lives: this.lives,
      maxLives: this.maxLives,
      wave: this.wave,
      targetWinWave: TARGET_WIN_WAVE,
      endlessMode: this.endlessMode,
      score: this.score,
      enemiesKilled: this.enemiesKilled,
      waveActive: this.waveActive,
      enemiesRemainingToSpawn: this.spawnQueue.length,
      activeEnemiesCount: this.enemies.length,
      pathLength: Math.max(0, this.shortestPath.length - 1),
      towers: this.towers.map((t) => ({ ...t })),
      selectedTowerId: this.selectedTowerId,
      selectedBuildType: this.selectedBuildType,
      speedMultiplier: this.speedMultiplier,
      muted: soundEngine.isMuted(),
      statusNotice: this.statusNotice,
    };
  }

  private emitSnapshot(): void {
    this.onSnapshot(this.getSnapshot());
  }

  private setNotice(message: string, duration = 2.4): void {
    this.noticeCounter += 1;
    this.statusNotice = message;
    this.statusNoticeTimer = duration;
    this.emitSnapshot();
  }

  private recomputePathfinding(): void {
    const blocked = buildBlockedGrid(
      this.map.cols,
      this.map.rows,
      this.map.obstacles,
      this.towers
    );
    this.distField = computeDistanceField(
      this.map.cols,
      this.map.rows,
      blocked,
      this.map.home
    );
    this.shortestPath = extractShortestPath(
      this.map.cols,
      this.map.rows,
      this.distField,
      this.map.spawn,
      this.map.home
    );

    // Re-route active enemies immediately to follow the newly computed shortest path
    for (const enemy of this.enemies) {
      const eCol = Math.max(0, Math.min(this.map.cols - 1, Math.floor(enemy.x)));
      const eRow = Math.max(0, Math.min(this.map.rows - 1, Math.floor(enemy.y)));
      const nextTile = getNextStepTile(
        this.map.cols,
        this.map.rows,
        this.distField,
        eCol,
        eRow,
        this.map.home
      );
      if (nextTile) {
        this.enemyTargets.set(enemy.id, nextTile);
      }
      const dist = this.distField[cellIndex(eCol, eRow, this.map.cols)];
      enemy.distanceToHome = dist >= 0 ? dist : 999;
    }
  }

  loadMap(
    mapId: string,
    initialPhase: GamePhase = 'PLAYING',
    difficulty: DifficultyLevel = this.difficulty
  ): void {
    const found = MAP_PRESETS.find((m) => m.id === mapId) ?? MAP_PRESETS[0];
    const diffCfg = DIFFICULTY_DEFINITIONS[difficulty];
    this.map = found;
    this.difficulty = difficulty;
    this.phase = initialPhase;
    this.gold = Math.max(100, found.startingGold + diffCfg.startingGoldDelta);
    const startingLives = Math.max(
      5,
      found.startingLives + diffCfg.startingLivesDelta
    );
    this.lives = startingLives;
    this.maxLives = startingLives;
    this.wave = 0;
    this.endlessMode = false;
    this.score = 0;
    this.enemiesKilled = 0;
    this.waveActive = false;
    this.speedMultiplier = 1;
    this.towers = [];
    this.enemies = [];
    this.enemyTargets.clear();
    this.projectiles = [];
    this.effects = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.currentWaveBonus = 0;
    this.selectedTowerId = null;
    this.selectedBuildType = 'crossbow';
    this.statusNotice = null;
    this.statusNoticeTimer = 0;
    this.recomputePathfinding();
    this.emitSnapshot();
  }

  startGame(mapId: string, difficulty: DifficultyLevel = this.difficulty): void {
    this.loadMap(mapId, 'PLAYING', difficulty);
  }

  restartGame(): void {
    this.loadMap(this.map.id, 'PLAYING', this.difficulty);
  }

  returnToMenu(): void {
    this.loadMap(this.map.id, 'TITLE_MENU', this.difficulty);
  }

  continueEndless(): void {
    if (this.phase === 'VICTORY') {
      this.endlessMode = true;
      this.phase = 'PLAYING';
      this.emitSnapshot();
    }
  }

  togglePause(): void {
    if (this.phase === 'PLAYING') {
      this.phase = 'PAUSED';
      this.emitSnapshot();
    } else if (this.phase === 'PAUSED') {
      this.phase = 'PLAYING';
      this.emitSnapshot();
    }
  }

  setSpeedMultiplier(speed: 1 | 2): void {
    this.speedMultiplier = speed;
    this.emitSnapshot();
  }

  toggleMute(): void {
    soundEngine.setMuted(!soundEngine.isMuted());
    this.emitSnapshot();
  }

  selectBuildType(type: TowerType | null): void {
    this.selectedBuildType = type;
    if (type !== null) {
      this.selectedTowerId = null;
    }
    this.emitSnapshot();
  }

  selectTower(towerId: string | null): void {
    this.selectedTowerId = towerId;
    if (towerId !== null) {
      this.selectedBuildType = null;
    }
    this.emitSnapshot();
  }

  previewPlacement(col: number, row: number): PlacementValidation {
    return validateTowerPlacement(
      this.map.cols,
      this.map.rows,
      this.map.spawn,
      this.map.home,
      this.map.obstacles,
      this.towers,
      this.enemies,
      { col, row }
    );
  }

  handleCellClick(col: number, row: number): void {
    if (this.phase !== 'PLAYING' && this.phase !== 'PAUSED') {
      return;
    }

    const existingTower = this.towers.find(
      (t) => t.col === col && t.row === row
    );
    if (existingTower) {
      this.selectedTowerId = existingTower.id;
      this.selectedBuildType = null;
      this.emitSnapshot();
      return;
    }

    if (!this.selectedBuildType) {
      this.selectedTowerId = null;
      this.emitSnapshot();
      return;
    }

    const def = TOWER_DEFINITIONS[this.selectedBuildType];
    if (this.gold < def.cost) {
      soundEngine.playBlocked();
      this.setNotice(`Oro insufficiente per ${def.shortName} (${def.cost})`);
      return;
    }

    const validation = this.previewPlacement(col, row);
    if (!validation.valid) {
      soundEngine.playBlocked();
      this.setNotice(validation.reason ?? 'Posizionamento non valido');
      return;
    }

    const newTower: PlacedTower = {
      id: this.nextId('twr'),
      type: this.selectedBuildType,
      col,
      row,
      level: 1,
      totalInvested: def.cost,
      cooldown: 0,
      angle: 0,
      priority: def.defaultPriority,
      kills: 0,
      damageDealt: 0,
      recoil: 0,
    };

    this.gold -= def.cost;
    this.towers.push(newTower);
    this.selectedTowerId = null;
    this.recomputePathfinding();
    soundEngine.playPlace();
    this.emitSnapshot();
  }

  upgradeSelectedTower(): void {
    if (!this.selectedTowerId) return;
    const tower = this.towers.find((t) => t.id === this.selectedTowerId);
    if (!tower) return;
    const cost = getUpgradeCost(tower);
    if (cost === null) return;
    if (this.gold < cost) {
      soundEngine.playBlocked();
      this.setNotice(`Servono ${cost} oro per potenziare`);
      return;
    }

    this.gold -= cost;
    tower.level = (tower.level + 1) as TowerLevel;
    tower.totalInvested += cost;
    soundEngine.playUpgrade();
    this.effects.push({
      kind: 'floating_text',
      id: this.nextId('fx'),
      x: tower.col + 0.5,
      y: tower.row + 0.25,
      text: `Liv. ${tower.level}`,
      color: '#fbbf24',
      life: 0.9,
      maxLife: 0.9,
    });
    this.emitSnapshot();
  }

  sellSelectedTower(): void {
    if (!this.selectedTowerId) return;
    const idx = this.towers.findIndex((t) => t.id === this.selectedTowerId);
    if (idx === -1) return;

    const tower = this.towers[idx];
    const refund = getSellValue(tower);
    this.gold += refund;
    this.towers.splice(idx, 1);
    this.selectedTowerId = null;
    this.recomputePathfinding();
    soundEngine.playSell();
    this.effects.push({
      kind: 'floating_text',
      id: this.nextId('fx'),
      x: tower.col + 0.5,
      y: tower.row + 0.35,
      text: `+${refund}`,
      color: '#fbbf24',
      life: 0.9,
      maxLife: 0.9,
    });
    this.emitSnapshot();
  }

  setSelectedTowerPriority(priority: TargetPriority): void {
    if (!this.selectedTowerId) return;
    const tower = this.towers.find((t) => t.id === this.selectedTowerId);
    if (!tower) return;
    tower.priority = priority;
    this.emitSnapshot();
  }

  startNextWave(): void {
    if (this.phase !== 'PLAYING' || this.waveActive) {
      return;
    }

    this.wave += 1;
    const waveDef = generateWave(this.wave);
    const diffCfg = DIFFICULTY_DEFINITIONS[this.difficulty];
    this.currentWaveBonus = Math.round(
      waveDef.clearBonus * diffCfg.goldRewardMultiplier
    );
    this.spawnQueue = [];

    for (const group of waveDef.groups) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          enemyType: group.enemyType,
          delay: i === 0 && this.spawnQueue.length > 0 ? 0.9 : group.interval,
          hpMultiplier: group.hpMultiplier,
        });
      }
    }

    this.spawnTimer = 0.15;
    this.waveActive = true;
    soundEngine.playWaveStart();
    this.emitSnapshot();
  }

  step(rawDt: number): void {
    if (this.statusNoticeTimer > 0) {
      this.statusNoticeTimer -= rawDt;
      if (this.statusNoticeTimer <= 0) {
        this.statusNotice = null;
        this.emitSnapshot();
      }
    }

    if (this.phase !== 'PLAYING') {
      return;
    }

    const dt = Math.min(rawDt, 0.05) * this.speedMultiplier;

    this.stepSpawning(dt);
    this.stepEnemies(dt);
    this.stepTowers(dt);
    this.stepProjectiles(dt);
    this.stepEffects(dt);

    // Check wave clear
    if (
      this.waveActive &&
      this.spawnQueue.length === 0 &&
      this.enemies.length === 0
    ) {
      this.waveActive = false;
      const diffCfg = DIFFICULTY_DEFINITIONS[this.difficulty];
      this.gold += this.currentWaveBonus;
      this.score += Math.round(this.currentWaveBonus * 4 * diffCfg.scoreMultiplier);
      this.effects.push({
        kind: 'floating_text',
        id: this.nextId('fx'),
        x: this.map.home.col + 0.4,
        y: this.map.home.row + 0.1,
        text: `Ondata ${this.wave} superata +${this.currentWaveBonus}`,
        color: '#34d399',
        life: 1.6,
        maxLife: 1.6,
      });

      if (!this.endlessMode && this.wave >= TARGET_WIN_WAVE) {
        this.phase = 'VICTORY';
        soundEngine.playVictory();
      } else {
        soundEngine.playUpgrade();
      }
      this.emitSnapshot();
      return;
    }

    const now = performance.now();
    if (now - this.lastUiSyncAt > 120) {
      this.lastUiSyncAt = now;
      this.emitSnapshot();
    }
  }

  private stepSpawning(dt: number): void {
    if (!this.waveActive || this.spawnQueue.length === 0) {
      return;
    }
    this.spawnTimer -= dt;
    while (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
      const next = this.spawnQueue.shift()!;
      this.spawnEnemy(next.enemyType, next.hpMultiplier);
      if (this.spawnQueue.length > 0) {
        this.spawnTimer += this.spawnQueue[0].delay;
      }
    }
  }

  private spawnEnemy(type: EnemyType, hpMultiplier: number): void {
    const def = ENEMY_DEFINITIONS[type];
    const diffCfg = DIFFICULTY_DEFINITIONS[this.difficulty];
    const maxHp = Math.max(
      1,
      Math.round(def.baseHp * hpMultiplier * diffCfg.enemyHpMultiplier)
    );
    const maxShield = Math.round(
      def.baseShield * hpMultiplier * diffCfg.enemyHpMultiplier
    );
    const startX = this.map.spawn.col + 0.5;
    const startY = this.map.spawn.row + 0.5;

    const firstTarget =
      getNextStepTile(
        this.map.cols,
        this.map.rows,
        this.distField,
        this.map.spawn.col,
        this.map.spawn.row,
        this.map.home
      ) ?? this.map.home;

    const startDist =
      this.distField[
        cellIndex(this.map.spawn.col, this.map.spawn.row, this.map.cols)
      ];

    const enemy: ActiveEnemy = {
      id: this.nextId('enm'),
      type,
      x: startX,
      y: startY,
      hp: maxHp,
      maxHp,
      shield: maxShield,
      maxShield,
      speed: def.speed * diffCfg.enemySpeedMultiplier,
      armor: def.armor,
      regenPerSec: def.regenPerSec,
      shieldSlowMultiplier: def.shieldSlowMultiplier,
      reward: Math.max(1, Math.round(def.reward * diffCfg.goldRewardMultiplier)),
      houseDamage: def.houseDamage,
      slowRemaining: 0,
      slowStrength: 0,
      hitFlash: 0,
      distanceToHome: startDist >= 0 ? startDist : 999,
      facingAngle: 0,
    };

    this.enemies.push(enemy);
    this.enemyTargets.set(enemy.id, firstTarget);
  }

  private stepEnemies(dt: number): void {
    const homeX = this.map.home.col + 0.5;
    const homeY = this.map.home.row + 0.5;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.hitFlash > 0) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 5);
      }

      if (enemy.slowRemaining > 0) {
        enemy.slowRemaining = Math.max(0, enemy.slowRemaining - dt);
        if (enemy.slowRemaining === 0) {
          enemy.slowStrength = 0;
        }
      }

      if (enemy.regenPerSec > 0 && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regenPerSec * dt);
      }

      const effectiveSlow =
        enemy.shield > 0
          ? enemy.slowStrength * enemy.shieldSlowMultiplier
          : enemy.slowStrength;
      const moveSpeed = enemy.speed * (1 - effectiveSlow);
      let remainingMove = moveSpeed * dt;

      // Advance along tile centers using the distance field
      let guard = 0;
      while (remainingMove > 0.0001 && guard < 4) {
        guard += 1;
        let target = this.enemyTargets.get(enemy.id);
        if (!target) {
          const curCol = Math.max(
            0,
            Math.min(this.map.cols - 1, Math.floor(enemy.x))
          );
          const curRow = Math.max(
            0,
            Math.min(this.map.rows - 1, Math.floor(enemy.y))
          );
          target =
            getNextStepTile(
              this.map.cols,
              this.map.rows,
              this.distField,
              curCol,
              curRow,
              this.map.home
            ) ?? this.map.home;
          this.enemyTargets.set(enemy.id, target);
        }

        const tx = target.col + 0.5;
        const ty = target.row + 0.5;
        const dx = tx - enemy.x;
        const dy = ty - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.0001) {
          enemy.facingAngle = Math.atan2(dy, dx);
        }

        if (dist <= remainingMove) {
          enemy.x = tx;
          enemy.y = ty;
          remainingMove -= dist;

          if (
            target.col === this.map.home.col &&
            target.row === this.map.home.row
          ) {
            break;
          }

          const nextTile = getNextStepTile(
            this.map.cols,
            this.map.rows,
            this.distField,
            target.col,
            target.row,
            this.map.home
          );
          if (nextTile) {
            this.enemyTargets.set(enemy.id, nextTile);
          } else {
            break;
          }
        } else {
          enemy.x += (dx / dist) * remainingMove;
          enemy.y += (dy / dist) * remainingMove;
          remainingMove = 0;
        }
      }

      // Update exact distance-to-home for "first" targeting priority
      const curCol = Math.max(
        0,
        Math.min(this.map.cols - 1, Math.floor(enemy.x))
      );
      const curRow = Math.max(
        0,
        Math.min(this.map.rows - 1, Math.floor(enemy.y))
      );
      const tileDist = this.distField[cellIndex(curCol, curRow, this.map.cols)];
      const target = this.enemyTargets.get(enemy.id) ?? this.map.home;
      const fracDist = Math.hypot(
        target.col + 0.5 - enemy.x,
        target.row + 0.5 - enemy.y
      );
      enemy.distanceToHome = (tileDist >= 0 ? tileDist : 999) + fracDist;

      // Check arrival at House
      if (Math.hypot(homeX - enemy.x, homeY - enemy.y) < 0.22) {
        this.lives = Math.max(0, this.lives - enemy.houseDamage);
        this.enemies.splice(i, 1);
        this.enemyTargets.delete(enemy.id);
        soundEngine.playHouseHit();
        this.effects.push({
          kind: 'floating_text',
          id: this.nextId('fx'),
          x: homeX,
          y: homeY - 0.3,
          text: `-${enemy.houseDamage} Casa`,
          color: '#f87171',
          life: 1.1,
          maxLife: 1.1,
        });

        if (this.lives <= 0) {
          this.phase = 'GAME_OVER';
          this.waveActive = false;
          this.spawnQueue = [];
          this.emitSnapshot();
          return;
        }
      }
    }
  }

  private stepTowers(dt: number): void {
    for (const tower of this.towers) {
      if (tower.cooldown > 0) {
        tower.cooldown = Math.max(0, tower.cooldown - dt);
      }
      if (tower.recoil > 0) {
        tower.recoil = Math.max(0, tower.recoil - dt * 6);
      }

      const stats = getTowerStats(tower);
      const cx = tower.col + 0.5;
      const cy = tower.row + 0.5;

      const inRange = this.enemies.filter(
        (e) => Math.hypot(e.x - cx, e.y - cy) <= stats.range
      );

      if (inRange.length === 0) {
        continue;
      }

      const target = this.pickTarget(tower, inRange, cx, cy);
      if (!target) {
        continue;
      }

      tower.angle = Math.atan2(target.y - cy, target.x - cx);

      if (tower.cooldown > 0) {
        continue;
      }

      const def = TOWER_DEFINITIONS[tower.type];
      tower.cooldown = 1 / stats.fireRate;
      tower.recoil = 1;
      soundEngine.playShot(tower.type);

      if (tower.type === 'frost') {
        // Cryo pulse around tower affecting all enemies within range
        this.effects.push({
          kind: 'frost_ring',
          id: this.nextId('fx'),
          x: cx,
          y: cy,
          radius: stats.range,
          life: 0.38,
          maxLife: 0.38,
        });
        for (const e of inRange) {
          this.applySlow(e, stats.slowFactor, def.slowDuration);
          this.applyDamage(
            e,
            stats.damage,
            def.armorPierce,
            def.shieldMultiplier,
            tower
          );
        }
      } else if (tower.type === 'tesla') {
        this.fireChainLightning(tower, target, stats.damage, stats.chainCount);
      } else if (tower.type === 'sniper') {
        this.effects.push({
          kind: 'beam',
          id: this.nextId('fx'),
          fromX: cx + Math.cos(tower.angle) * 0.38,
          fromY: cy + Math.sin(tower.angle) * 0.38,
          toX: target.x,
          toY: target.y,
          color: def.accentColor,
          life: 0.22,
          maxLife: 0.22,
        });
        this.applyDamage(
          target,
          stats.damage,
          def.armorPierce,
          def.shieldMultiplier,
          tower
        );
      } else {
        this.projectiles.push({
          id: this.nextId('prj'),
          towerType: tower.type,
          x: cx + Math.cos(tower.angle) * 0.32,
          y: cy + Math.sin(tower.angle) * 0.32,
          targetId: target.id,
          targetLastX: target.x,
          targetLastY: target.y,
          speed: def.projectileSpeed,
          damage: stats.damage,
          splashRadius: stats.splashRadius,
          splashMinFalloff: def.splashMinFalloff,
          slowFactor: stats.slowFactor,
          slowDuration: def.slowDuration,
          armorPierce: def.armorPierce,
          shieldMultiplier: def.shieldMultiplier,
          color: def.accentColor,
          sourceTowerId: tower.id,
        });
      }
    }
  }

  private pickTarget(
    tower: PlacedTower,
    candidates: ActiveEnemy[],
    cx: number,
    cy: number
  ): ActiveEnemy | null {
    if (candidates.length === 0) return null;
    let best = candidates[0];

    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      if (tower.priority === 'first') {
        if (c.distanceToHome < best.distanceToHome) {
          best = c;
        }
      } else if (tower.priority === 'strongest') {
        if (c.hp + c.shield > best.hp + best.shield) {
          best = c;
        }
      } else {
        const distC = Math.hypot(c.x - cx, c.y - cy);
        const distBest = Math.hypot(best.x - cx, best.y - cy);
        if (distC < distBest) {
          best = c;
        }
      }
    }
    return best;
  }

  private fireChainLightning(
    tower: PlacedTower,
    firstTarget: ActiveEnemy,
    baseDamage: number,
    maxChains: number
  ): void {
    const def = TOWER_DEFINITIONS.tesla;
    const hitIds = new Set<string>();
    const points: Array<{ x: number; y: number }> = [
      { x: tower.col + 0.5, y: tower.row + 0.5 },
    ];

    let currentTarget: ActiveEnemy | null = firstTarget;
    let currentDmg = baseDamage;

    for (let bounce = 0; bounce < maxChains && currentTarget; bounce++) {
      hitIds.add(currentTarget.id);
      points.push({ x: currentTarget.x, y: currentTarget.y });

      const lastX = currentTarget.x;
      const lastY = currentTarget.y;

      this.applyDamage(
        currentTarget,
        currentDmg,
        def.armorPierce,
        def.shieldMultiplier,
        tower
      );

      currentDmg = Math.round(currentDmg * def.chainDamageRetention);
      let nextCandidate: ActiveEnemy | null = null;
      let nearestDist = def.chainRange;

      for (const e of this.enemies) {
        if (hitIds.has(e.id) || e.hp <= 0) continue;
        const d = Math.hypot(e.x - lastX, e.y - lastY);
        if (d <= nearestDist) {
          nearestDist = d;
          nextCandidate = e;
        }
      }
      currentTarget = nextCandidate;
    }

    this.effects.push({
      kind: 'lightning',
      id: this.nextId('fx'),
      points,
      color: def.accentColor,
      life: 0.2,
      maxLife: 0.2,
    });
  }

  private stepProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const target = this.enemies.find((e) => e.id === p.targetId);
      if (target) {
        p.targetLastX = target.x;
        p.targetLastY = target.y;
      }

      const dx = p.targetLastX - p.x;
      const dy = p.targetLastY - p.y;
      const dist = Math.hypot(dx, dy);
      const stepDist = p.speed * dt;

      if (dist <= stepDist + 0.12) {
        const sourceTower = this.towers.find(
          (t) => t.id === p.sourceTowerId
        );

        if (p.splashRadius > 0) {
          this.effects.push({
            kind: 'explosion',
            id: this.nextId('fx'),
            x: p.targetLastX,
            y: p.targetLastY,
            radius: p.splashRadius,
            color: p.color,
            life: 0.28,
            maxLife: 0.28,
          });
          // Snapshot enemies list because kills mutate this.enemies
          const nearby = this.enemies.filter(
            (e) =>
              Math.hypot(e.x - p.targetLastX, e.y - p.targetLastY) <=
              p.splashRadius
          );
          for (const e of nearby) {
            const d = Math.hypot(e.x - p.targetLastX, e.y - p.targetLastY);
            const falloff = Math.max(
              p.splashMinFalloff,
              1 - (d / p.splashRadius) * (1 - p.splashMinFalloff)
            );
            this.applyDamage(
              e,
              Math.round(p.damage * falloff),
              p.armorPierce,
              p.shieldMultiplier,
              sourceTower
            );
          }
        } else if (target) {
          this.applyDamage(
            target,
            p.damage,
            p.armorPierce,
            p.shieldMultiplier,
            sourceTower
          );
        }

        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * stepDist;
        p.y += (dy / dist) * stepDist;
      }
    }
  }

  private applySlow(
    enemy: ActiveEnemy,
    slowFactor: number,
    duration: number
  ): void {
    if (slowFactor <= 0) return;
    if (slowFactor >= enemy.slowStrength) {
      enemy.slowStrength = slowFactor;
      enemy.slowRemaining = duration;
    } else {
      enemy.slowRemaining = Math.max(
        enemy.slowRemaining,
        duration * ENEMY_COMBAT_RULES.slowFallbackRetention
      );
    }
  }

  private applyDamage(
    enemy: ActiveEnemy,
    rawDamage: number,
    armorPierce: number,
    shieldMultiplier: number,
    sourceTower?: PlacedTower
  ): void {
    if (enemy.hp <= 0) return;

    let remainingRaw = rawDamage;
    let totalDealt = 0;

    if (enemy.shield > 0) {
      const shieldDamage = remainingRaw * shieldMultiplier;
      if (shieldDamage <= enemy.shield) {
        enemy.shield -= shieldDamage;
        totalDealt += shieldDamage;
        remainingRaw = 0;
      } else {
        const absorbedFraction = enemy.shield / shieldDamage;
        totalDealt += enemy.shield;
        enemy.shield = 0;
        remainingRaw = remainingRaw * (1 - absorbedFraction);
      }
    }

    if (remainingRaw > 0) {
      const effectiveArmor = enemy.armor * (1 - armorPierce);
      const hpDamage = Math.max(
        remainingRaw * ENEMY_COMBAT_RULES.minArmorDamageRatio,
        remainingRaw - effectiveArmor
      );
      enemy.hp -= hpDamage;
      totalDealt += hpDamage;
    }

    enemy.hitFlash = 1;
    if (sourceTower) {
      sourceTower.damageDealt += Math.round(totalDealt);
    }

    if (enemy.hp <= 0) {
      const idx = this.enemies.findIndex((e) => e.id === enemy.id);
      if (idx !== -1) {
        const diffCfg = DIFFICULTY_DEFINITIONS[this.difficulty];
        this.enemies.splice(idx, 1);
        this.enemyTargets.delete(enemy.id);
        this.gold += enemy.reward;
        this.enemiesKilled += 1;
        this.score += Math.round(enemy.reward * 3 * diffCfg.scoreMultiplier);
        if (sourceTower) {
          sourceTower.kills += 1;
        }
        this.effects.push({
          kind: 'floating_text',
          id: this.nextId('fx'),
          x: enemy.x,
          y: enemy.y - 0.2,
          text: `+${enemy.reward}`,
          color: '#fbbf24',
          life: 0.7,
          maxLife: 0.7,
        });
      }
    }
  }

  private stepEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      if (fx.kind === 'floating_text') {
        fx.y -= dt * 0.55;
      }
      if (fx.life <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }
}
