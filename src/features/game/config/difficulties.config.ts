import type { DifficultyDefinition, DifficultyLevel } from '../types';

export const DIFFICULTY_ORDER: DifficultyLevel[] = ['easy', 'normal', 'hard'];

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'normal';

export const DIFFICULTY_DEFINITIONS: Record<
  DifficultyLevel,
  DifficultyDefinition
> = {
  easy: {
    id: 'easy',
    label: 'Facile',
    subtitle: 'Più oro iniziale, vite extra e nemici più leggeri.',
    enemyHpMultiplier: 0.8,
    enemySpeedMultiplier: 0.92,
    startingGoldDelta: 60,
    startingLivesDelta: 5,
    goldRewardMultiplier: 1.15,
    scoreMultiplier: 0.8,
  },
  normal: {
    id: 'normal',
    label: 'Normale',
    subtitle: 'Equilibrio tattico standard tra economia e pressione.',
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    startingGoldDelta: 0,
    startingLivesDelta: 0,
    goldRewardMultiplier: 1.0,
    scoreMultiplier: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Difficile',
    subtitle:
      'Nemici più coriacei e veloci con meno margine d’errore. Richiede sinergie e labirinti lunghi.',
    enemyHpMultiplier: 1.22,
    enemySpeedMultiplier: 1.06,
    startingGoldDelta: -25,
    startingLivesDelta: -4,
    goldRewardMultiplier: 0.95,
    scoreMultiplier: 1.35,
  },
};
