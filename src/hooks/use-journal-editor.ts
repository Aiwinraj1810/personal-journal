import { CoreBridge, darkEditorCss, darkEditorTheme, defaultEditorTheme, TenTapStartKit, useEditorBridge } from '@10play/tentap-editor';
import type { JSONContent } from '@tiptap/core';
import { useMemo } from 'react';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { PLAYFAIR_DISPLAY_BOLD_BASE64 } from '@/constants/playfair-display-bold-base64';
import { PLAYFAIR_DISPLAY_ITALIC_BASE64 } from '@/constants/playfair-display-italic-base64';
import { PLAYFAIR_DISPLAY_REGULAR_BASE64 } from '@/constants/playfair-display-base64';

/**
 * Editor content CSS, configured via `bridgeExtensions` at editor-creation
 * time rather than injected imperatively after the fact — this is the
 * documented TenTap pattern (docs/examples/customCss: "it is important to
 * spread StarterKit BEFORE our extended plugin", i.e.
 * `[...TenTapStartKit, CoreBridge.configureCSS(css)]`). Baking it into the
 * WebView's initial `injectedJavaScript` this way sidesteps the whole
 * question of *when* the WebView is "ready enough" for an imperative
 * `editor.injectCSS()` call to actually land.
 *
 * The `@font-face` rules embed the real Playfair Display TTFs as base64 data
 * URIs (also the documented pattern for custom fonts) — the WebView has no
 * access to fonts loaded natively via expo-font, so without this the editor
 * would only ever show a system-serif stand-in while writing. All three
 * faces (regular, bold, italic) must be declared, or toggling Bold/Italic in
 * the toolbar correctly flips the `<strong>`/`<em>` marks but has nothing to
 * visibly render with — which is exactly the bug this fixes.
 */
function coreCss(scheme: ReturnType<typeof useAppColorScheme>): string {
  return `
    @font-face {
      font-family: 'Playfair Display';
      src: url(data:font/truetype;charset=utf-8;base64,${PLAYFAIR_DISPLAY_REGULAR_BASE64}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Playfair Display';
      src: url(data:font/truetype;charset=utf-8;base64,${PLAYFAIR_DISPLAY_BOLD_BASE64}) format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Playfair Display';
      src: url(data:font/truetype;charset=utf-8;base64,${PLAYFAIR_DISPLAY_ITALIC_BASE64}) format('truetype');
      font-weight: 400;
      font-style: italic;
    }
    .ProseMirror {
      /* Horizontal alignment comes from the composer's shared block-list
       * padding now (a Text Block is one block among Photo/Quote blocks in
       * the same list, not a full-bleed editor) — only vertical breathing
       * room belongs here, or text would sit inset twice as far as its
       * sibling blocks. */
      padding: 4px 0;
      font-family: 'Playfair Display', Georgia, serif;
    }
    ${scheme === 'dark' ? darkEditorCss : ''}
  `;
}

/** Wraps TenTap's `useEditorBridge` with the app's defaults: no autofocus (the
 * title field takes focus first), iOS keyboard avoidance, the matching
 * light/dark editor theme (native RN chrome — toolbar, webview background),
 * and the app's content CSS (padding, custom font — see `coreCss` above).
 *
 * Deliberately does NOT use TenTap's `dynamicHeight` option. It sounds like
 * the right fit for embedding one editor per Text Block inside the
 * composer's ScrollView, but it drives the WebView's native container height
 * from a ResizeObserver + postMessage round-trip on the web side — a
 * mechanism with several open upstream issues around unstable/runaway height
 * (10play/10tap-editor#276, and the "text jumping" issues #236/#244
 * referenced directly in the library's own RichText.tsx). In practice this
 * showed up as the editor's height growing without bound. Instead each Text
 * Block gets a fixed height (see TEXT_BLOCK_HEIGHT in text-block.tsx) and
 * relies on TenTap's default, well-tested internal-scroll behavior — the
 * same mechanism this app's single full-entry editor already used
 * successfully before this refactor, just bounded to a smaller fixed box
 * instead of filling the whole screen.
 *
 * `initialContent` is a Text Block's serialized content (a Tiptap JSONContent
 * document) or undefined for a brand new block. Scoped to text only — photos
 * are never inserted into this editor, they live in their own PhotoBlock. */
export function useJournalEditor(initialContent?: JSONContent) {
  const scheme = useAppColorScheme();

  const bridgeExtensions = useMemo(() => [...TenTapStartKit, CoreBridge.configureCSS(coreCss(scheme))], [scheme]);

  return useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    theme: scheme === 'dark' ? darkEditorTheme : defaultEditorTheme,
    initialContent: initialContent ?? '',
    bridgeExtensions,
  });
}
