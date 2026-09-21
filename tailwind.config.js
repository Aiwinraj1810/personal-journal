const { Colors, Spacing, Radius } = require('./src/constants/theme-tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        text: Colors.light.text,
        'text-dark': Colors.dark.text,
        background: Colors.light.background,
        'background-dark': Colors.dark.background,
        element: Colors.light.backgroundElement,
        'element-dark': Colors.dark.backgroundElement,
        selected: Colors.light.backgroundSelected,
        'selected-dark': Colors.dark.backgroundSelected,
        'text-secondary': Colors.light.textSecondary,
        'text-secondary-dark': Colors.dark.textSecondary,
      },
      spacing: {
        half: `${Spacing.half}px`,
        one: `${Spacing.one}px`,
        two: `${Spacing.two}px`,
        three: `${Spacing.three}px`,
        four: `${Spacing.four}px`,
        five: `${Spacing.five}px`,
        six: `${Spacing.six}px`,
      },
      // React Native doesn't synthesize font weights — each weight is its own
      // loaded font file. Use e.g. `font-sans-semibold`, not `font-semibold`.
      fontFamily: {
        sans: 'PlayfairDisplay_400Regular',
        'sans-medium': 'PlayfairDisplay_500Medium',
        'sans-semibold': 'PlayfairDisplay_600SemiBold',
        'sans-bold': 'PlayfairDisplay_700Bold',
        'sans-italic': 'PlayfairDisplay_400Regular_Italic',
      },
      borderRadius: {
        small: `${Radius.small}px`,
        card: `${Radius.card}px`,
        sheet: `${Radius.sheet}px`,
        pill: `${Radius.pill}px`,
      },
    },
  },
  plugins: [],
};
