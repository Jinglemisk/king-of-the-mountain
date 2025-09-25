# Consolidated UI Revamp Execution Plan

## Phase 1: Foundations — Asset Pipeline & Design Tokens
This phase establishes the core visual and technical infrastructure.

### Asset Pipeline Setup
- Create the standard directory structure: `src/assets/{ui,icons,textures,classes,tokens,cards,fonts}`.
- Implement the asset registry at `src/assetRegistry.ts` to manage asset lookups by a logical key (e.g., `getAsset('classes/warrior.png')`).
- Configure Vite and TypeScript to use a path alias (`@assets`) for easy imports.

vite.config.ts:
```ts
import path from "path";
export default {
  resolve: { alias: { "@assets": path.resolve(__dirname, "src/assets") } }
};
````

tsconfig.json:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@assets/*": ["src/assets/*"] }
  }
}
```

* Create helper scripts for seeding placeholder assets (e.g., textures, avatars).

package.json script hook:

```json
{
  "scripts": {
    "seed:assets": "node scripts/seed-assets.js"
  }
}
```

* Implement a thin `\ <Icon />\ ` wrapper component to abstract all icon usage.
* Add a lint rule to prevent direct `<img>` imports in feature components, enforcing use of the asset registry.

### Design Tokens & Theme

* Extend `tailwind.config.js` with the full design system: color palette, semantic ramps (info, success, etc.), typography scale, spacing tokens, and animation presets.
* Define CSS custom properties in `src/index.css` for the theme and remove obsolete default styles.

---

## Phase 1 - COMPLETED: Foundations Delivered

- Established the asset pipeline with structured folders, `assetRegistry.ts`, and seeded placeholder SVGs via `npm run seed:assets`.
- Wired tooling support (Vite alias, TS paths, package script) so future imports use `@assets` consistently.
- Added the shared `<Icon />` wrapper and lint guard to enforce registry usage for imagery.
- Expanded Tailwind tokens and published CSS variables in `src/index.css` to anchor the new theme.

## Phase 2: Primitive Component Library

Build a library of shared, reusable UI components based on the new design tokens.

### Core Primitives (`src/game/ui/components/primitives/`)

* `Panel.tsx`: Basic container for UI sections.
* `Card.tsx`: For seats, class selection, and inventory items.
* `Button.tsx`: Variants for primary, secondary, and ghost actions.
* `Badge.tsx`: Status indicators.
* `Tabs.tsx`: For navigating docked panels like logs and chat.

### Form Components

* `Input.tsx`, `Select.tsx`, `Checkbox.tsx` for forms and settings.

### Layout Components

* `AppShell.tsx`: Main responsive layout for the lobby and game screens.
* `ModalFrame.tsx`: Standardized frame for all pop-up dialogs.

---

## Phase 2 - COMPLETED: Primitive Library Delivered

- Implemented surface primitives (`Panel`, `Card`, `Button`, `Badge`, `Tabs`) with shared token-driven styling and accessibility features like arrow-key navigation for tabs (`src/game/ui/components/primitives/Panel.tsx`, `Card.tsx`, `Button.tsx`, `Badge.tsx`, `Tabs.tsx`).
- Added form controls (`Input`, `Select`, `Checkbox`) that expose helper/error messaging patterns and indeterminate support to keep future forms consistent (`src/game/ui/components/primitives/Input.tsx`, `Select.tsx`, `Checkbox.tsx`).
- Created layout scaffolding via `AppShell` and `ModalFrame` to standardize screen shells and modal chrome across the app (`src/game/ui/components/primitives/AppShell.tsx`, `ModalFrame.tsx`).
- Published a barrel export so downstream features can pull primitives from a single entry point (`src/game/ui/components/primitives/index.ts`).
- Extended Tailwind surface tokens to support the new muted panel treatment (`tailwind.config.js`).

---

## Phase 3: Lobby Screen Transformation

Overhaul the entire lobby and class selection experience using the new components.

* Restructure layout: Implement `AppShell` to create a two-column layout: a branded left rail and an interactive right panel.
* Redesign seat management: Convert the seat list into a grid of `Card` components, showing avatar placeholders, ready status badges, and inline actions.
* Build class selector: Create a horizontally scrollable showcase of large `Card` components for class selection, with filter chips and a compare drawer for details.
* Polish ready flow: Add a sticky footer bar with a prominent Ready button and a summary of who is ready.

---

## Phase 4: Game Screen Infrastructure

Build the main shell and foundational elements for the core game screen.

* Architect layout: Implement the three-region layout using `AppShell`: left sidebar, center stage for the board, and right sidebar.
* Add top status bar: Persistent top bar for room code, round indicator, and turn timer.
* Implement resizable panes: Integrate a split-pane utility to allow users to resize the sidebars.

---

## Phase 5: Board Canvas Modernization

Rebuild the game board to be dynamic and interactive.

* Convert to SVG: Re-render the board using SVG for smooth zooming, panning, and scaling.
* Enhance tiles: Layered tile component with a base shape, type-specific borders, icon badges, and tier pips.
* Upgrade player tokens: Tokens include an avatar, class color ring, HP arc, and a highlight for the current player.
* Add interactivity: Hover panel that follows the cursor to show tile summaries and previews; animated travel paths and highlights for dice rolls.

---

## Phase 6: Player Information Displays

Redesign how player data is presented.

* Create Player HUD: Prominent card for the current player showing a large HP meter, status effects, and class art.
* Build Turn Order panel: Horizontal timeline tracking the turn order with player tokens and next-up indicators.
* Display other players: Collapsible sidebar list showing the status of all other players.

---

## Phase 7: Inventory & Equipment Interface

Create a modern, intuitive inventory management system.

* Visualize equipment slots: Dedicated cards for equipped gear (weapon, off-hand, etc.) and inventory.
* Implement drag-and-drop: Integrate a library like `@dnd-kit` to allow players to drag items to equip, swap, and organize them.
* Add contextual actions: Use an action bar that highlights legal actions (equip, use, drop) when an item is selected.

---

## Phase 8: Combat & Dialog Enhancement

Standardize and polish all pop-up modals and the combat interface.

* Unify dialogs: Wrap all dialogs (branch choices, card draws, etc.) in the `ModalFrame` component for consistency.
* Overhaul combat panel: Full-screen combat overlay showing the enemy queue, dice trays, an action timeline, and a buff/debuff summary.
* Illustrate choices: Add art panels to dialogs to help players understand consequences.

---

## Phase 9: Communication & Logging

Merge the chat and game logs into a single, powerful dock.

* Create unified dock: Use the `Tabs` primitive to create a single panel for Chat, Combat Log, and System messages.
* Add filters and search: Controls to filter the log by event type and a search bar.
* Style log entries: Icon-coded, color-coded entries with timestamps and inline dice graphics for rolls.

---

## Phase 10: Tile & Context Panels

Improve the display of contextual information in the right sidebar.

* Structure tile info: Replace plain text with a structured panel showing the tile title, type, effect summary, and previews of adjacent tiles.
* Add Recent Events feed: Feed that shows actions related to the currently selected tile, filtered from the main game log.

---

## Phase 11: Accessibility & Polish

Ensure the application is accessible and feels polished.

### Accessibility Core

* Audit and ensure a logical focus order for all interactive elements.
* Add `aria-live` regions to announce dynamic updates like dice rolls and combat results to screen readers.
* Ensure all images and icons from the asset registry have appropriate alt text.

### Feedback & Animations

* Implement a toast/toaster pattern for non-critical notifications.
* Add micro-interactions and animations for a responsive feel.

---

## Phase 12: Final Testing & Documentation

Verify the implementation and document the new component system.

### Component Testing

* Add `data-testid` attributes to key interactive elements for easier testing.
* Implement visual regression tests for the primitive components.
* Run automated accessibility checks using a library like `axe-core`.

### Documentation

* Write usage guidelines for the new primitive components and the design system.
* Create a final checklist to verify all success criteria from the plan have been met.

---
