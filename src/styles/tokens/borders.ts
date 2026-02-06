// src/styles/tokens/borders.ts

/**
 * Design System - Border Tokens
 * 
 * Standardized border radius and border width values.
 * CRITICAL: These values must be used consistently across ALL components.
 */

export const borderRadius = {
    none: '0',
    sm: '0.375rem',   // 6px - Small elements, badges
    base: '0.5rem',   // 8px - DEFAULT for inputs, buttons
    md: '0.75rem',    // 12px - Cards, panels
    lg: '1rem',       // 16px - Large cards, modals
    xl: '1.5rem',     // 24px - Feature cards, hero sections
    '2xl': '2rem',    // 32px - Special elements
    '3xl': '3rem',    // 48px - Extra large elements
    full: '9999px',   // Circular - Pills, avatars, badges
} as const;

export const borderWidth = {
    0: '0',
    DEFAULT: '1px',
    2: '2px',
    4: '4px',
    8: '8px',
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;
export type BorderWidthToken = keyof typeof borderWidth;
