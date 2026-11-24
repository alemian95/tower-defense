import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DIFFICULTY,
  MAP_PRESETS,
  TOWER_ORDER,
} from './features/game/constants';
import { GameEngine } from './features/game/engine';
import { renderGameCanvas, type HoverState } from './features/game/renderer';
import type {
  DifficultyLevel,
  GameSnapshot,
  TargetPriority,
  TowerType,
} from './features/game/types';
import { TopHud } from './features/hud/TopHud';
import { TowerDock } from './features/hud/TowerDock';
import { EndModal } from './features/screens/EndModal';
import { TitleMenu } from './features/screens/TitleMenu';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string>(MAP_PRESETS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<DifficultyLevel>(DEFAULT_DIFFICULTY);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverCellRef = useRef<{ col: number; row: number } | null>(null);
  const hoverStateRef = useRef<HoverState | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine((nextSnap) => {
      setSnapshot(nextSnap);
    });
  }

  const currentSnapshot = snapshot ?? engineRef.current.getSnapshot();

  const refreshHoverValidation = useCallback(() => {
    const engine = engineRef.current;
    const cell = hoverCellRef.current;
    if (!engine || !cell) {
      hoverStateRef.current = null;
      return;
    }
    const validation = engine.getSelectedBuildType()
      ? engine.previewPlacement(cell.col, cell.row)
      : null;
    hoverStateRef.current = {
      col: cell.col,
      row: cell.row,
      validation,
    };
  }, []);

  // Re-evaluate hover validation whenever towers/build selection changes
  useEffect(() => {
    refreshHoverValidation();
  }, [
    currentSnapshot.towers.length,
    currentSnapshot.selectedBuildType,
    currentSnapshot.activeEnemiesCount,
    refreshHoverValidation,
  ]);

  const isTitleMenu = currentSnapshot.phase === 'TITLE_MENU';

  // Animation loop & Canvas sizing
  useEffect(() => {
    if (isTitleMenu) {
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const engine = engineRef.current;
    if (!canvas || !container || !engine) {
      return;
    }

    let width = container.clientWidth;
    let height = container.clientHeight;
    let resizeRafId = 0;

    const updateCanvasSize = () => {
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth;
      height = container.clientHeight;
      const nextWidth = Math.max(1, Math.floor(width * dpr));
      const nextHeight = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    updateCanvasSize();
    const observer = new ResizeObserver(() => {
      if (resizeRafId) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = 0;
        updateCanvasSize();
      });
    });
    observer.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.step(dt);

      const ctx = canvas.getContext('2d');
      if (ctx && width > 0 && height > 0) {
        renderGameCanvas(
          ctx,
          width,
          height,
          engine,
          hoverStateRef.current,
          now / 1000
        );
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeRafId) {
        cancelAnimationFrame(resizeRafId);
      }
      observer.disconnect();
    };
  }, [isTitleMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const snap = engine.getSnapshot();
      if (snap.phase === 'TITLE_MENU') return;

      if (e.key >= '1' && e.key <= '5') {
        const idx = Number(e.key) - 1;
        const type = TOWER_ORDER[idx];
        if (type) {
          engine.selectBuildType(type);
        }
      } else if (e.key === 'Escape') {
        engine.selectBuildType(null);
        engine.selectTower(null);
      } else if (e.key === ' ' || e.code === 'Space') {
        if (snap.phase === 'PLAYING' || snap.phase === 'PAUSED') {
          e.preventDefault();
          engine.togglePause();
        }
      } else if (e.key.toLowerCase() === 'u') {
        engine.upgradeSelectedTower();
      } else if (e.key.toLowerCase() === 's') {
        engine.sellSelectedTower();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getGridCoordFromPointer = (
    clientX: number,
    clientY: number
  ): { col: number; row: number } | null => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return null;

    const rect = canvas.getBoundingClientRect();
    const map = engine.getMap();
    const cellSize = Math.min(rect.width / map.cols, rect.height / map.rows);
    const offsetX = (rect.width - cellSize * map.cols) / 2;
    const offsetY = (rect.height - cellSize * map.rows) / 2;

    const localX = clientX - rect.left - offsetX;
    const localY = clientY - rect.top - offsetY;

    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);

    if (col < 0 || col >= map.cols || row < 0 || row >= map.rows) {
      return null;
    }
    return { col, row };
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const coord = getGridCoordFromPointer(e.clientX, e.clientY);
    if (!coord) {
      hoverCellRef.current = null;
      hoverStateRef.current = null;
      return;
    }
    if (
      hoverCellRef.current?.col !== coord.col ||
      hoverCellRef.current?.row !== coord.row
    ) {
      hoverCellRef.current = coord;
      refreshHoverValidation();
    }
  };

  const handleCanvasPointerLeave = () => {
    hoverCellRef.current = null;
    hoverStateRef.current = null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const coord = getGridCoordFromPointer(e.clientX, e.clientY);
    if (!coord) {
      engine.selectTower(null);
      return;
    }
    engine.handleCellClick(coord.col, coord.row);
    refreshHoverValidation();
  };

  if (currentSnapshot.phase === 'TITLE_MENU') {
    return (
      <TitleMenu
        selectedMapId={selectedMapId}
        selectedDifficulty={selectedDifficulty}
        onSelectMap={setSelectedMapId}
        onSelectDifficulty={setSelectedDifficulty}
        onStartGame={(mapId, difficulty) => {
          setSelectedMapId(mapId);
          setSelectedDifficulty(difficulty);
          engineRef.current?.startGame(mapId, difficulty);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0f171a] text-slate-100">
      <TopHud
        snapshot={currentSnapshot}
        onTogglePause={() => engineRef.current?.togglePause()}
        onSetSpeed={(speed) => engineRef.current?.setSpeedMultiplier(speed)}
        onToggleMute={() => engineRef.current?.toggleMute()}
        onRestart={() => engineRef.current?.restartGame()}
        onReturnToMenu={() => engineRef.current?.returnToMenu()}
      />

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Battlefield Grid Area */}
        <main className="relative flex flex-1 flex-col items-center justify-between p-4 lg:p-6">
          <div className="relative flex w-full flex-1 flex-col min-h-[380px] max-h-[calc(100vh-160px)] rounded-xl border border-slate-800/90 bg-[#121c20] p-2">
            <div ref={containerRef} className="relative flex-1 w-full">
              <canvas
                ref={canvasRef}
                onPointerMove={handleCanvasPointerMove}
                onPointerLeave={handleCanvasPointerLeave}
                onClick={handleCanvasClick}
                className="absolute inset-0 h-full w-full cursor-crosshair block"
              />
            </div>

            {/* Notice Toast when placement blocked / low gold */}
            {currentSnapshot.statusNotice && (
              <div
                role="status"
                className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-rose-500/60 bg-rose-950/90 px-4 py-2 text-xs font-semibold text-rose-100 shadow-lg"
              >
                {currentSnapshot.statusNotice}
              </div>
            )}

            {/* Pause Overlay */}
            {currentSnapshot.phase === 'PAUSED' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/55 backdrop-blur-[1px]">
                <div className="rounded-xl border border-slate-700 bg-[#141f23] px-6 py-4 text-center shadow-xl">
                  <p className="font-display text-xl font-semibold text-slate-100">
                    Partita in pausa
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Puoi comunque ispezionare le torri o premere Spazio per riprendere.
                  </p>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.togglePause()}
                    className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Riprendi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Unboxed Tactical Legend Strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 w-full text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
                Portale nemici
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-orange-600" aria-hidden="true" />
                Casa da difendere
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-amber-300/80" aria-hidden="true" />
                Percorso minimo attuale
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-emerald-400" aria-hidden="true" />
                Anteprima deviazione
              </span>
            </div>

            <div className="hidden md:block text-slate-500">
              Tasti: [1–5] Scegli torre · [U] Potenzia · [S] Vendi · [Spazio] Pausa
            </div>
          </div>
        </main>

        <TowerDock
          snapshot={currentSnapshot}
          onSelectBuildType={(type: TowerType | null) =>
            engineRef.current?.selectBuildType(type)
          }
          onStartWave={() => engineRef.current?.startNextWave()}
          onUpgradeTower={() => engineRef.current?.upgradeSelectedTower()}
          onSellTower={() => engineRef.current?.sellSelectedTower()}
          onSetPriority={(priority: TargetPriority) =>
            engineRef.current?.setSelectedTowerPriority(priority)
          }
          onDeselectTower={() => engineRef.current?.selectTower(null)}
        />
      </div>

      <EndModal
        snapshot={currentSnapshot}
        onRestart={() => engineRef.current?.restartGame()}
        onContinueEndless={() => engineRef.current?.continueEndless()}
        onReturnToMenu={() => engineRef.current?.returnToMenu()}
      />
    </div>
  );
}
