import React, { createContext, useContext } from 'react';
import {
  DEFAULT_CARD_BACK_PALETTE,
  DEFAULT_CARD_FACE_PALETTE,
  DEFAULT_CONFETTI_PALETTE,
  DEFAULT_FELT_PALETTE,
  ResolvedEquippedThemes,
} from '../engine/rewards';

export const DEFAULT_GAME_THEME: ResolvedEquippedThemes = {
  felt: DEFAULT_FELT_PALETTE,
  cardBack: DEFAULT_CARD_BACK_PALETTE,
  cardFace: DEFAULT_CARD_FACE_PALETTE,
  confetti: DEFAULT_CONFETTI_PALETTE,
};

let activeGameTheme: ResolvedEquippedThemes = DEFAULT_GAME_THEME;

export function setActiveGameTheme(theme: ResolvedEquippedThemes): void {
  activeGameTheme = theme;
}

export const GameThemeContext = createContext<ResolvedEquippedThemes>(DEFAULT_GAME_THEME);

export interface GameThemeProviderProps {
  value: ResolvedEquippedThemes;
  children: React.ReactNode;
}

export const GameThemeProvider: React.FC<GameThemeProviderProps> = ({ value, children }) => {
  activeGameTheme = value;
  return <GameThemeContext.Provider value={value}>{children}</GameThemeContext.Provider>;
};

export function useGameTheme(): ResolvedEquippedThemes {
  const dispatcher =
    (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.H ??
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher
      ?.current;
  if (dispatcher && typeof dispatcher.useContext === 'function') {
    return useContext(GameThemeContext);
  }
  return activeGameTheme;
}
