export type GamePhase =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type TowerType =
  | 'crossbow'
  | 'cannon'
  | 'frost'
  | 'tesla'
  | 'sniper';

export type TowerLevel = 1 | 2 | 3;

export type EnemyType =
  | 'scout'
  | 'grunt'
  | 'armored'
  | 'shaman'
  | 'shielded'
  | 'boss';

export type TargetPriority = 'first' | 'strongest' | 'closest';

export interface GridCoord {
  col: number;
  row: number;
}

export interface DifficultyDefinition {
  id: DifficultyLevel;
  label: string;
  subtitle: string;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  startingGoldDelta: number;
  startingLivesDelta: number;
  goldRewardMultiplier: number;
  scoreMultiplier: number;
}

export interface TowerLevelScale {
  damageMultiplier: number;
  fireRateMultiplier: number;
  rangeBonus: number;
  splashRadiusBonus: number;
  slowFactorBonus: number;
  chainCountBonus: number;
}

export interface TowerDefinition {
  type: TowerType;
  name: string;
  shortName: string;
  role: string;
  description: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number; // tiles per second (0 for instant hitscan/pulse)
  splashRadius: number; // in tiles, 0 for single-target
  splashMinFalloff: number; // 0..1 minimum damage fraction at splash edge
  slowFactor: number; // 0..1 reduction in speed
  slowDuration: number; // seconds
  chainCount: number; // 0 if no chain lightning
  chainRange: number; // max bounce distance in tiles
  chainDamageRetention: number; // 0..1 damage kept per bounce
  armorPierce: number; // 0..1 fraction of armor ignored
  shieldMultiplier: number; // multiplier against shields
  defaultPriority: TargetPriority;
  accentColor: string;
  hotkey: string;
}

export interface PlacedTower {
  id: string;
  type: TowerType;
  col: number;
  row: number;
  level: TowerLevel;
  totalInvested: number;
  cooldown: number;
  angle: number;
  priority: TargetPriority;
  kills: number;
  damageDealt: number;
  recoil: number; // visual recoil animation timer 0..1
}

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  traitLabel: string;
  description: string;
  baseHp: number;
  baseShield: number;
  speed: number; // tiles per second
  armor: number; // flat damage reduction
  regenPerSec: number;
  shieldSlowMultiplier: number; // slow effectiveness while shield > 0
  reward: number;
  houseDamage: number;
  radiusScale: number;
  color: string;
  trimColor: string;
}

export interface ActiveEnemy {
  id: string;
  type: EnemyType;
  x: number; // continuous tile coords (center = col + 0.5)
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  armor: number;
  regenPerSec: number;
  shieldSlowMultiplier: number;
  reward: number;
  houseDamage: number;
  slowRemaining: number;
  slowStrength: number; // 0..0.75
  hitFlash: number; // 0..1
  distanceToHome: number;
  facingAngle: number;
}

export interface Projectile {
  id: string;
  towerType: TowerType;
  x: number;
  y: number;
  targetId: string;
  targetLastX: number;
  targetLastY: number;
  speed: number; // tiles per second
  damage: number;
  splashRadius: number;
  splashMinFalloff: number;
  slowFactor: number;
  slowDuration: number;
  armorPierce: number;
  shieldMultiplier: number;
  color: string;
  sourceTowerId: string;
}

export type VisualEffect =
  | {
      kind: 'explosion';
      id: string;
      x: number;
      y: number;
      radius: number;
      color: string;
      life: number;
      maxLife: number;
    }
  | {
      kind: 'lightning';
      id: string;
      points: Array<{ x: number; y: number }>;
      color: string;
      life: number;
      maxLife: number;
    }
  | {
      kind: 'frost_ring';
      id: string;
      x: number;
      y: number;
      radius: number;
      life: number;
      maxLife: number;
    }
  | {
      kind: 'beam';
      id: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      color: string;
      life: number;
      maxLife: number;
    }
  | {
      kind: 'floating_text';
      id: string;
      x: number;
      y: number;
      text: string;
      color: string;
      life: number;
      maxLife: number;
    };

export interface WaveSpawnGroup {
  enemyType: EnemyType;
  count: number;
  interval: number; // seconds between spawns
  hpMultiplier: number;
}

export interface WaveDefinition {
  waveNumber: number;
  groups: WaveSpawnGroup[];
  clearBonus: number;
}

export interface MapPreset {
  id: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  spawn: GridCoord;
  home: GridCoord;
  obstacles: GridCoord[];
  startingGold: number;
  startingLives: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  mapId: string;
  difficulty: DifficultyLevel;
  gold: number;
  lives: number;
  maxLives: number;
  wave: number;
  targetWinWave: number;
  endlessMode: boolean;
  score: number;
  enemiesKilled: number;
  waveActive: boolean;
  enemiesRemainingToSpawn: number;
  activeEnemiesCount: number;
  pathLength: number;
  towers: PlacedTower[];
  selectedTowerId: string | null;
  selectedBuildType: TowerType | null;
  speedMultiplier: 1 | 2;
  muted: boolean;
  statusNotice: string | null;
}
