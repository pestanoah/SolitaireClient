# Klondike Solitaire Codebase Audit Report

**Audited Repository**: `/Users/noahpesta/projects/solitaire`  
**Date**: October 2026  
**Stack**: Expo SDK `57.0.24`, React `19.2.3`, React Native `0.86.3`, TypeScript `6.0.3`  
**Test Suite Status**: 11 / 11 test suites passing (205 tests total)

---

## Executive Summary

The codebase demonstrates a well-conceived foundation: pure TypeScript engine separation with deterministic Mulberry32 PRNG seed support, strategic hints, and dual-engine audio.

However, several critical issues impact architecture, reliability, and performance:
1. **Monolithic UI Architecture**: `src/screens/GameScreen.tsx` has grown to **2,254 lines**, conflating 9 distinct responsibilities with 35 separate `useState` and `useRef` hooks.
2. **P0 Bugs**:
   - An **undo score inflation exploit** generates unlimited score.
   - An **incomplete auto-complete deadlock** permanently locks user interaction.
   - PanResponder gesture capture **blocks board scrolling** on mobile touch devices.
3. **Performance Bottlenecks**:
   - The 1-second interval timer forces a full-screen re-render of the entire component tree every second.
   - **~154 KB of static seed JSON** is directly bundled into the initial entry JS chunk (~18% of bundle weight).
   - Breadth-First Search (BFS) in hints and deadlock detection relies on string-concatenated state serialization without shared transposition caching.

---

## 1. Architecture & Design Flaws

### 1.1 Monolithic `GameScreen.tsx` (~2,250 Lines)
`src/screens/GameScreen.tsx` manages 9 separate architectural domains in a single component:
1. Viewport & responsive layout geometry calculations (L370–444)
2. AsyncStorage hydration and state persistence lifecycle (L451–558)
3. Game clock loop and time penalty decrementing (L561–578)
4. Deadlock detection timer orchestration (L602–626)
5. Drag-and-drop gesture state machine and screen-coordinate drop target math (L905–1089)
6. Auto-complete runner loop (L1369–1392)
7. Game session lifecycle (seeded games, daily challenges, forfeits, replay, L1395–1588)
8. Modal visibility toggles & settings state persistence (L1590–1643)
9. Presentation of header, board, animated card flight, drag preview, deal overlay, and 5 modals (L1805–2254)

**Recommendation**: Decompose into modular custom hooks:
- `useGameSession`: handles `gameState`, deal/replay/undo/abandon transitions, and storage persistence.
- `useGameTimer`: isolates `elapsedSeconds` and time scoring penalties.
- `useCardGestures`: encapsulates `dragState`, `PanResponder` interaction, and `findDropTarget`.
- `useAutoComplete`: manages the auto-complete step cycle and animation coordination.
- `useBoardLayout`: encapsulates responsive dimensions, offsets, and pile coordinate calculations.

### 1.2 Dead Layout Refs & Dead Callbacks
The following refs and callbacks are instantiated and updated on every render/layout, but **never read anywhere**:
- `stockLayoutRef` (`GameScreen.tsx:359`)
- `wasteLayoutRef` (`GameScreen.tsx:360`)
- `foundationLayoutsRef` (`GameScreen.tsx:361`)
- `tableauLayoutsRef` (`GameScreen.tsx:362`)
- `foundationsRowLayoutRef` (`GameScreen.tsx:357`)
- `handleStockLayout` & `handleWasteLayout` (`GameScreen.tsx:366-368`, empty no-ops)
- Layout sync effect (`GameScreen.tsx:686-695`)
- Wrapper views with `onLayout` around columns and foundations (`GameScreen.tsx:1911-1919, 1964-1971`) adding redundant DOM depth.

### 1.3 UI Leakage of Game Engine Rules
While `src/engine/` is clean of UI dependencies, core game engine rules have leaked into UI layers:
- **Timer scoring rules** (`GameScreen.tsx:564-574`): The Klondike rule of `-2 points every 10 seconds` is implemented inside a React `setInterval` updater rather than pure engine functions.
- **Status transitions** (`GameScreen.tsx:621, 1535`): UI handlers directly mutate `gameState.status = 'lost'` rather than delegating to engine transitions.

### 1.4 Modal Hierarchy & Theming Inconsistencies
- **Nested Modal Presentation Violation** (`src/components/StatsModal.tsx:112-123`): Inside `<Modal visible={visible}>`, `StatsModal` mounts `<ConfirmModal visible={showConfirm} ... />` (which renders a second `<Modal>`). On iOS and React Native Web, presenting a modal while another modal is active triggers `RCTModalHostViewController` presentation conflicts and touch backdrop locks.
- **Duplicated Layout & Style Overrides**: `src/components/WinModal.tsx:66, 163-173` re-implements `modalStyles.statsContainer` (`src/theme/modal.styles.ts:67-77`). Several modals manually override `borderRadius` and `paddingVertical` rather than using theme tokens.
- **Hardcoded Colors**: `src/components/GameOverModal.tsx:270-273` uses raw `'rgba(34, 197, 94, 0.12)'` and `'rgba(34, 197, 94, 0.35)'` instead of design tokens in `src/theme/colors.ts`.

### 1.5 Configuration & Tooling
- **Missing URL Scheme for Native Deep Linking** (`app.json:1-32`): Lacks a `"scheme"` property (e.g. `"scheme": "solitaire"`), preventing native iOS/Android builds from opening shared game seed links.
- **Jest Test Match Omission** (`jest.config.js:4`): `testMatch: ['**/__tests__/**/*.test.ts']` ignores `.test.tsx` component test files.

---

## 2. Bugs & Edge Cases

### [P0] Critical Bugs (All Resolved)

#### 1. Score Inflation Exploit on Undo with Foundation Moves — `[RESOLVED]`
- **Files**: `src/engine/klondike.ts:184-193` & `src/engine/klondike.ts:481`
- **Problem**: When moving a card from foundation down to tableau, `movePoints` is `-15`.
  ```ts
  const newScore = Math.max(0, state.score + totalPoints); // Clamped to 0
  const moveRecord: MoveRecord = {
    ...
    pointsEarned: totalPoints, // Records un-clamped -15!
  };
  ```
  If player score was `5`, `newScore` becomes `0` (a delta of `-5`). However, `pointsEarned` recorded `-15`. Calling `undo()` calculated `0 - (-15) = +15`, jumping score to 15 instead of restoring to 5. Repeatedly moving a card down and undoing generated infinite score.
- **Resolution**: Updated `klondike.ts` to record `appliedPoints = newScore - state.score` in `MoveRecord.pointsEarned`. Added regression unit test verifying exact score restoration without inflation.

#### 2. Permanent Game Lockout During Incomplete Auto-Complete — `[RESOLVED]`
- **Files**: `src/engine/rules.ts:83-103`, `src/engine/klondike.ts:497-601`, `src/screens/GameScreen.tsx:991-1392`
- **Problem**:
  1. `canAutoComplete` returned `true` whenever all tableau cards were face-up, ignoring deadlocked board states.
  2. `autoCompleteStep` only advances cards if eligible foundation or waste moves exist, returning `null` if complex tableau reorganizations are required.
  3. When `autoCompleteStep` returned `null`, all user touch events were blocked by `canAutoComplete(current)` guards, and deadlock detection was suppressed, permanently freezing the game.
- **Resolution**:
  - Updated `canAutoComplete` in `src/engine/rules.ts` to unconditionally check `hasAvailableMoves(state)`.
  - Replaced static `canAutoComplete` user-input blockers in `GameScreen.tsx` with an active `isAutoCompletingRef` that only restricts input during active in-flight auto-complete animations and frees input if auto-complete pauses or returns `null`.

#### 3. Gesture PanResponder Eager Capture Blocks Board Scrolling on Mobile — `[RESOLVED]`
- **Files**: `src/components/DraggableCard.tsx:58, 116`
- **Problem**: `onStartShouldSetPanResponder` claimed the touch on touch-down, and `onPanResponderTerminationRequest: () => false` refused to yield to the parent `ScrollView`, making it impossible to scroll the board vertically on mobile devices when touching cards.
- **Resolution**: Updated `onPanResponderTerminationRequest` to return `!isDraggingRef.current`. When a gesture moves vertically for page scrolling before a card drag threshold is met, the card responder yields termination to the parent `ScrollView`.

#### 4. Stale Closure & Lost Drag Drop on Rapid Flicks — `[RESOLVED]`
- **Files**: `src/screens/GameScreen.tsx:1030-1089`
- **Problem**: `handleDragEnd` read from asynchronous React state `dragState`. On rapid flick releases, `onPanResponderRelease` fired before React committed scheduled state, causing `if (!dragState) return;` to drop the drag event.
- **Resolution**: Introduced a synchronous `dragStateRef = useRef<DragState | null>(null)` synchronized immediately upon `handleDragStart` and read directly inside `handleDragEnd`.

---

### [P1] High Priority Bugs

#### 5. Auto-Complete Animation Stall on Stock Recycle
- **Files**: `src/screens/GameScreen.tsx:800-832` & `GameScreen.tsx:1369-1392`
- **Problem**: Stock recycle triggers a two-stage animation. Calling `setGameState(nextState)` at line 806 triggers the auto-complete `useEffect` while `isAnimatingRef.current` is still `true`. The effect exits early. When stage 2 completes at line 826, `isAnimatingRef.current = false` is set without updating state. Auto-complete stalls until the 1-second timer tick triggers a re-render.
- **Fix**: Advance to the next auto-complete step directly inside the animation completion callback.

#### 6. Web Audio Context Autoplay Suspension on iOS Safari
- **Files**: `src/utils/sound.ts:30-49` & `src/screens/GameScreen.tsx:471, 494`
- **Problem**: On initial load, `setTimeout(..., 60)` triggers `animateInitialDeal()`, calling `playDealSound()`. Because this executes programmatically without a user touch event, iOS Safari permanently flags the `AudioContext` as suspended and ignores subsequent `audioCtx.resume()` calls originating from gesture handlers.
- **Fix**: Add a one-time global touch listener on `window` to unlock the Web Audio context on the first user interaction.

#### 7. Native `expo-audio` Player Memory Leaks & Silent Mode
- **Files**: `src/utils/sound.ts:176-208, 308-315`
- **Problem**:
  1. `nativeMovePlayer`, `nativeDealPlayer`, and `nativeResetPlayer` are never disposed via `player.remove()`.
  2. `setAudioModeAsync({ playsInSilentMode: true })` is never called, muting all game audio on physical iOS devices when the hardware silent switch is active.
  3. `playGameOverSound()` lacks a native player fallback entirely.
- **Fix**: Configure audio session modes on app mount, implement resource cleanup, and add a native game-over sound asset.

#### 8. Modal Viewport Overflow in Mobile Landscape Mode
- **Files**: `src/components/SettingsModal.tsx:65-300`, `src/components/GameOverModal.tsx:57-177`, `src/components/SeedModal.tsx:90-212`, `src/components/WinModal.tsx:61-140`
- **Problem**: Modal cards exceed 480px in height and are not wrapped in a `ScrollView`. In mobile landscape viewports (height ~375–390px), the primary action buttons are pushed off-screen and cannot be reached.
- **Fix**: Wrap modal content in a `ScrollView` with `maxHeight: '85%'`.

#### 9. Deadlock Detection Firing Mid-Card Drag
- **Files**: `src/screens/GameScreen.tsx:610-624`
- **Problem**: The 300ms deadlock timeout checks `!isAnimatingRef.current`, but does not verify `dragState`. If a player holds a card in the air for 300ms, the game over modal can trigger mid-drag.
- **Fix**: Add `!dragState` to line 614.

---

### [P2] Moderate Bugs & Edge Cases

#### 10. URL Generation Trailing Slash on Static File Paths
- **Files**: `src/utils/share.ts:67-81, 251`
- **Problem**: If the app is loaded via `.../SolitaireClient/index.html`, `cleanBase` evaluates to `https://.../index.html`. Appending `/?...` generates `https://.../index.html/?seed=foo`, creating an invalid URL with a trailing slash after the filename that causes 404s on static file servers.
- **Fix**: Strip `/index.html` from `window.location.pathname` prior to appending query parameters.

#### 11. Timezone Shifts in Daily Challenges
- **Files**: `src/engine/winnable.ts:24-30` & `src/utils/share.ts:46-55`
- **Problem**: `getDailyChallengeSeed(date = new Date())` uses local date components. If constructed from an ISO date string (e.g. `new Date('2026-10-15')`), JavaScript parses it as UTC midnight. In timezones west of UTC (e.g. EDT UTC-4), `getDate()` returns `14`, yielding the wrong challenge date (`2026-10-14`).
- **Fix**: Normalize dates using UTC methods (`getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`).

#### 12. Storage Overwrite Race Condition on Read Failure
- **Files**: `src/storage/storage.ts:84-102`
- **Problem**: `recordGameEnd` performs read-modify-write (`loadStats()` -> compute -> `saveStats()`). If `loadStats()` falls back to `DEFAULT_STATS` due to a transient read failure, `saveStats()` overwrites the player's career statistics with 1 game.
- **Fix**: Ensure `loadStats()` differentiates between empty storage and read exceptions before writing.

---

## 3. Performance Bottlenecks

### 3.1 1-Second Timer Tick Re-renders Entire Component Tree
- **Files**: `src/screens/GameScreen.tsx:561-578`
- **Impact**: Updating `gameState.elapsedSeconds` every 1,000ms creates a new `GameState` object.
  - `GameScreen` re-renders every 1s.
  - `GameHeader.tsx` is not memoized and re-renders every 1s.
  - All tableau and foundation map arrays allocate new element objects every 1s.
- **Solution**: Extract `elapsedSeconds` into an isolated state (or `useGameTimer` hook). Only `GameHeader` requires `elapsedSeconds`. Wrap `GameHeader` in `React.memo` so the tableau and piles experience **zero** re-renders while idle.

### 3.2 Static Embedding of ~154 KB Seed Data in Initial Bundle
- **Files**: `src/engine/winnable.ts:1-11`, `src/data/daily_challenges_10yr.json` (35 KB), `src/data/winnable_draw1.json` (59 KB), `src/data/winnable_draw3.json` (60 KB)
- **Impact**:
  - The three JSON files (~154 KB uncompressed) are imported statically at the root of `winnable.ts`.
  - This data makes up **~18% of the total JS entry bundle size**.
  - On app launch, constructing two `Set<number>` instances of 10,000 integers each allocates ~2 MB of heap and blocks initial render during critical startup path.
- **Solution**:
  1. Lazy-load winnable pools on demand when `SeedModal` or random seed picker is opened.
  2. Trim the random winnable seed pool from 10,000 to 1,000 seeds (~3 KB), providing identical perceived variety with >140 KB bundle reduction.

### 3.3 Broken Component Memoization
- **`src/components/StockWaste.tsx:80`**: `<CardView card={{ id: 'stock_back', suit: 'spades', rank: 1, faceUp: false }} ... />` allocates a new object literal on every render, invalidating `React.memo(CardView)` on every timer tick.
  - *Fix*: Define `const STOCK_BACK_CARD: Card = ...` as a top-level module constant.
- **`src/components/TableauColumn.tsx:152`**: `onPress={() => onCardPress(card, columnIndex)}` creates new inline closures on every render for all cards, breaking `React.memo(DraggableCard)`.
  - *Fix*: Pass `columnIndex` and `card` directly to `DraggableCard` or memoize handlers by card ID.
- **`src/components/DealingOverlay.tsx:145, 160`**: Re-creates `{ ...step.card, faceUp: false }` on every render inside `SingleDealingCard`.

### 3.4 BFS Search Complexity in Deadlock & Hint Detection
- **Files**: `src/engine/rules.ts:227-405` (`canMoveUnlockAdvancement`)
- **Impact**:
  - Explores up to 150 board states using string-concatenated board keys (`serializeBoard`).
  - When deadlocked, it traverses all 150 states for every candidate move without shared transposition caching (up to 1,500 state evaluations synchronously on the JS thread).
- **Solution**:
  1. Replace string concatenation with integer/BigInt Zobrist hashing.
  2. Share a single `visited` transposition table across candidate moves within the same evaluation pass.
  3. Cap `maxStates` to 50–60.

### 3.5 Un-debounced Storage Writes During Auto-Complete
- **Files**: `src/screens/GameScreen.tsx:508-527`
- **Impact**: During auto-complete (running at 80ms intervals), every card move serializes the entire 52-card game state and writes to storage.
- **Solution**: Suppress intermediate autosaves during active auto-complete sequences until the final win state.

---

## 4. Potential Features & Roadmap

### 4.1 Gameplay & Scoring Extensions
- **Vegas Scoring Mode**:
  - Klondike Vegas rules: Ante -$52 at deal, earn +$5 for each card placed on foundation (max $260, net profit $208).
  - Configurable pass limits: 1 pass in Turn 1, 3 passes in Turn 3.
  - Cumulative bankroll tracking in `PlayerStats`.
- **Redo Stack & Move Branch History**:
  - Add standard Redo (`future: MoveRecord[]` stack).
  - Move History Timeline: View move list and jump back to any prior decision point.
- **Multi-Game Solitaire Support**:
  - Modularize engine into `src/engine/klondike/`, `src/engine/freecell/`, and `src/engine/spider/` (reusing card rendering, foundations, and dragging system).

### 4.2 Visuals & Personalization
- **Board Felt Themes**:
  - Classic Emerald Felt (`#064e3b`)
  - Midnight Navy (`#0f172a`)
  - Royal Velvet / Burgundy (`#4c0519`)
  - Charcoal Slate (`#18181b`)
- **Selectable Card Backs**:
  - Classic Blue Lattice
  - Bicycle Crimson Filigree
  - Obsidian Gold Geometric
  - Retro Pixel Art
- **4-Color Deck Option**: High-contrast accessibility palette (Hearts: Red, Diamonds: Blue, Clubs: Green, Spades: Black).
- **Tableau Card Flip Animation**: 120ms horizontal 3D flip animation when turning over newly uncovered tableau cards instead of snapping.

### 4.3 Audio & Immersion
- **Audio Volume Slider**: Continuous volume control (0%–100%) in `SettingsModal`.
- **Haptic Feedback**: Integrate `expo-haptics` for tactile ticks on card drops and foundation placements on iOS and Android.
- **Ambient Parlor Audio**: Optional subtle card felt shuffle/rustle sounds.

### 4.4 Desktop & Platform Experience
- **Web / Desktop Keyboard Shortcuts**:
  - `Space` / `Enter`: Draw card
  - `Cmd+Z` / `Ctrl+Z` / `U`: Undo
  - `Cmd+Shift+Z` / `Ctrl+Y` / `R`: Redo
  - `H`: Show Hint
  - `N`: New Game
  - `D`: Toggle Draw 1 / Draw 3
  - `M`: Toggle Mute
  - `1`–`7`: Focus tableau columns
  - `Esc`: Close modal / clear selection
- **PWA Offline Install Prompt**: Capture `beforeinstallprompt` on Chromium browsers with an "Install Solitaire" button in Settings.
- **Stats Export & Import**: JSON export/import in `StatsModal` to prevent progress loss when clearing browser storage.

---

## 5. Prioritized Action Matrix

| Priority | Area | Action | Impacted Files |
| :---: | :--- | :--- | :--- |
| **P0** | **Bug** | Fix undo score restore exploit by storing actual applied delta | `src/engine/klondike.ts:184-193, 481` (✅ Resolved) |
| **P0** | **Bug** | Prevent permanent game lockout during incomplete auto-complete | `src/engine/rules.ts:83`, `src/screens/GameScreen.tsx:991` (✅ Resolved) |
| **P0** | **Bug** | Fix PanResponder eager capture blocking mobile `ScrollView` | `src/components/DraggableCard.tsx:58, 116` (✅ Resolved) |
| **P0** | **Bug** | Fix stale closure over `dragState` dropping rapid flick gestures | `src/screens/GameScreen.tsx:1030-1089` (✅ Resolved) |
| **P1** | **Performance** | Extract timer tick from `gameState` to eliminate 1Hz full-screen re-render | `src/screens/GameScreen.tsx:561-578` |
| **P1** | **Performance** | Trim / lazy-load ~154 KB seed JSON data from initial bundle | `src/engine/winnable.ts:1-11`, `src/data/` |
| **P1** | **Bug** | Fix audio context suspension on iOS Safari and `expo-audio` native leaks | `src/utils/sound.ts:30-49, 176-208` |
| **P1** | **Bug** | Wrap modal cards in `ScrollView` to fix mobile landscape clipping | `src/components/*Modal.tsx` |
| **P1** | **Architecture** | Remove nested `<Modal>` inside `StatsModal` to fix iOS presentation crashes | `src/components/StatsModal.tsx:112` |
| **P1** | **Architecture** | Purge dead layout refs (`stockLayoutRef`, `tableauLayoutsRef`, dead wrappers) | `src/screens/GameScreen.tsx:357-367, 686-695` |
| **P2** | **Performance** | Fix broken memoization in `StockWaste`, `TableauColumn`, and `DealingOverlay` | `StockWaste.tsx:80`, `TableauColumn.tsx:152` |
| **P2** | **Performance** | Optimize BFS in `canMoveUnlockAdvancement` with integer hashing & shared cache | `src/engine/rules.ts:227-405` |
| **P2** | **Feature** | Add desktop/web keyboard shortcuts (`Space`, `Cmd+Z`, `H`, `N`) | `src/screens/GameScreen.tsx` |
| **P2** | **Feature** | Implement Undo/Redo stack and Vegas scoring mode | `src/engine/klondike.ts`, `src/engine/types.ts` |
| **P3** | **Architecture** | Decompose `GameScreen.tsx` into 5 modular custom hooks | `src/screens/GameScreen.tsx` |
