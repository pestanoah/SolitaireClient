# Solitaire (Klondike)

[![Expo SDK 57](https://img.shields.io/badge/Expo-v57.0-blue.svg)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61dafb.svg)](https://reactnative.dev/)
[![React 19](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6.svg)](https://www.typescriptlang.org/)
[![Jest Tests](https://img.shields.io/badge/Tests-61%20passed-brightgreen.svg)](https://jestjs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-Play%20Online-emerald.svg)](https://pestanoah.github.io/SolitaireClient)

A modern, responsive, and cross-platform Klondike Solitaire game built with **Expo (React Native & Web)** and **TypeScript**. Designed with classic casino-felt aesthetics, smooth drag-and-drop mechanics, intelligent hints, and responsive layouts tailored for mobile, tablet, and desktop browsers.

🎮 **[Play the Live Web Version](https://pestanoah.github.io/SolitaireClient)**

---

## Table of Contents

- [Features](#features)
- [Game Rules & Scoring](#game-rules--scoring)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

---

## Features

### 🃏 Gameplay & Game Engine
- **Classic Klondike Solitaire**: Standard 52-card deck with 7 tableau columns, 4 foundation piles, and a stock/waste deck.
- **Draw 1 & Draw 3 Modes**: Easily switch between relaxed Turn-1 play and challenging Turn-3 rules via the in-game settings.
- **Strategic Hint System**: Evaluates the game state and highlights actionable moves using dual-color cues:
  - 🟡 **Amber border**: Source card to move
  - 🔵 **Cyan border**: Optimal destination pile
- **Intelligent Auto-Complete**: Safely resolves the remaining tableau, stock, and waste piles directly into foundations once all hidden tableau cards are exposed.
- **Full Move Undo**: Step backward through any move with score adjustments and face-down card flip restorations.
- **Game State Persistence**: Saves your active game, personal records, and preferences in `AsyncStorage` so you can resume anytime.

### 📱 Ergonomics & Controls
- **Fluid Drag-and-Drop**: Drag cards or stacks naturally across the board with elevation shadows and pile-snapping physics.
- **Tap-to-Move**: Tap any face-up card to auto-route it to foundations or valid tableau columns.
- **Right-Handed Mode**: Invert the header and board pile orientations for comfortable one-handed thumb reach on mobile devices.
- **Mobile Web Optimization**: Touch gestures lock page scrolling during drag operations for a native-feeling experience.

### 🎨 Visuals & Audio
- **Casino Felt Theme**: Refined deep-green felt palette (`#064e3b`), clean borders, and crisp card faces.
- **High-Contrast Typography**: Large indices and clear suit glyphs optimized for small screens.
- **Audio Effects**: Authentic sound feedback for card deals, flips, and resets powered by `expo-audio`.
- **Celebratory Confetti**: Interactive particle bursts (`canvas-confetti`) when completing a winning game.
- **Detailed Statistics Modal**: Track lifetime games played, games won, win rate percentage, high score, and best completion time.

---

## Game Rules & Scoring

The game follows standard Klondike Solitaire scoring conventions:

| Action | Points |
| :--- | :--- |
| **Waste to Tableau** | `+5` points |
| **Waste to Foundation** | `+10` points |
| **Tableau to Foundation** | `+10` points |
| **Turn over Tableau Card** | `+5` points |
| **Foundation back to Tableau** | `-15` points |
| **Recycle Stock (Draw 1)** | `-20` points |
| **Recycle Stock (Draw 3)** | `-50` points |

- **Tableau Building**: Alternate colors (red on black, black on red) in descending sequence (King down to Ace).
- **Empty Tableau Spaces**: Can only be filled by a King (or a stack headed by a King).
- **Foundations**: Built up in matching suits from Ace through King.
- **Win Condition**: Move all 52 cards into the four foundation piles.

---

## Tech Stack

- **Framework**: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- **Core Libraries**: [React Native 0.86](https://reactnative.dev/), [React 19](https://react.dev/), [React Native Web](https://necolas.github.io/react-native-web/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Audio Engine**: [`expo-audio`](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
- **Persistence**: [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/)
- **Visual FX**: [`canvas-confetti`](https://github.com/catdad/canvas-confetti)
- **Unit Testing**: [Jest](https://jestjs.io/) & [`ts-jest`](https://kulshekhar.github.io/ts-jest/)
- **Hosting**: [GitHub Pages](https://pages.github.com/) with [`gh-pages`](https://github.com/tschaub/gh-pages)

---

## Project Structure

```text
solitaire/
├── assets/                     # App icons, splash screens, and audio files
│   ├── sounds/                 # Card deal, move, and reset sound effects (.wav)
│   ├── icon.png
│   └── favicon.png
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── CardView.tsx        # Card face and back rendering with suit emblems
│   │   ├── DraggableCard.tsx   # PanResponder drag-and-drop gesture layer
│   │   ├── FoundationPile.tsx  # Suited foundation drop targets
│   │   ├── GameHeader.tsx      # Timer, score, moves, undo, hints, and controls
│   │   ├── StockWaste.tsx      # Draw deck and waste pile
│   │   ├── TableauColumn.tsx   # Cascading tableau stacks
│   │   ├── SettingsModal.tsx   # Draw count, sound, tap-to-move & hand orientation
│   │   ├── StatsModal.tsx      # Win rates, scores, and best times
│   │   ├── WinModal.tsx        # Victory dialogue and confetti trigger
│   │   ├── GameOverModal.tsx   # Deadlock detection dialogue
│   │   └── ConfirmModal.tsx    # Action confirmations (Restart/New Game)
│   ├── engine/                 # Pure TypeScript deterministic solitaire engine
│   │   ├── deck.ts             # Deck generation and shuffling (Fisher-Yates)
│   │   ├── hints.ts            # Strategic move prioritization & suggestion engine
│   │   ├── klondike.ts         # Move execution, undo mechanics, and auto-complete
│   │   ├── rules.ts            # Klondike validation, deadlock & cycle detection
│   │   ├── types.ts            # Type definitions (Card, GameState, MoveRecord, etc.)
│   │   └── __tests__/          # Unit test suites for engine and hints
│   ├── screens/                # Top-level screen controllers
│   │   ├── GameScreen.tsx      # Core game orchestration and animation state
│   │   └── GameScreen.styles.ts# Responsive layout and card dimension calculations
│   ├── storage/                # AsyncStorage persistence layer & test suites
│   ├── theme/                  # Design tokens (colors, typography, spacing, shadows)
│   └── utils/                  # Cross-platform sound controller & test suites
├── App.tsx                     # Main application entry point & web scroll lock
├── app.json                    # Expo configuration (icons, baseUrl, plugins)
├── index.ts                    # Root component registration
├── jest.config.js              # Jest test configuration
├── package.json                # Project dependencies and npm scripts
└── tsconfig.json               # TypeScript compiler configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- *(Optional)* [Expo Go](https://expo.dev/go) on your iOS or Android mobile device for native testing

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pestanoah/SolitaireClient.git
   cd SolitaireClient
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npm start
```

From the terminal menu, press:
- `w` to open in your default **web browser**
- `i` to open the **iOS Simulator** (macOS with Xcode required)
- `a` to open the **Android Emulator** (Android Studio required)
- Or scan the QR code with **Expo Go** on your phone

You can also run platform-specific launch commands directly:

```bash
# Run web client
npm run web

# Run iOS simulator
npm run ios

# Run Android emulator
npm run android
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Launches the interactive Expo CLI development server. |
| `npm run web` | Starts the Metro bundler targeting web browsers. |
| `npm run ios` | Starts the development server and launches the iOS Simulator. |
| `npm run android` | Starts the development server and launches the Android Emulator. |
| `npm test` | Runs the full Jest test suite across engine, hints, sound, and storage. |
| `npm run build:web` | Exports an optimized single-page web bundle to the `dist/` directory. |
| `npm run deploy` | Builds the web application and publishes it to the `gh-pages` branch. |

---

## Testing

The project uses [Jest](https://jestjs.io/) and [ts-jest](https://kulshekhar.github.io/ts-jest/) for comprehensive test coverage over all game logic, hint algorithms, storage serialization, and audio manager fallbacks.

Run the test suite:

```bash
npm test
```

---

## Deployment

The web client is hosted on **GitHub Pages**. To deploy a new production build:

```bash
npm run deploy
```

This runs `build:web` (`expo export -p web` with SPA 404 routing) and pushes the generated `dist/` output directly to the `gh-pages` branch.

---

## License

This project is licensed under the [MIT License](LICENSE).
