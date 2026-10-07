# Expo HAS CHANGED

> **CRITICAL DIRECTIVE**: Read the exact versioned docs at [https://docs.expo.dev/versions/v57.0.0/](https://docs.expo.dev/versions/v57.0.0/) before writing any code or introducing Expo APIs.
>
> - **Expo SDK**: `57.0.x`
> - **React**: `19.2.x`
> - **React Native**: `0.86.x`
> - **TypeScript**: `~6.0.x`
> - **Audio API**: Use `expo-audio` (SDK 57+). **Never use deprecated `expo-av`**.
> - **Web Export**: Use `expo export -p web` (Metro web single-page export).

---

## Repository Overview

Cross-platform Klondike Solitaire built with **Expo**, **React Native / React Native Web**, and **TypeScript**. Hosted on GitHub Pages as a responsive web app and compatible with native iOS and Android.

- **Primary Web Deployment**: `https://pestanoah.github.io/SolitaireClient`
- **Root Entry Point**: `App.tsx` (wraps `GameScreen` in `SafeAreaProvider` and sets web scroll locks)
- **Engine**: Pure TypeScript Klondike engine with deterministic state transitions, strategic hint engine, and non-advancing deadlock detection.

---

## Essential Commands

| Command | Purpose | Notes |
| :--- | :--- | :--- |
| `npm test` | Run Jest test suite | **Must pass before committing changes**. Runs via `ts-jest` in `node` environment. |
| `npm run build:web` | Build & export web bundle | Runs `expo export -p web` and copies `index.html` to `404.html` for SPA routing. |
| `npm run web` | Start Metro web bundler | Dev server; run as daemon or in background if spawned by an agent. |
| `npm start` | Interactive Expo CLI | Starts dev server for all platforms. |
| `npm run ios` | Launch iOS simulator | Requires macOS and Xcode. |
| `npm run android` | Launch Android emulator | Requires Android Studio / SDK tools. |
| `npm run deploy` | Deploy to GitHub Pages | Builds web and pushes `dist/` to `gh-pages` branch. |

---

## Architectural Principles & Folder Structure

```text
solitaire/
├── assets/                 # App icons, splash screens, and audio WAV assets
│   └── sounds/             # Sound effects (card_deal.wav, card_move.wav, card_reset.wav)
├── src/
│   ├── engine/             # 100% PURE TypeScript logic (Zero UI / DOM / React dependencies)
│   │   ├── deck.ts         # Deck generation and Fisher-Yates shuffling
│   │   ├── hints.ts        # Strategic hint prioritization & suggestion engine
│   │   ├── klondike.ts     # Move transitions, drawCards, undo, and auto-complete
│   │   ├── rules.ts        # Move validation, game-won checks, accessible deck analysis, deadlock detection
│   │   ├── types.ts        # State types (Card, GameState, MoveRecord, PileLocation, etc.)
│   │   └── __tests__/      # Pure engine Jest test suites (hints.test.ts, klondike.test.ts)
│   ├── components/         # Reusable React Native UI components
│   │   ├── CardView.tsx        # Card face/back rendering with suit emblems
│   │   ├── DraggableCard.tsx   # PanResponder drag gesture handling
│   │   ├── FoundationPile.tsx  # Foundation piles drop targets
│   │   ├── GameHeader.tsx      # Scores, timer, controls (Undo, Hint, Restart, Settings)
│   │   ├── StockWaste.tsx      # Stock deck and waste pile
│   │   ├── TableauColumn.tsx   # Cascading tableau stacks
│   │   ├── SettingsModal.tsx   # Draw count, sound, tap-to-move, hand orientation
│   │   ├── StatsModal.tsx      # Win rate, high scores, best time stats
│   │   ├── WinModal.tsx        # Victory dialogue and confetti trigger
│   │   ├── GameOverModal.tsx   # Deadlock detection dialogue
│   │   ├── ConfirmModal.tsx    # Action confirmations (Restart/New Game)
│   │   └── __tests__/          # Modal and component test suites
│   ├── screens/
│   │   ├── GameScreen.tsx      # Screen orchestration, animations, gesture coordinates, auto-complete
│   │   └── GameScreen.styles.ts# Dynamic card scaling and responsive layouts
│   ├── storage/            # AsyncStorage persistence layer
│   │   ├── storage.ts      # Active game, stats, and settings persistence
│   │   └── __tests__/      # Storage serialization test suite
│   ├── theme/              # Central design tokens (colors, typography, spacing, shadows, modal styles)
│   └── utils/              # Platform utilities
│       ├── sound.ts        # Dual-engine sound: Web Audio API synthesis (Web) & expo-audio (Native)
│       ├── confetti.ts     # Canvas confetti wrapper with SSR/web safety
│       └── __tests__/      # Audio and utility test suites
├── App.tsx                 # Root application wrapper
├── app.json                # Expo config (slug, baseUrl: '/SolitaireClient', plugins: ['expo-audio'])
├── jest.config.js          # Jest config mapping react-native -> react-native-web
└── tsconfig.json           # TypeScript configuration extending expo/tsconfig.base
```

### 1. Pure Engine Separation (`src/engine/`)
- All game mechanics (`klondike.ts`, `rules.ts`, `hints.ts`, `deck.ts`) **must remain pure TypeScript**.
- **NEVER** import React, React Native, Expo, or DOM APIs inside `src/engine/`.
- State transitions must be **immutable**: return updated `GameState` objects; never mutate arrays or card objects in place.
- Ensure every new rule or engine feature has corresponding unit tests in `src/engine/__tests__/`.

### 2. Dual-Engine Audio Architecture (`src/utils/sound.ts`)
- **Web**: Synthesized via browser Web Audio API (`AudioContext`, oscillators, bandpass-filtered noise) for instant zero-latency feedback without asset load latency.
- **Native (iOS/Android)**: Uses `expo-audio` (`createAudioPlayer` with local WAV assets in `assets/sounds/`).
- Do not remove the web synthesis fallback or break SSR/node mock safety in tests.

### 3. Visual FX & Web Compatibility (`src/utils/confetti.ts`)
- Web victory effects use `canvas-confetti`.
- Always guard DOM or canvas operations with `Platform.OS === 'web'` and `typeof window !== 'undefined'`.

### 4. Responsiveness & Gestures
- The app must support portrait and landscape viewport scaling across mobile, tablet, and desktop screens.
- Card dimensions, column spacing, and offsets are dynamically computed in `GameScreen.styles.ts` using `useWindowDimensions()`.
- Supports both **Tap-to-Move** (auto-routes to foundation or lowest valid tableau) and **Drag-and-Drop** (`DraggableCard` with `PanResponder`).
- **Right-Handed Mode**: Inverts the layout orientation of the top piles (stock/waste vs foundations) for thumb accessibility.

---

## Game Rules & Engine Details

### Standard Klondike Rules
- **Deck**: 52 cards (ranks 1-13, suits: spades, hearts, diamonds, clubs). Card IDs use opaque IDs (`c_0`..`c_51`) to support future multi-deck extensions without collision.
- **Tableau**: 7 columns. Stacks build down in descending rank with alternating card colors (`red` / `black`). Empty columns accept only Kings (rank 13).
- **Foundations**: 4 piles built up in suit from Ace (1) to King (13). Win condition: all 4 foundations contain 13 cards (52 total).
- **Stock & Waste**: Supports **Draw 1** and **Draw 3** modes.

### Scoring
- Waste to Tableau: `+5`
- Waste to Foundation: `+10`
- Tableau to Foundation: `+10`
- Turn over Tableau Card: `+5`
- Foundation back to Tableau: `-15`
- Recycle Stock (Draw 1): `-20`
- Recycle Stock (Draw 3): `-50`

### Deadlock & Strategic Hint Logic
- **Advancing Move Principle**: A move is only considered valid for hints or game-continuity if it advances the game:
  1. Uncovers a face-down card in the tableau.
  2. Moves a card to a foundation pile.
  3. Plays an accessible card from the stock or waste.
  4. Unlocks a multi-step sequence leading to one of the above.
- **Deadlock Detection (`hasAvailableMoves`)**: Moving cards pointlessly back and forth or endlessly cycling an unplayable stock is recognized as a deadlock (`GameOverModal`).
- **Auto-Complete (`canAutoComplete`)**: Triggers only when all tableau cards are face-up and uncovered, automatically routing remaining cards to foundations.

---

## Coding Standards & Conventions

1. **TypeScript**:
   - Strict mode enabled.
   - Explicit types for public interfaces and function return signatures.
   - Avoid `any` unless working around third-party types or web-specific polyfills (and document why).

2. **UI & Modals**:
   - Every modal (`SettingsModal`, `StatsModal`, `ConfirmModal`, `GameOverModal`, `WinModal`) must:
     - Allow backdrop click/tap dismissal via `onClose` / `onRequestClose`.
     - Use shared styles from `src/theme/modal.styles.ts` and tokens from `src/theme/`.

3. **Testing**:
   - Test framework: Jest 30 with `ts-jest` preset.
   - Module resolution maps `react-native` to `react-native-web`.
   - Run `npm test` after any modifications to ensure all unit tests pass.
