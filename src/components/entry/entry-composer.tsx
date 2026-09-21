import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImagePickerSheet } from '@/components/entry/image-picker-sheet';
import { MoodPicker } from '@/components/entry/mood-picker';
import { RichTextEditor } from '@/components/entry/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { TextInput } from '@/components/ui/text-input';
import { type MoodCode } from '@/db/schema';
import { type EntryWithImages, addEntryImage, createEntry, removeEntryImage, updateEntry } from '@/hooks/use-entries';
import { useJournalEditor } from '@/hooks/use-journal-editor';
import { useTheme } from '@/hooks/use-theme';
import { type CloudinaryImage, destroyImage, transformUrl } from '@/lib/cloudinary';
import { type DateKey, toDateKey } from '@/lib/date';
import { removeImageByPublicId, type TiptapNode } from '@/lib/tiptap';

type PendingImage = CloudinaryImage & { dbId?: string };

/** Inline-preview size — capped well below most camera-original resolutions,
 * matching the "normal rectangle frame, not the actual resolution" ask. */
const INLINE_IMAGE_TRANSFORM = 'w_1000,c_limit,q_auto,f_auto';

export type EntryComposerProps = {
  /** Present when editing an existing entry; absent when creating a new one. */
  existingEntry?: EntryWithImages;
  /** Only used when creating — the diary day the new entry belongs to. */
  entryDate?: DateKey;
};

export function EntryComposer({ existingEntry, entryDate }: EntryComposerProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(existingEntry?.title ?? '');
  const [mood, setMood] = useState<MoodCode | null>(existingEntry?.mood ?? null);
  const [images, setImages] = useState<PendingImage[]>(
    existingEntry?.images.map((img) => ({
      dbId: img.id,
      publicId: img.cloudinaryPublicId,
      url: img.cloudinaryUrl,
      width: img.width ?? 0,
      height: img.height ?? 0,
    })) ?? [],
  );
  // Images the user removed this session that were already persisted —
  // actually deleted from Cloudinary/the DB only once the entry is saved, so
  // backing out of the composer without saving leaves them untouched.
  const [pendingDeleteImages, setPendingDeleteImages] = useState<PendingImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useJournalEditor(existingEntry?.bodyJson);
  const imagePickerRef = useRef<BottomSheetModal>(null);

  async function handleAddImage(image: CloudinaryImage) {
    editor.setImage(transformUrl(image.url, INLINE_IMAGE_TRANSFORM));

    // Tiptap's image node is block-level, so it already lands on its own
    // line — but if it's now the very last node in the document, there's
    // nothing after it to place a cursor into. Append an empty paragraph in
    // that case so there's always somewhere to keep typing below the photo.
    const doc = (await editor.getJSON()) as TiptapNode;
    const blocks = doc.content ?? [];
    if (blocks[blocks.length - 1]?.type === 'image') {
      editor.setContent({ ...doc, content: [...blocks, { type: 'paragraph' }] });
    }
    editor.focus('end');

    setImages((prev) => [...prev, image]);
  }

  async function handleRemoveImage(image: PendingImage) {
    // Strip the embedded copy from the actual body content, not just the
    // thumbnail chip — otherwise the photo stays visible in the text even
    // after its chip is gone.
    const currentDoc = (await editor.getJSON()) as TiptapNode;
    editor.setContent(removeImageByPublicId(currentDoc, image.publicId));

    if (image.dbId) {
      setPendingDeleteImages((prev) => [...prev, image]);
    }
    setImages((prev) => prev.filter((img) => img.publicId !== image.publicId));
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give your entry a title before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const bodyJson = JSON.stringify(await editor.getJSON());

      if (existingEntry) {
        await updateEntry({ id: existingEntry.id, title: title.trim(), bodyJson, mood });
        const newImages = images.filter((img) => !img.dbId);
        for (const img of newImages) {
          await addEntryImage({
            entryId: existingEntry.id,
            cloudinaryPublicId: img.publicId,
            cloudinaryUrl: img.url,
            width: img.width,
            height: img.height,
            isCover: existingEntry.images.length === 0 && newImages[0] === img,
          });
        }
        await flushPendingDeletes();
        router.replace({ pathname: '/entry/[id]', params: { id: existingEntry.id } });
      } else {
        const id = await createEntry({ entryDate: entryDate ?? toDateKey(new Date()), title: title.trim(), bodyJson, mood });
        for (const [index, img] of images.entries()) {
          await addEntryImage({
            entryId: id,
            cloudinaryPublicId: img.publicId,
            cloudinaryUrl: img.url,
            width: img.width,
            height: img.height,
            isCover: index === 0,
          });
        }
        await flushPendingDeletes();
        router.replace({ pathname: '/entry/[id]', params: { id } });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function flushPendingDeletes() {
    for (const img of pendingDeleteImages) {
      if (img.dbId) await removeEntryImage(img.dbId);
      await destroyImage(img.publicId).catch(() => {
        // DB row is already gone either way; a stray Cloudinary asset isn't
        // worth blocking save on — safe to clean up manually later.
      });
    }
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center justify-between px-four py-two">
        <IconButton name="close" onPress={() => router.back()} />
        <Button variant="primary" onPress={handleSave} loading={isSaving} style={{ height: 40, paddingHorizontal: 20 }}>
          Save
        </Button>
      </View>

      {/*
        The title/mood/images header is a plain (non-scrolling) View, and the
        editor below is a flex:1 sibling — NOT nested inside a ScrollView.
        TenTap's RichText is backed by a WebView; a `flex:1` child inside a
        ScrollView's content container has no bounded height to resolve
        against and collapses to ~0px (which is why the editor didn't render
        at all). The editor handles its own internal scrolling, matching
        TenTap's own recommended layout.
      */}
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

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-one">
            <View className="flex-row gap-two px-one">
              {images.map((img) => (
                <View key={img.publicId} className="relative">
                  <Image source={{ uri: img.url }} style={{ width: 64, height: 64, borderRadius: 14 }} contentFit="cover" />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleRemoveImage(img)}
                    className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-pill"
                    style={{ backgroundColor: theme.text }}>
                    <Icon name="close" size={12} color={theme.background} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => imagePickerRef.current?.present()}
                className="items-center justify-center rounded-small"
                style={{ width: 64, height: 64, backgroundColor: theme.backgroundElement }}>
                <Icon name="add" size={20} muted />
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Edge-to-edge — the editor's own content CSS pads its text (see
          coreCss in use-journal-editor.ts), so an outer px-four here would
          double up the inset instead of matching it. */}
      <View className="flex-1">
        <RichTextEditor editor={editor} />
      </View>

      {images.length === 0 && (
        <View className="px-four pb-three">
          <Pressable
            accessibilityRole="button"
            onPress={() => imagePickerRef.current?.present()}
            className="flex-row items-center justify-center gap-two rounded-small py-three"
            style={{ backgroundColor: theme.backgroundElement }}>
            <Icon name="image-outline" size={18} muted />
            <Text className="font-sans-medium text-[14px]" style={{ color: theme.textSecondary }}>
              Add a photo
            </Text>
          </Pressable>
        </View>
      )}

      <ImagePickerSheet ref={imagePickerRef} onPicked={handleAddImage} />
    </SafeAreaView>
  );
}
