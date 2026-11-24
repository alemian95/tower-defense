import type {
  PlacedTower,
  TowerDefinition,
  TowerLevel,
  TowerLevelScale,
  TowerType,
} from '../types';

export const TOWER_ORDER: TowerType[] = [
  'crossbow',
  'cannon',
  'frost',
  'tesla',
  'sniper',
];

export const TOWER_ECONOMY = {
  maxLevel: 3 as TowerLevel,
  sellRefundRatio: 0.7,
  upgradeCostMultiplierByNextLevel: {
    2: 0.8,
    3: 1.35,
  } as Record<2 | 3, number>,
  maxSlowCap: 0.65,
} as const;

export const TOWER_LEVEL_SCALING: Record<TowerLevel, TowerLevelScale> = {
  1: {
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    rangeBonus: 0,
    splashRadiusBonus: 0,
    slowFactorBonus: 0,
    chainCountBonus: 0,
  },
  2: {
    damageMultiplier: 1.6,
    fireRateMultiplier: 1.14,
    rangeBonus: 0.38,
    splashRadiusBonus: 0.22,
    slowFactorBonus: 0.08,
    chainCountBonus: 1,
  },
  3: {
    damageMultiplier: 2.45,
    fireRateMultiplier: 1.28,
    rangeBonus: 0.76,
    splashRadiusBonus: 0.44,
    slowFactorBonus: 0.16,
    chainCountBonus: 2,
  },
};

export const TOWER_DEFINITIONS: Record<TowerType, TowerDefinition> = {
  crossbow: {
    type: 'crossbow',
    name: 'Torre Balestra',
    shortName: 'Balestra',
    role: 'Fuoco rapido',
    description:
      'Dardi cinetici ad alta cadenza. Economica e ideale per costruire le mura del labirinto.',
    cost: 50,
    range: 3.2,
    damage: 17,
    fireRate: 1.85,
    projectileSpeed: 13.5,
    splashRadius: 0,
    splashMinFalloff: 1,
    slowFactor: 0,
    slowDuration: 0,
    chainCount: 0,
    chainRange: 0,
    chainDamageRetention: 1,
    armorPierce: 0.15,
    shieldMultiplier: 1,
    defaultPriority: 'first',
    accentColor: '#eab308',
    hotkey: '1',
  },
  cannon: {
    type: 'cannon',
    name: 'Cannone d’Assedio',
    shortName: 'Cannone',
    role: 'Danno ad area',
    description:
      'Proiettili esplosivi con onda d’urto. Devasta gruppi compatti nelle curve strette.',
    cost: 95,
    range: 2.65,
    damage: 46,
    fireRate: 0.65,
    projectileSpeed: 7.6,
    splashRadius: 1.38,
    splashMinFalloff: 0.65,
    slowFactor: 0,
    slowDuration: 0,
    chainCount: 0,
    chainRange: 0,
    chainDamageRetention: 1,
    armorPierce: 0.5,
    shieldMultiplier: 1,
    defaultPriority: 'first',
    accentColor: '#f97316',
    hotkey: '2',
  },
  frost: {
    type: 'frost',
    name: 'Obelisco Gelo',
    shortName: 'Gelo',
    role: 'Rallentamento',
    description:
      'Emette impulsi criogenici che rallentano i nemici, moltiplicando il tempo sotto tiro.',
    cost: 75,
    range: 2.85,
    damage: 11,
    fireRate: 1.15,
    projectileSpeed: 0,
    splashRadius: 1.4,
    splashMinFalloff: 1,
    slowFactor: 0.45,
    slowDuration: 2.6,
    chainCount: 0,
    chainRange: 0,
    chainDamageRetention: 1,
    armorPierce: 0.3,
    shieldMultiplier: 0.9,
    defaultPriority: 'first',
    accentColor: '#38bdf8',
    hotkey: '3',
  },
  tesla: {
    type: 'tesla',
    name: 'Torre Tesla',
    shortName: 'Tesla',
    role: 'Catena e scudi',
    description:
      'Scariche elettriche istantanee che rimbalzano su più bersagli e frantumano gli scudi.',
    cost: 115,
    range: 2.95,
    damage: 27,
    fireRate: 1.0,
    projectileSpeed: 0,
    splashRadius: 0,
    splashMinFalloff: 1,
    slowFactor: 0,
    slowDuration: 0,
    chainCount: 3,
    chainRange: 2.35,
    chainDamageRetention: 0.84,
    armorPierce: 0.35,
    shieldMultiplier: 1.85,
    defaultPriority: 'first',
    accentColor: '#2dd4bf',
    hotkey: '4',
  },
  sniper: {
    type: 'sniper',
    name: 'Torre Cecchino',
    shortName: 'Cecchino',
    role: 'Perforazione',
    description:
      'Gittata lunghissima e colpo perforante. Ignora l’armatura di Golem e Titani.',
    cost: 130,
    range: 5.7,
    damage: 105,
    fireRate: 0.43,
    projectileSpeed: 0,
    splashRadius: 0,
    splashMinFalloff: 1,
    slowFactor: 0,
    slowDuration: 0,
    chainCount: 0,
    chainRange: 0,
    chainDamageRetention: 1,
    armorPierce: 1.0,
    shieldMultiplier: 1.1,
    defaultPriority: 'strongest',
    accentColor: '#f43f5e',
    hotkey: '5',
  },
};

export interface ComputedTowerStats {
  damage: number;
  range: number;
  fireRate: number;
  splashRadius: number;
  slowFactor: number;
  chainCount: number;
}

export function getTowerStats(tower: PlacedTower): ComputedTowerStats {
  const def = TOWER_DEFINITIONS[tower.type];
  const scale = TOWER_LEVEL_SCALING[tower.level];

  return {
    damage: Math.round(def.damage * scale.damageMultiplier),
    range: Number((def.range + scale.rangeBonus).toFixed(2)),
    fireRate: Number((def.fireRate * scale.fireRateMultiplier).toFixed(2)),
    splashRadius:
      def.splashRadius > 0
        ? Number((def.splashRadius + scale.splashRadiusBonus).toFixed(2))
        : 0,
    slowFactor:
      def.slowFactor > 0
        ? Math.min(
            TOWER_ECONOMY.maxSlowCap,
            Number((def.slowFactor + scale.slowFactorBonus).toFixed(2))
          )
        : 0,
    chainCount:
      def.chainCount > 0 ? def.chainCount + scale.chainCountBonus : 0,
  };
}

export function getUpgradeCost(tower: PlacedTower): number | null {
  if (tower.level >= TOWER_ECONOMY.maxLevel) {
    return null;
  }
  const nextLevel = (tower.level + 1) as 2 | 3;
  const baseCost = TOWER_DEFINITIONS[tower.type].cost;
  const multiplier = TOWER_ECONOMY.upgradeCostMultiplierByNextLevel[nextLevel];
  return Math.round(baseCost * multiplier);
}

export function getSellValue(tower: PlacedTower): number {
  return Math.round(tower.totalInvested * TOWER_ECONOMY.sellRefundRatio);
}
