// src/styles/tokens/index.ts

/**
 * Design System - Token Index
 * 
 * Central export for all design tokens.
 * Import from this file to access any token.
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './borders';
export * from './shadows';
export * from './transitions';

// Re-export everything as a single object for convenience
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { borderRadius, borderWidth } from './borders';
import { shadows } from './shadows';
import { transitions } from './transitions';

export const tokens = {
    colors,
    spacing,
    typography,
    borderRadius,
    borderWidth,
    shadows,
    transitions,
} as const;
