/**
 * Plain-JS design tokens. This file has no TypeScript and no Metro/Babel-only syntax
 * because `tailwind.config.js` requires it directly under plain Node (outside the
 * Metro/Babel/TS pipeline). `theme.ts` re-exports these same values (typed) so the
 * app code and the Tailwind config both read from this one source of truth.
 */

const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
};

const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
};

const Radius = {
  small: 12,
  card: 20,
  sheet: 28,
  pill: 999,
};

module.exports = { Colors, Spacing, Radius };
