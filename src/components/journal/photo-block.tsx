import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ImagePickerSheet } from '@/components/entry/image-picker-sheet';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { uuid } from '@/lib/id';
import type { CloudinaryImage } from '@/lib/cloudinary';
import type { PhotoBlock } from '@/lib/journal-blocks';

import { PhotoLightboxModal } from './photo-lightbox-modal';

export type PhotoBlockViewProps = {
  block: PhotoBlock;
  mode: 'edit' | 'read';
  onChange?: (next: PhotoBlock) => void;
  /** Removes the whole block. Deliberately does not clean up Cloudinary —
   * see individual-photo removal below for that. */
  onRemove?: () => void;
  /** Edit mode only — an explicit single-photo removal, unlike whole-block
   * delete, still issues a Cloudinary destroy call (deferred until Save,
   * matching this app's pre-refactor behavior). */
  onPhotoRemoved?: (photo: PhotoBlock['photos'][number]) => void;
};

const ASPECT_RATIO = 1.3;

export function PhotoBlockView({ block, mode, onChange, onRemove, onPhotoRemoved }: PhotoBlockViewProps) {
  const theme = useTheme();
  const pickerRef = useRef<BottomSheetModal>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const editable = mode === 'edit';

  function handlePicked(images: CloudinaryImage[]) {
    onChange?.({
      ...block,
      photos: [
        ...block.photos,
        ...images.map((img) => ({ id: uuid(), url: img.url, width: img.width, height: img.height, cloudinaryPublicId: img.publicId })),
      ],
    });
  }

  function handleRemovePhoto(photo: PhotoBlock['photos'][number]) {
    onChange?.({ ...block, photos: block.photos.filter((p) => p.id !== photo.id) });
    onPhotoRemoved?.(photo);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <View className="gap-two">
      <View
        className="overflow-hidden rounded-card"
        style={{ aspectRatio: ASPECT_RATIO, backgroundColor: theme.backgroundElement }}
        onLayout={(e) => {
          const nextWidth = e.nativeEvent.layout.width;
          setWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
        }}>
        {block.photos.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => pickerRef.current?.present()}
            className="flex-1 items-center justify-center gap-two">
            <Icon name="image-outline" size={22} muted />
          </Pressable>
        ) : width > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}>
            {block.photos.map((photo) => (
              <Pressable key={photo.id} onPress={() => setLightboxUrl(photo.url)} style={{ width }}>
                <Image source={{ uri: photo.url }} style={{ width, aspectRatio: ASPECT_RATIO }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {editable && block.photos.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => handleRemovePhoto(block.photos[page])}
            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-pill"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Icon name="close" size={16} color="#fff" />
          </Pressable>
        )}

        {editable && (
          <Pressable
            accessibilityRole="button"
            onPress={() => pickerRef.current?.present()}
            className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-pill"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Icon name="add" size={18} color="#fff" />
          </Pressable>
        )}

        {editable && (
          <Pressable
            accessibilityRole="button"
            onPress={onRemove}
            className="absolute left-2 top-2 h-8 w-8 items-center justify-center rounded-pill"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Icon name="trash-outline" size={16} color="#fff" />
          </Pressable>
        )}
      </View>

      {block.photos.length > 1 && (
        <View className="flex-row justify-center gap-one">
          {block.photos.map((photo, index) => (
            <View
              key={photo.id}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: index === page ? theme.text : theme.backgroundSelected,
              }}
            />
          ))}
        </View>
      )}

      <ImagePickerSheet ref={pickerRef} onPicked={handlePicked} />
      <PhotoLightboxModal visible={lightboxUrl !== null} url={lightboxUrl ?? undefined} onClose={() => setLightboxUrl(null)} />
    </View>
  );
}
