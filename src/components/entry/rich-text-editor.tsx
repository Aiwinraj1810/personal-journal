import { type EditorBridge, Toolbar } from '@10play/tentap-editor';
import { KeyboardAvoidingView, Platform } from 'react-native';

export type EditorToolbarProps = { editor: EditorBridge | undefined };

/** The composer's one shared formatting toolbar, fixed to the screen bottom.
 * Each Text Block owns its own `RichText`/editor instance (see
 * components/journal/text-block.tsx), but only one Toolbar is ever mounted —
 * bound to whichever block is currently focused — since the toolbar's
 * absolute-bottom positioning only resolves correctly as a sibling of the
 * composer's ScrollView, not nested inside one scrolling block's own view.
 * Renders nothing while no Text Block is focused. */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ position: 'absolute', width: '100%', bottom: 0 }}>
      <Toolbar editor={editor} />
    </KeyboardAvoidingView>
  );
}
