/**
 * Single source of truth for the app's one font family: Playfair Display.
 * React Native doesn't synthesize font weights from a single font file the way
 * CSS `font-weight` does — each weight is its own loaded font file, exposed as
 * its own `fontFamily` string. Use these names (or the matching NativeWind
 * `font-sans*` classes in tailwind.config.js) instead of `fontWeight`.
 */
export const FontFamily = {
  regular: 'PlayfairDisplay_400Regular',
  medium: 'PlayfairDisplay_500Medium',
  semibold: 'PlayfairDisplay_600SemiBold',
  bold: 'PlayfairDisplay_700Bold',
  italic: 'PlayfairDisplay_400Regular_Italic',
} as const;
