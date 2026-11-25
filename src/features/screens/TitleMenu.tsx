import { Play } from 'lucide-react';
import {
  DIFFICULTY_DEFINITIONS,
  DIFFICULTY_ORDER,
  ENEMY_DEFINITIONS,
  ENEMY_ORDER,
  MAP_PRESETS,
  TARGET_WIN_WAVE,
  TOWER_DEFINITIONS,
  TOWER_ORDER,
} from '../game/constants';
import type { DifficultyLevel } from '../game/types';

interface TitleMenuProps {
  selectedMapId: string;
  selectedDifficulty: DifficultyLevel;
  onSelectMap: (mapId: string) => void;
  onSelectDifficulty: (difficulty: DifficultyLevel) => void;
  onStartGame: (mapId: string, difficulty: DifficultyLevel) => void;
}

export function TitleMenu({
  selectedMapId,
  selectedDifficulty,
  onSelectMap,
  onSelectDifficulty,
  onStartGame,
}: TitleMenuProps) {
  const diffCfg = DIFFICULTY_DEFINITIONS[selectedDifficulty];
  return (
    <div className="min-h-screen bg-[#0f171a] text-slate-100 flex items-center justify-center px-6 py-10">
      <main className="w-full max-w-5xl flex flex-col gap-8">
        {/* Hero Briefing */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-amber-400">
              Difesa tattica a labirinto · {TARGET_WIN_WAVE} ondate
            </p>
            <h1 className="font-display mt-2 text-4xl md:text-5xl font-bold tracking-tight text-slate-50 text-balance">
              Tower Defense
            </h1>
            <p className="mt-3 text-base text-slate-300 leading-relaxed">
              Ogni torre costruita sulla griglia modella il campo di battaglia: i
              nemici ricalcolano in tempo reale il percorso più breve verso la
              casa da difendere, senza poter essere mai murati del tutto.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onStartGame(selectedMapId, selectedDifficulty)}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Inizia partita
          </button>
        </section>

        {/* Difficulty Selection */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Livello di difficoltà
            </h2>
            <p className="text-xs text-slate-400">{diffCfg.subtitle}</p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
            role="radiogroup"
            aria-label="Livello di difficoltà"
          >
            {DIFFICULTY_ORDER.map((diffId) => {
              const cfg = DIFFICULTY_DEFINITIONS[diffId];
              const active = diffId === selectedDifficulty;
              const hpDeltaPct = Math.round((cfg.enemyHpMultiplier - 1) * 100);
              const speedDeltaPct = Math.round(
                (cfg.enemySpeedMultiplier - 1) * 100
              );

              return (
                <button
                  key={diffId}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSelectDifficulty(diffId)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-[#19262b]'
                      : 'border-slate-800 bg-[#141f23] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {cfg.label}
                    </span>
                    <span className="font-mono-tabular text-xs text-slate-400">
                      Punti ×{cfg.scoreMultiplier.toFixed(2).replace(/\.00$/, '')}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-slate-400">
                    <span>
                      PS nemici {hpDeltaPct >= 0 ? `+${hpDeltaPct}%` : `${hpDeltaPct}%`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Vel. {speedDeltaPct >= 0 ? `+${speedDeltaPct}%` : `${speedDeltaPct}%`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Oro{' '}
                      {cfg.startingGoldDelta >= 0
                        ? `+${cfg.startingGoldDelta}`
                        : cfg.startingGoldDelta}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Map Selection */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Scegli il territorio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MAP_PRESETS.map((map) => {
              const active = map.id === selectedMapId;
              const effectiveGold = Math.max(
                100,
                map.startingGold + diffCfg.startingGoldDelta
              );
              const effectiveLives = Math.max(
                5,
                map.startingLives + diffCfg.startingLivesDelta
              );
              return (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => onSelectMap(map.id)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-[#19262b]'
                      : 'border-slate-800 bg-[#141f23] hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-slate-100">
                        {map.name}
                      </span>
                      <span className="font-mono-tabular text-xs text-amber-300">
                        {effectiveGold} oro
                      </span>
                    </div>

                    {/* Miniature map shape preview */}
                    <div className="mt-3 flex h-20 w-full items-center justify-center rounded-lg border border-slate-800/80 bg-[#0f171a] p-2">
                      <svg
                        viewBox={`0 0 ${map.cols} ${map.rows}`}
                        className="h-full w-auto max-w-full"
                        aria-hidden="true"
                      >
                        <rect
                          x={0}
                          y={0}
                          width={map.cols}
                          height={map.rows}
                          fill="#182429"
                          rx={0.4}
                        />
                        {map.obstacles.map((obs, idx) => (
                          <rect
                            key={idx}
                            x={obs.col + 0.12}
                            y={obs.row + 0.12}
                            width={0.76}
                            height={0.76}
                            rx={0.15}
                            fill="#475569"
                          />
                        ))}
                        <circle
                          cx={map.spawn.col + 0.5}
                          cy={map.spawn.row + 0.5}
                          r={0.38}
                          fill="#ef4444"
                        />
                        <rect
                          x={map.home.col + 0.1}
                          y={map.home.row + 0.1}
                          width={0.8}
                          height={0.8}
                          rx={0.18}
                          fill="#f59e0b"
                        />
                      </svg>
                    </div>

                    <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                      {map.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-3 text-xs font-mono-tabular text-slate-400">
                    <span>{map.cols}×{map.rows} griglia</span>
                    <span aria-hidden="true">·</span>
                    <span>{effectiveLives} vite</span>
                    <span aria-hidden="true">·</span>
                    <span>{map.obstacles.length} rocce</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Towers & Enemies Reference */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-200">
              Arsenale delle torri
            </h2>
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#141f23]">
              {TOWER_ORDER.map((type) => {
                const t = TOWER_DEFINITIONS[type];
                return (
                  <div
                    key={type}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: t.accentColor }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100">
                          {t.name}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {t.role}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {t.description}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs font-semibold text-amber-300 shrink-0">
                      {t.cost} oro
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-200">
              Tipologie di nemici
            </h2>
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#141f23]">
              {ENEMY_ORDER.map((type) => {
                const e = ENEMY_DEFINITIONS[type];
                return (
                  <div
                    key={type}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: e.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100">
                          {e.name}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {e.traitLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {e.description}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-400 shrink-0">
                      +{e.reward} oro
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
