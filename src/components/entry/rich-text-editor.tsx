import { type EditorBridge, RichText, Toolbar } from '@10play/tentap-editor';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

export type RichTextEditorProps = { editor: EditorBridge };

/** Thin presentational wrapper around TenTap's editor + toolbar. The bridge
 * itself — including content CSS (padding, image sizing, custom font) — is
 * created by `useJournalEditor` in the owning screen, since the screen needs
 * the bridge too (to call `editor.getJSON()` on save). */
export function RichTextEditor({ editor }: RichTextEditorProps) {
  return (
    <View style={{ flex: 1 }}>
      <RichText editor={editor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', width: '100%', bottom: 0 }}>
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </View>
  );
}
