import {
  CoreBridge,
  darkEditorCss,
  darkEditorTheme,
  defaultEditorTheme,
  ImageBridge,
  TenTapStartKit,
  useEditorBridge,
} from '@10play/tentap-editor';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

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
 * The `@font-face` embeds the real Playfair Display Regular TTF as a base64
 * data URI (also the documented pattern for custom fonts) — the WebView has
 * no access to fonts loaded natively via expo-font, so without this the
 * editor would only ever show a system-serif stand-in while writing.
 */
function coreCss(scheme: ReturnType<typeof useColorScheme>): string {
  return `
    @font-face {
      font-family: 'Playfair Display';
      src: url(data:font/truetype;charset=utf-8;base64,${PLAYFAIR_DISPLAY_REGULAR_BASE64}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    .ProseMirror {
      padding: 16px;
      font-family: 'Playfair Display', Georgia, serif;
    }
    ${scheme === 'dark' ? darkEditorCss : ''}
  `;
}

/** Caps an inserted photo to a normal "framed" size regardless of its actual
 * pixel resolution — without this, an image straight from a phone camera
 * (often several thousand pixels wide) renders at native size inside the
 * WebView's CSS pixel space and can dwarf the rest of the document. */
const IMAGE_CSS = `
  .ProseMirror img {
    display: block;
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    border-radius: 12px;
    margin: 12px 0;
  }
`;

/** Wraps TenTap's `useEditorBridge` with the app's defaults: no autofocus (the
 * title field takes focus first), iOS keyboard avoidance, the matching
 * light/dark editor theme (native RN chrome — toolbar, webview background),
 * and the app's content CSS (padding, image sizing, custom font — see
 * `coreCss`/`IMAGE_CSS` above). `initialContentJson` is a serialized Tiptap
 * document (the entries.bodyJson column) or undefined for a new entry. */
export function useJournalEditor(initialContentJson?: string) {
  const scheme = useColorScheme();

  const bridgeExtensions = useMemo(
    () => [...TenTapStartKit, CoreBridge.configureCSS(coreCss(scheme)), ImageBridge.configureCSS(IMAGE_CSS)],
    [scheme],
  );

  return useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    theme: scheme === 'dark' ? darkEditorTheme : defaultEditorTheme,
    initialContent: initialContentJson ? (JSON.parse(initialContentJson) as object) : '',
    bridgeExtensions,
  });
}
