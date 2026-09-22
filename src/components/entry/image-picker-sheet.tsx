import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { forwardRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/bottom-sheet';
import { Icon } from '@/components/ui/icon';
import { useCloudinaryUpload } from '@/hooks/use-cloudinary-upload';
import { useTheme } from '@/hooks/use-theme';
import { type CloudinaryImage } from '@/lib/cloudinary';

export type ImagePickerSheetProps = {
  /** Called once with every successfully uploaded image from one pick — a
   * multi-select library pick reports all of them together (one PhotoBlock,
   * not one per photo), never one call per photo. */
  onPicked: (images: CloudinaryImage[]) => void;
};

async function pickFrom(source: 'camera' | 'library') {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: false };
  if (source === 'camera') {
    const result = await ImagePicker.launchCameraAsync(options);
    return result.canceled ? [] : result.assets.slice(0, 1);
  }
  const result = await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: true, selectionLimit: 0 });
  return result.canceled ? [] : result.assets;
}

/** Bottom sheet offering "Take Photo" / "Choose from Library" (multi-select),
 * then uploads every picked image to Cloudinary — sequentially, so upload
 * progress ("2 of 5") is simple to show and a mobile connection isn't asked
 * to carry several simultaneous signed uploads — and reports the results via
 * `onPicked`. */
export const ImagePickerSheet = forwardRef<BottomSheetModal, ImagePickerSheetProps>(function ImagePickerSheet(
  { onPicked },
  ref,
) {
  const theme = useTheme();
  const { upload, isUploading, error } = useCloudinaryUpload();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handlePick(source: 'camera' | 'library') {
    const assets = await pickFrom(source);
    if (assets.length === 0) return;

    const uploaded: CloudinaryImage[] = [];
    for (const [index, asset] of assets.entries()) {
      setProgress({ done: index, total: assets.length });
      const result = await upload(asset.uri);
      if (result) uploaded.push(result);
    }
    setProgress(null);

    if (uploaded.length > 0) onPicked(uploaded);
  }

  return (
    <AppBottomSheet ref={ref}>
      <View className="gap-two px-four pt-two">
        {isUploading ? (
          <View className="items-center gap-three py-five">
            <ActivityIndicator color={theme.text} />
            <Text className="font-sans text-[14px]" style={{ color: theme.textSecondary }}>
              {progress && progress.total > 1 ? `Uploading ${progress.done + 1} of ${progress.total}…` : 'Uploading…'}
            </Text>
          </View>
        ) : (
          <>
            <SheetOption icon="camera-outline" label="Take Photo" onPress={() => handlePick('camera')} />
            <SheetOption icon="image-outline" label="Choose from Library" onPress={() => handlePick('library')} />
            {error && (
              <Text className="mt-two text-center font-sans text-[13px]" style={{ color: theme.textSecondary }}>
                {error}
              </Text>
            )}
          </>
        )}
      </View>
    </AppBottomSheet>
  );
});

function SheetOption({ icon, label, onPress }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-three rounded-small px-three py-three"
      style={{ backgroundColor: theme.backgroundElement }}>
      <Icon name={icon} size={20} />
      <Text className="font-sans-medium text-[15px]" style={{ color: theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
