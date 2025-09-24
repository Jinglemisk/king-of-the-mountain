# UI Code Reference

## Framework & Entry Points
- **Stack**: React 19 + TypeScript, bundled with Vite, styled primarily through Tailwind (see `tailwind.config.js`).
- `src/main.tsx` boots the React app, applies global styles from `src/index.css`, and renders `<App />` into `#root`.
- `src/App.tsx` wires the router (`react-router-dom`), initializes Firebase auth, and chooses between Lobby or Game flows. Most UI work branches from the screens imported here.

## Global Styling & Theming
- `src/index.css` defines Tailwind layers and a small set of `:root` defaults for light/dark appearance.
- `src/App.css` still contains Vite starter styles; remove or update if you refactor layouts away from the original demo.
- `tailwind.config.js` extends the theme with custom colors, animations, and keyframes used across game tiles, dice, and inventory highlights. Add new utility classes or animations here when introducing new UI patterns.

## UI State Management
- `src/game/ui/stores/gameStore.ts` (Zustand) holds all UI/gameplay view state: current game snapshot, lobby room info, the active dialog, branch choices, dice roll flags, etc. Modify or add setters/selectors here when introducing new UI interactions or overlays.
- Hooks folder (`src/game/ui/hooks`) is currently empty—use it for reusable selectors or derived state hooks if the store grows.

## Screen-Level Layouts (`src/game/ui/screens`)
- `LobbyScreen.tsx`: Handles room creation/joining, seat display, class selection, readiness, and navigation into a running game. Update this when changing lobby UX, seat cards, or class selection flows.
- `GameScreen.tsx`: Top-level composition for in-game play. It:
  - Subscribes to game updates via `subscribeToGame` (see `src/game/net/gameService.ts`).
  - Splits the viewport between the board (left) and the HUD/sidebar (right).
  - Mounts modals/overlays based on `ui.activeDialog`. Any layout tweaks, new panels, or modal triggers start here.

## Shared Components (`src/game/ui/components`)
- `BoardCanvas.tsx`: SVG/absolute-position layout for map tiles, player tokens, hover states, and branch highlights. Edit when changing board presentation, tile sizing, or token visuals.
- `PlayerHUD.tsx`: Player vitals, class info, status effects, and other player summaries. Extend to show buffs, cooldowns, etc.
- `InventoryPanel.tsx`: Inventory management, equipment slots, bandolier/backpack capacities, and action buttons (currently mocked). Adjust for new inventory rules or UI affordances.
- `TilePanel.tsx`: Shows details about the tile the player occupies, nearby players, and special states (traps, ambushes). Update when adding new tile metadata.
- `TurnControls.tsx`: Drive phase-dependent CTA buttons (move, sleep, duel, retreat) and dice roll feedback.
- `ChatPanel.tsx` / `LogPanel.tsx`: In-game communication and action history panels (local state + TODO comments for real networking). Wire these to backend services or redesign layouts here.
- `CombatPanel.tsx`: Full-screen overlay for PvE combat with enemy queue, stat blocks, dice previews, and action buttons.
- `DiceRoll.tsx`: Visual dice widget used across combat/turn controls. Extend for new dice types or animations.

## Modal / Dialog Overlays (`src/game/ui/dialogs`)
- `DuelDialog.tsx`: Handles duel invitations and round-by-round UI, including class-specific abilities.
- `DrawDialog.tsx`: Treasure and chance card experiences, with placement decisions and inventory validation.
- `CapacityDialog.tsx`: Forces item drops when exceeding carrying capacity; uses inventory lists from the store.
- `BranchChoicePrompt.tsx`: Branch tile selector that cross-references board data for previews.

## Data Dependencies
- `src/game/data/content.ts`: Source of `CLASSES`, `ITEMS`, and `BOARD` constants consumed throughout UI components. Update this when adding assets or new content types that need UI representation.
- `src/game/data/board.ts` & `board.v1.json`: Underlying board layout and metadata; changing tile counts/positions should be mirrored in `BoardCanvas.tsx`.

## Networking Touchpoints (UI-Relevant)
- `src/game/net/gameService.ts` and `src/game/net/roomService.ts`: Provide subscription helpers (`subscribeToGame`, `subscribeToRoom`) and actions invoked from screens/components. When adding UI controls that trigger backend changes, extend these services first, then call them from the relevant component.
- `src/game/net/mock*` files: Local stubs for UI testing without Firebase—useful when prototyping UI interactions.

## Assets & Static Files
- `public/` contains static assets (currently only `vite.svg`). Add favicons or background illustrations here.
- `src/assets/` holds local imports for bundling (presently `react.svg`).

## Practical Editing Guide
- To restyle the lobby or in-game layout, start with the relevant screen component, then dive into the child component that controls the portion you want to change.
- When introducing new UI state, add fields + setters in `gameStore.ts`, expose dedicated hooks if reuse is expected, and ensure components read via selectors to avoid unnecessary re-renders.
- For new overlays or modals, create a component under `src/game/ui/dialogs`, register it in `GameScreen.tsx` via `ui.activeDialog`, and manage its lifecycle within the store.
- Tailwind utilities are preferred for styling; if a design requires complex styling, consider creating reusable classnames via `clsx` or extracting patterns into small components.
- Keep synchronization with backend services explicit—UI actions currently log to console as placeholders. Replace these with calls to `gameService` / `roomService` once endpoints exist.

Use this guide as your map when planning UI refactors: identify the screen/component responsible for the area you want to adjust, confirm any supporting data/service needs, and update styling/theme files as required.
