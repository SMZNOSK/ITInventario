// src/styles/tokens/transitions.ts

/**
 * Design System - Transition Tokens
 * 
 * Standardized transition durations and easing functions.
 */

export const transitions = {
    duration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
        slower: '500ms',
    },

    easing: {
        linear: 'linear',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
} as const;

export type TransitionDurationToken = keyof typeof transitions.duration;
export type TransitionEasingToken = keyof typeof transitions.easing;
