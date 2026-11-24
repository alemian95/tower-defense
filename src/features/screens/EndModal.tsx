import { Play, RotateCcw, ShieldAlert, Trophy } from 'lucide-react';
import { DIFFICULTY_DEFINITIONS } from '../game/constants';
import type { GameSnapshot } from '../game/types';

interface EndModalProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
  onContinueEndless: () => void;
  onReturnToMenu: () => void;
}

export function EndModal({
  snapshot,
  onRestart,
  onContinueEndless,
  onReturnToMenu,
}: EndModalProps) {
  if (snapshot.phase !== 'VICTORY' && snapshot.phase !== 'GAME_OVER') {
    return null;
  }

  const isVictory = snapshot.phase === 'VICTORY';
  const diffLabel = DIFFICULTY_DEFINITIONS[snapshot.difficulty].label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#141f23] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          {isVictory ? (
            <Trophy className="h-7 w-7 text-amber-400 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert className="h-7 w-7 text-rose-400 shrink-0" aria-hidden="true" />
          )}
          <div>
            <h2
              id="end-modal-title"
              className="font-display text-2xl font-bold text-slate-50"
            >
              {isVictory ? 'Casa difesa con successo' : 'La casa è caduta'}
            </h2>
            <p className="text-xs text-slate-400">
              {isVictory
                ? `Hai respinto tutte le ${snapshot.targetWinWave} ondate (${diffLabel}).`
                : `I nemici hanno superato le difese all’ondata ${snapshot.wave} (${diffLabel}).`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-800 py-4 text-center">
          <div>
            <div className="text-xs text-slate-400">Ondate</div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-slate-100">
              {snapshot.wave}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Eliminati</div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-slate-100">
              {snapshot.enemiesKilled}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Punteggio</div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-amber-300">
              {snapshot.score}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {isVictory && (
            <button
              type="button"
              onClick={onContinueEndless}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Continua in modalità infinita
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                isVictory
                  ? 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'bg-amber-500 font-bold text-slate-950 hover:bg-amber-400'
              }`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Gioca ancora
            </button>

            <button
              type="button"
              onClick={onReturnToMenu}
              className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
