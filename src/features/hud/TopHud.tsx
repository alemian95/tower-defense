import {
  Coins,
  Footprints,
  Home,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DIFFICULTY_DEFINITIONS } from '../game/constants';
import type { GameSnapshot } from '../game/types';

interface TopHudProps {
  snapshot: GameSnapshot;
  onTogglePause: () => void;
  onSetSpeed: (speed: 1 | 2) => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export function TopHud({
  snapshot,
  onTogglePause,
  onSetSpeed,
  onToggleMute,
  onRestart,
  onReturnToMenu,
}: TopHudProps) {
  const isPaused = snapshot.phase === 'PAUSED';
  const lowLives = snapshot.lives <= 5;
  const difficultyLabel = DIFFICULTY_DEFINITIONS[snapshot.difficulty].label;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#131d21] px-5 py-3">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onReturnToMenu}
          className="font-display text-lg font-semibold tracking-tight text-slate-100 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Torna al menu principale"
        >
          Tower Defense
        </button>

        <div className="hidden sm:block h-5 w-px bg-slate-800" aria-hidden="true" />

        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <Home
              className={`h-4 w-4 ${lowLives ? 'text-rose-400' : 'text-amber-400'}`}
              aria-hidden="true"
            />
            <span className="text-slate-400">Casa</span>
            <span
              className={`font-mono-tabular font-semibold ${
                lowLives ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {snapshot.lives}/{snapshot.maxLives}
            </span>
          </div>

          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>

          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span className="text-slate-400">Oro</span>
            <span className="font-mono-tabular font-semibold text-amber-300">
              {snapshot.gold}
            </span>
          </div>

          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Ondata</span>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {snapshot.endlessMode
                ? `${snapshot.wave}`
                : `${snapshot.wave}/${snapshot.targetWinWave}`}
            </span>
          </div>

          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>

          <div
            className="flex items-center gap-2"
            title="Lunghezza del percorso minimo attuale dallo spawn alla casa"
          >
            <Footprints className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="text-slate-400">Percorso</span>
            <span className="font-mono-tabular font-semibold text-emerald-300">
              {snapshot.pathLength} passi
            </span>
          </div>

          <span className="hidden lg:inline text-slate-700" aria-hidden="true">
            ·
          </span>

          <div className="hidden lg:flex items-center gap-2">
            <span className="text-slate-400">Punti</span>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {snapshot.score}
            </span>
          </div>

          <span className="hidden xl:inline text-slate-700" aria-hidden="true">
            ·
          </span>

          <span className="hidden xl:inline text-xs font-medium text-slate-400">
            {difficultyLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="flex items-center rounded-lg border border-slate-800 bg-[#0e1518] p-0.5"
          role="group"
          aria-label="Velocità simulazione"
        >
          <button
            type="button"
            onClick={() => onSetSpeed(1)}
            className={`px-2.5 py-1.5 text-xs font-mono-tabular font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              snapshot.speedMultiplier === 1
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => onSetSpeed(2)}
            className={`px-2.5 py-1.5 text-xs font-mono-tabular font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              snapshot.speedMultiplier === 2
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2x
          </button>
        </div>

        <button
          type="button"
          onClick={onTogglePause}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isPaused
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Riprendi
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              Pausa
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors shrink-0 cursor-pointer"
          aria-label={snapshot.muted ? 'Attiva audio' : 'Disattiva audio'}
          title={snapshot.muted ? 'Attiva audio' : 'Disattiva audio'}
        >
          {snapshot.muted ? (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Ricomincia mappa"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Ricomincia
        </button>
      </div>
    </header>
  );
}
