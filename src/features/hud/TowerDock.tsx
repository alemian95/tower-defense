import { ArrowUpCircle, Play, Trash2, X } from 'lucide-react';
import {
  DIFFICULTY_DEFINITIONS,
  ENEMY_DEFINITIONS,
  TOWER_DEFINITIONS,
  TOWER_ORDER,
  generateWave,
  getSellValue,
  getTowerStats,
  getUpgradeCost,
} from '../game/constants';
import type {
  GameSnapshot,
  PlacedTower,
  TargetPriority,
  TowerType,
} from '../game/types';

interface TowerDockProps {
  snapshot: GameSnapshot;
  onSelectBuildType: (type: TowerType | null) => void;
  onStartWave: () => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
  onSetPriority: (priority: TargetPriority) => void;
  onDeselectTower: () => void;
}

const PRIORITY_OPTIONS: ReadonlyArray<{
  value: TargetPriority;
  label: string;
}> = [
  { value: 'first', label: 'Primo' },
  { value: 'strongest', label: 'Più forte' },
  { value: 'closest', label: 'Più vicino' },
];

export function TowerDock({
  snapshot,
  onSelectBuildType,
  onStartWave,
  onUpgradeTower,
  onSellTower,
  onSetPriority,
  onDeselectTower,
}: TowerDockProps) {
  const selectedTower: PlacedTower | undefined = snapshot.towers.find(
    (t) => t.id === snapshot.selectedTowerId
  );

  const nextWaveNumber = snapshot.wave + 1;
  const upcomingWave = generateWave(nextWaveNumber);
  const diffCfg = DIFFICULTY_DEFINITIONS[snapshot.difficulty];
  const adjustedBonus = Math.round(
    upcomingWave.clearBonus * diffCfg.goldRewardMultiplier
  );

  return (
    <aside className="flex w-full lg:w-[340px] shrink-0 flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#131d21] p-4">
      {/* Wave Control & Preview */}
      <section className="rounded-xl border border-slate-800 bg-[#182429] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {snapshot.waveActive
                ? `Ondata ${snapshot.wave} in corso`
                : `Ondata ${nextWaveNumber} pronta`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 font-mono-tabular">
              {snapshot.waveActive
                ? `${snapshot.activeEnemiesCount} attivi · ${snapshot.enemiesRemainingToSpawn} in arrivo`
                : `Bonus completamento +${adjustedBonus} oro`}
            </p>
          </div>

          <button
            type="button"
            disabled={snapshot.waveActive || snapshot.phase !== 'PLAYING'}
            onClick={onStartWave}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              snapshot.waveActive || snapshot.phase !== 'PLAYING'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
            }`}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {snapshot.waveActive ? 'In corso' : 'Avvia ondata'}
          </button>
        </div>

        <div className="mt-3 border-t border-slate-800/80 pt-2.5">
          <div className="text-xs text-slate-400 mb-1.5">
            {snapshot.waveActive ? 'Prossima ondata:' : 'Composizione ondata:'}
          </div>
          <div className="flex flex-col gap-1">
            {(snapshot.waveActive
              ? generateWave(snapshot.wave + 1).groups
              : upcomingWave.groups
            ).map((group, idx) => {
              const eDef = ENEMY_DEFINITIONS[group.enemyType];
              return (
                <div
                  key={`${group.enemyType}-${idx}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-xs"
                      style={{ backgroundColor: eDef.color }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-slate-200 truncate">
                      {eDef.name}
                    </span>
                    <span className="text-slate-500 truncate">
                      · {eDef.traitLabel}
                    </span>
                  </div>
                  <span className="font-mono-tabular font-semibold text-slate-300 shrink-0 ml-2">
                    ×{group.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected Tower Inspector OR Tower Build Palette */}
      {selectedTower ? (
        <SelectedTowerInspector
          tower={selectedTower}
          gold={snapshot.gold}
          onUpgrade={onUpgradeTower}
          onSell={onSellTower}
          onSetPriority={onSetPriority}
          onClose={onDeselectTower}
        />
      ) : (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Torri da costruire
            </h2>
            {snapshot.selectedBuildType && (
              <button
                type="button"
                onClick={() => onSelectBuildType(null)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Annulla [Esc]
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {TOWER_ORDER.map((type) => {
              const def = TOWER_DEFINITIONS[type];
              const isSelected = snapshot.selectedBuildType === type;
              const canAfford = snapshot.gold >= def.cost;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    onSelectBuildType(isSelected ? null : type)
                  }
                  className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-800 bg-[#182429] hover:border-slate-700 hover:bg-[#1c2a30]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 shrink-0 rounded-xs"
                        style={{ backgroundColor: def.accentColor }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {def.name}
                      </span>
                      <span className="font-mono-tabular text-xs text-slate-500">
                        [{def.hotkey}]
                      </span>
                    </div>
                    <span
                      className={`font-mono-tabular text-xs font-bold shrink-0 ${
                        canAfford ? 'text-amber-300' : 'text-rose-400'
                      }`}
                    >
                      {def.cost} oro
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {def.description}
                  </p>

                  <div className="mt-1 flex items-center gap-3 text-[11px] font-mono-tabular text-slate-400">
                    <span>Danno {def.damage}</span>
                    <span aria-hidden="true">·</span>
                    <span>Gittata {def.range}</span>
                    <span aria-hidden="true">·</span>
                    <span>{def.role}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <p className="mt-auto text-xs text-slate-500 leading-relaxed">
        Suggerimento: clicca sulle celle della griglia per deviare il sentiero. I nemici seguono sempre il percorso più breve disponibile.
      </p>
    </aside>
  );
}

interface SelectedTowerInspectorProps {
  tower: PlacedTower;
  gold: number;
  onUpgrade: () => void;
  onSell: () => void;
  onSetPriority: (priority: TargetPriority) => void;
  onClose: () => void;
}

function SelectedTowerInspector({
  tower,
  gold,
  onUpgrade,
  onSell,
  onSetPriority,
  onClose,
}: SelectedTowerInspectorProps) {
  const def = TOWER_DEFINITIONS[tower.type];
  const stats = getTowerStats(tower);
  const upgradeCost = getUpgradeCost(tower);
  const sellValue = getSellValue(tower);
  const canAffordUpgrade = upgradeCost !== null && gold >= upgradeCost;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-[#182429] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-xs"
              style={{ backgroundColor: def.accentColor }}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-slate-100">
              {def.name}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 font-mono-tabular">
            Livello {tower.level}/3 · {tower.kills} eliminati · {tower.damageDealt} danni
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          aria-label="Chiudi ispettore"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-y border-slate-800 py-2.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Danno</span>
          <span className="font-mono-tabular font-semibold text-slate-100">
            {stats.damage}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Gittata</span>
          <span className="font-mono-tabular font-semibold text-slate-100">
            {stats.range}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Cadenza</span>
          <span className="font-mono-tabular font-semibold text-slate-100">
            {stats.fireRate}/s
          </span>
        </div>
        {stats.splashRadius > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">Area</span>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {stats.splashRadius}
            </span>
          </div>
        )}
        {stats.slowFactor > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">Rallenta</span>
            <span className="font-mono-tabular font-semibold text-sky-300">
              {Math.round(stats.slowFactor * 100)}%
            </span>
          </div>
        )}
        {stats.chainCount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">Rimbalzi</span>
            <span className="font-mono-tabular font-semibold text-teal-300">
              {stats.chainCount}
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-xs text-slate-400">Priorità bersaglio</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0f171a] p-1">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSetPriority(opt.value)}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                tower.priority === opt.value
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {upgradeCost !== null ? (
          <button
            type="button"
            disabled={!canAffordUpgrade}
            onClick={onUpgrade}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              canAffordUpgrade
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Potenzia ({upgradeCost})
          </button>
        ) : (
          <div className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-center text-xs font-semibold text-amber-300">
            Livello massimo
          </div>
        )}

        <button
          type="button"
          onClick={onSell}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Vendi (+{sellValue})
        </button>
      </div>
    </section>
  );
}
