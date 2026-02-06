// src/styles/tokens/colors.ts

/**
 * Design System - Color Tokens
 * 
 * CRITICAL: This file uses ONLY neutral colors (grays).
 * Brand colors will be injected via CSS variables in the future.
 * 
 * DO NOT add hardcoded brand colors here.
 */

export const colors = {
    // Neutral palette (grayscale) - These are permanent
    neutral: {
        0: '#FFFFFF',
        50: '#F8FAFC',
        100: '#F1F5F9',
        200: '#E2E8F0',
        300: '#CBD5E1',
        400: '#94A3B8',
        500: '#64748B',
        600: '#475569',
        700: '#334155',
        800: '#1E293B',
        900: '#0F172A',
        950: '#020617',
    },

    // Semantic tokens - Will map to CSS variables for future color injection
    // These reference CSS custom properties that can be swapped without code changes
    primary: {
        50: 'var(--color-primary-50)',
        100: 'var(--color-primary-100)',
        200: 'var(--color-primary-200)',
        300: 'var(--color-primary-300)',
        400: 'var(--color-primary-400)',
        500: 'var(--color-primary-500)',
        DEFAULT: 'var(--color-primary-500)',
        600: 'var(--color-primary-600)',
        700: 'var(--color-primary-700)',
        800: 'var(--color-primary-800)',
        900: 'var(--color-primary-900)',
    },

    secondary: {
        50: 'var(--color-secondary-50)',
        100: 'var(--color-secondary-100)',
        200: 'var(--color-secondary-200)',
        300: 'var(--color-secondary-300)',
        400: 'var(--color-secondary-400)',
        500: 'var(--color-secondary-500)',
        DEFAULT: 'var(--color-secondary-500)',
        600: 'var(--color-secondary-600)',
        700: 'var(--color-secondary-700)',
        800: 'var(--color-secondary-800)',
        900: 'var(--color-secondary-900)',
    },

    success: {
        50: 'var(--color-success-50)',
        100: 'var(--color-success-100)',
        200: 'var(--color-success-200)',
        300: 'var(--color-success-300)',
        400: 'var(--color-success-400)',
        500: 'var(--color-success-500)',
        DEFAULT: 'var(--color-success-500)',
        600: 'var(--color-success-600)',
        700: 'var(--color-success-700)',
        800: 'var(--color-success-800)',
        900: 'var(--color-success-900)',
    },

    warning: {
        50: 'var(--color-warning-50)',
        100: 'var(--color-warning-100)',
        200: 'var(--color-warning-200)',
        300: 'var(--color-warning-300)',
        400: 'var(--color-warning-400)',
        500: 'var(--color-warning-500)',
        DEFAULT: 'var(--color-warning-500)',
        600: 'var(--color-warning-600)',
        700: 'var(--color-warning-700)',
        800: 'var(--color-warning-800)',
        900: 'var(--color-warning-900)',
    },

    danger: {
        50: 'var(--color-danger-50)',
        100: 'var(--color-danger-100)',
        200: 'var(--color-danger-200)',
        300: 'var(--color-danger-300)',
        400: 'var(--color-danger-400)',
        500: 'var(--color-danger-500)',
        DEFAULT: 'var(--color-danger-500)',
        600: 'var(--color-danger-600)',
        700: 'var(--color-danger-700)',
        800: 'var(--color-danger-800)',
        900: 'var(--color-danger-900)',
    },

    info: {
        50: 'var(--color-info-50)',
        100: 'var(--color-info-100)',
        200: 'var(--color-info-200)',
        300: 'var(--color-info-300)',
        400: 'var(--color-info-400)',
        500: 'var(--color-info-500)',
        DEFAULT: 'var(--color-info-500)',
        600: 'var(--color-info-600)',
        700: 'var(--color-info-700)',
        800: 'var(--color-info-800)',
        900: 'var(--color-info-900)',
    },
} as const;

export type ColorToken = keyof typeof colors;
