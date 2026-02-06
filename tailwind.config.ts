// tailwind.config.ts
import type { Config } from "tailwindcss";
import { colors } from "./src/styles/tokens/colors";
import { spacing } from "./src/styles/tokens/spacing";
import { typography } from "./src/styles/tokens/typography";
import { borderRadius, borderWidth } from "./src/styles/tokens/borders";
import { shadows } from "./src/styles/tokens/shadows";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Import design tokens
      colors,
      spacing,
      fontFamily: {
        sans: typography.fontFamily.sans.split(', '),
        mono: typography.fontFamily.mono.split(', '),
      },
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      letterSpacing: typography.letterSpacing,
      borderRadius,
      borderWidth,
      boxShadow: shadows,
    },
  },
  plugins: [],
} satisfies Config;
