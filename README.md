# Tower Defense

Tower defense tattico a griglia con costruzione libera del labirinto, ricalcolo dinamico del percorso minimo e difesa su 15 ondate.

## Descrizione

In **Tower Defense** costruisci il tuo labirinto di torri direttamente sulla griglia di gioco per allungare e deviare il percorso più breve dei nemici verso la casa, massimizzando il tempo sotto tiro.

### Caratteristiche principali

- **Labirinto e pathfinding dinamico**: ogni torre piazzata ricalcola il percorso minimo in tempo reale (impedendo di sigillare completamente il passaggio).
- **5 torri specializzate** (potenziabili fino al livello 3 e vendibili al 70% del valore investito):
  - **Torre Balestra** (`1`) — Fuoco rapido ed economica, ideale per modellare il labirinto.
  - **Cannone d'Assedio** (`2`) — Proiettili esplosivi con danno ad area.
  - **Obelisco Gelo** (`3`) — Impulsi criogenici ad area che rallentano i nemici.
  - **Torre Tesla** (`4`) — Scariche elettriche a catena con danno bonus contro gli scudi.
  - **Torre Cecchino** (`5`) — Gittata estesa e colpo perforante che ignora l'armatura.
- **6 tipologie di nemici**: *Esploratore* (rapido), *Fante d'Assalto*, *Golem Corazzato* (armatura alta), *Sciamano* (rigenerazione HP), *Sentinella Scudata* (scudo energetico) e *Titano d'Assedio* (boss ogni 5 ondate).
- **6 mappe**: *Radura Aperta*, *Passo Roccioso*, *Valle dei Pilastri*, *Altopiano Quadrato*, *Cittadella Centrale* e *Gola del Canyon*.
- **3 difficoltà**: *Facile*, *Normale* e *Difficile*.

## Sviluppo

Il progetto è un'applicazione client-side realizzata con **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4** e **HTML5 Canvas** (non richiede variabili d'ambiente né backend).

### Prerequisiti

- Node.js
- npm

### Comandi principali

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo (http://localhost:3000)
npm run dev

# Esegue il type-check TypeScript
npm run lint

# Crea la build di produzione in dist/
npm run build

# Avvia l'anteprima della build di produzione
npm run preview
```

### Struttura del codice

- `src/features/game/` — Motore di gioco (`engine.ts`), pathfinding (`pathfinding.ts`), rendering Canvas (`renderer.ts`), audio (`audio.ts`) e configurazioni di torri, nemici, mappe, difficoltà e ondate (`config/`).
- `src/features/hud/` — Interfaccia di gioco (`TopHud.tsx`, `TowerDock.tsx`).
- `src/features/screens/` — Schermate di menu e riepilogo partita (`TitleMenu.tsx`, `EndModal.tsx`).
