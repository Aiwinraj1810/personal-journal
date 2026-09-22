// One-off dev tool — not wired into any build/npm script. Run manually
// whenever a new Playfair Display weight/style needs to be embedded into the
// journal editor's WebView CSS (see src/hooks/use-journal-editor.ts), since
// the WebView has no access to natively-loaded expo-font fonts.
//
// Usage: node scripts/generate-font-base64.mjs <ttf-path> <CONST_NAME> <out-file>
// Example:
//   node scripts/generate-font-base64.mjs \
//     node_modules/@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf \
//     PLAYFAIR_DISPLAY_BOLD_BASE64 \
//     src/constants/playfair-display-bold-base64.ts

import { readFileSync, writeFileSync } from 'node:fs';

const [, , ttfPath, constName, outFile] = process.argv;

if (!ttfPath || !constName || !outFile) {
  console.error('Usage: node scripts/generate-font-base64.mjs <ttf-path> <CONST_NAME> <out-file>');
  process.exit(1);
}

const base64 = readFileSync(ttfPath).toString('base64');

const contents = `/** Base64-embedded Playfair Display TTF, for the editor's WebView document
 * via a data-URI @font-face — see playfair-display-base64.ts for why this
 * exists. Generated from @expo-google-fonts/playfair-display by
 * scripts/generate-font-base64.mjs; regenerate if that package updates.
 */
export const ${constName} = '${base64}';
`;

writeFileSync(outFile, contents);
console.log(`Wrote ${outFile} (${(base64.length / 1024).toFixed(0)} KB base64)`);
