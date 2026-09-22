import { type EditorBridge } from '@10play/tentap-editor';
import type { JSONContent } from '@tiptap/core';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddBlockSheet } from '@/components/journal/add-block-sheet';
import { JournalBlockRenderer } from '@/components/journal/journal-block-renderer';
import { EditorToolbar } from '@/components/entry/rich-text-editor';
import { MoodPicker } from '@/components/entry/mood-picker';
import { TagInput } from '@/components/entry/tag-input';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { TextInput } from '@/components/ui/text-input';
import { type MoodCode } from '@/db/schema';
import { createEntry, updateEntry, type ParsedJournalEntry } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { destroyImage } from '@/lib/cloudinary';
import { type DateKey, toDateKey } from '@/lib/date';
import { createEmptyTextBlock, type JournalBlock, type PhotoBlock } from '@/lib/journal-blocks';
import { uuid } from '@/lib/id';

export type EntryComposerProps = {
  /** Present when editing an existing entry; absent when creating a new one. */
  existingEntry?: ParsedJournalEntry;
  /** Only used when creating — the diary day the new entry belongs to. */
  entryDate?: DateKey;
};

export function EntryComposer({ existingEntry, entryDate }: EntryComposerProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(existingEntry?.title ?? '');
  const [mood, setMood] = useState<MoodCode | null>(existingEntry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(existingEntry?.parsedTags ?? []);
  const [blocks, setBlocks] = useState<JournalBlock[]>(existingEntry?.blocks ?? [createEmptyTextBlock()]);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedText, setFocusedText] = useState<{ id: string; editor: EditorBridge } | null>(null);
  const [insertIndex, setInsertIndex] = useState(0);

  // Photos removed explicitly (not whole-block deletes) during this session —
  // actually deleted from Cloudinary only once the entry is saved, so
  // backing out of the composer without saving leaves them untouched, same
  // deferred-delete behavior as before this refactor.
  const pendingDeletePhotosRef = useRef<{ cloudinaryPublicId: string }[]>([]);
  const textEditorsRef = useRef(new Map<string, EditorBridge>());
  const addBlockSheetRef = useRef<BottomSheetModal>(null);

  function registerEditor(blockId: string, editor: EditorBridge) {
    textEditorsRef.current.set(blockId, editor);
  }
  function unregisterEditor(blockId: string) {
    textEditorsRef.current.delete(blockId);
  }
  const handleFocusChange = useCallback((blockId: string, focused: boolean, editor: EditorBridge) => {
    setFocusedText((prev) => {
      if (focused) {
        // TenTap can report the same focus state more than once. Returning the
        // current value prevents that notification from re-rendering the
        // composer (and every block) indefinitely.
        return prev?.id === blockId && prev.editor === editor ? prev : { id: blockId, editor };
      }
      return prev?.id === blockId ? null : prev;
    });
  }, []);

  function openAddBlock(index: number) {
    setInsertIndex(index);
    addBlockSheetRef.current?.present();
  }

  function handleSelectBlockType(type: JournalBlock['type']) {
    addBlockSheetRef.current?.dismiss();
    const newBlock: JournalBlock =
      type === 'text'
        ? createEmptyTextBlock()
        : type === 'photos'
          ? { id: uuid(), type: 'photos', photos: [] }
          : { id: uuid(), type: 'quote', text: '', author: undefined };
    setBlocks((prev) => [...prev.slice(0, insertIndex), newBlock, ...prev.slice(insertIndex)]);
  }

  function handleBlockChange(blockId: string, next: JournalBlock) {
    setBlocks((prev) => prev.map((block) => (block.id === blockId ? next : block)));
  }

  function handleRemoveBlock(blockId: string) {
    unregisterEditor(blockId);
    setFocusedText((prev) => (prev?.id === blockId ? null : prev));
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
  }

  function handlePhotoRemoved(photo: PhotoBlock['photos'][number]) {
    pendingDeletePhotosRef.current.push({ cloudinaryPublicId: photo.cloudinaryPublicId });
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give your entry a title before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const finalBlocks: JournalBlock[] = await Promise.all(
        blocks.map(async (block) => {
          if (block.type !== 'text') return block;
          const editor = textEditorsRef.current.get(block.id);
          if (!editor) return block;
          const content = (await editor.getJSON()) as JSONContent;
          return { ...block, content };
        }),
      );

      if (existingEntry) {
        await updateEntry({ id: existingEntry.id, title: title.trim(), mood, tags, blocks: finalBlocks });
        await flushPendingDeletes();
        router.replace({ pathname: '/entry/[id]', params: { id: existingEntry.id } });
      } else {
        const id = await createEntry({
          entryDate: entryDate ?? toDateKey(new Date()),
          title: title.trim(),
          mood,
          tags,
          blocks: finalBlocks,
        });
        await flushPendingDeletes();
        router.replace({ pathname: '/entry/[id]', params: { id } });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function flushPendingDeletes() {
    for (const photo of pendingDeletePhotosRef.current) {
      await destroyImage(photo.cloudinaryPublicId).catch(() => {
        // A stray Cloudinary asset isn't worth blocking save on — safe to
        // clean up manually later.
      });
    }
    pendingDeletePhotosRef.current = [];
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center justify-between px-four py-two">
        <IconButton name="close" onPress={() => router.back()} />
        <Button variant="primary" onPress={handleSave} loading={isSaving} style={{ height: 40, paddingHorizontal: 20 }}>
          Save
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        <View className="gap-three px-four pb-three pt-two">
          <TextInput
            variant="plain"
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            className="font-sans-semibold text-[24px]"
            multiline
          />
          <MoodPicker value={mood} onChange={setMood} />
          <TagInput tags={tags} onChange={setTags} />
        </View>

        <View className="gap-three px-four">
          <AddBlockDivider onPress={() => openAddBlock(0)} />
          {blocks.map((block, index) => (
            <View key={block.id} className="gap-three">
              <JournalBlockRenderer
                block={block}
                mode="edit"
                onChange={(next) => handleBlockChange(block.id, next)}
                onRemove={() => handleRemoveBlock(block.id)}
                onPhotoRemoved={handlePhotoRemoved}
                onRegisterEditor={registerEditor}
                onUnregisterEditor={unregisterEditor}
                onFocusChange={handleFocusChange}
              />
              <AddBlockDivider onPress={() => openAddBlock(index + 1)} />
            </View>
          ))}
        </View>
      </ScrollView>

      <EditorToolbar editor={focusedText?.editor} />

      <AddBlockSheet ref={addBlockSheetRef} onSelect={handleSelectBlockType} />
    </SafeAreaView>
  );
}

function AddBlockDivider({ onPress }: { onPress: () => void }) {
  return (
    <View className="items-center">
      <IconButton name="add" variant="filled" size={32} iconSize={16} onPress={onPress} />
    </View>
  );
}
