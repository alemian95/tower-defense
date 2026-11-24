import type { WaveDefinition, WaveSpawnGroup } from '../types';

export const TARGET_WIN_WAVE = 15;

export const WAVE_BALANCE_CONFIG = {
  hpLinearStep: 0.22,
  lateWaveStart: 6,
  lateWaveExponent: 1.35,
  lateWaveScale: 0.06,
  clearBonusBase: 25,
  clearBonusPerWave: 6,
  bossWaveInterval: 5,
  bossHpAdjustment: 0.92,
} as const;

export function generateWave(waveNumber: number): WaveDefinition {
  const hpMultiplier = Number(
    (
      1 +
      (waveNumber - 1) * WAVE_BALANCE_CONFIG.hpLinearStep +
      Math.pow(
        Math.max(0, waveNumber - WAVE_BALANCE_CONFIG.lateWaveStart),
        WAVE_BALANCE_CONFIG.lateWaveExponent
      ) *
        WAVE_BALANCE_CONFIG.lateWaveScale
    ).toFixed(2)
  );
  const groups: WaveSpawnGroup[] = [];

  if (waveNumber === 1) {
    groups.push({ enemyType: 'grunt', count: 8, interval: 1.05, hpMultiplier: 0.9 });
  } else if (waveNumber === 2) {
    groups.push({ enemyType: 'grunt', count: 6, interval: 0.95, hpMultiplier });
    groups.push({ enemyType: 'scout', count: 6, interval: 0.65, hpMultiplier });
  } else if (waveNumber === 3) {
    groups.push({ enemyType: 'scout', count: 8, interval: 0.55, hpMultiplier });
    groups.push({ enemyType: 'armored', count: 3, interval: 1.45, hpMultiplier });
  } else if (waveNumber === 4) {
    groups.push({ enemyType: 'grunt', count: 8, interval: 0.85, hpMultiplier });
    groups.push({ enemyType: 'shaman', count: 4, interval: 1.15, hpMultiplier });
  } else {
    const baseCount = 6 + Math.floor(waveNumber * 1.15);
    groups.push({
      enemyType: 'grunt',
      count: Math.max(4, Math.floor(baseCount * 0.4)),
      interval: Math.max(0.45, 0.85 - waveNumber * 0.02),
      hpMultiplier,
    });
    groups.push({
      enemyType: 'scout',
      count: Math.max(4, Math.floor(baseCount * 0.35)),
      interval: Math.max(0.32, 0.6 - waveNumber * 0.015),
      hpMultiplier,
    });

    if (waveNumber >= 3) {
      groups.push({
        enemyType: 'armored',
        count: 2 + Math.floor(waveNumber * 0.45),
        interval: 1.25,
        hpMultiplier,
      });
    }
    if (waveNumber >= 4) {
      groups.push({
        enemyType: 'shaman',
        count: 2 + Math.floor(waveNumber * 0.35),
        interval: 1.1,
        hpMultiplier,
      });
    }
    if (waveNumber >= 6) {
      groups.push({
        enemyType: 'shielded',
        count: 2 + Math.floor((waveNumber - 4) * 0.5),
        interval: 1.05,
        hpMultiplier,
      });
    }
    if (waveNumber % WAVE_BALANCE_CONFIG.bossWaveInterval === 0) {
      const bossCount = Math.max(1, Math.floor(waveNumber / 10) + 1);
      groups.push({
        enemyType: 'boss',
        count: bossCount,
        interval: 3.2,
        hpMultiplier: Number(
          (hpMultiplier * WAVE_BALANCE_CONFIG.bossHpAdjustment).toFixed(2)
        ),
      });
    }
  }

  return {
    waveNumber,
    groups,
    clearBonus:
      WAVE_BALANCE_CONFIG.clearBonusBase +
      waveNumber * WAVE_BALANCE_CONFIG.clearBonusPerWave,
  };
}
