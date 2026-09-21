import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/bottom-sheet';
import { Icon } from '@/components/ui/icon';
import { useCloudinaryUpload } from '@/hooks/use-cloudinary-upload';
import { useTheme } from '@/hooks/use-theme';
import { type CloudinaryImage } from '@/lib/cloudinary';

export type ImagePickerSheetProps = {
  onPicked: (image: CloudinaryImage) => void;
};

async function pickFrom(source: 'camera' | 'library') {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0];
}

/** Bottom sheet offering "Take Photo" / "Choose from Library", then uploads the
 * picked image to Cloudinary and reports the result via `onPicked`. */
export const ImagePickerSheet = forwardRef<BottomSheetModal, ImagePickerSheetProps>(function ImagePickerSheet(
  { onPicked },
  ref,
) {
  const theme = useTheme();
  const { upload, isUploading, error } = useCloudinaryUpload();

  async function handlePick(source: 'camera' | 'library') {
    const asset = await pickFrom(source);
    if (!asset) return;
    const uploaded = await upload(asset.uri);
    if (uploaded) onPicked(uploaded);
  }

  return (
    <AppBottomSheet ref={ref}>
      <View className="gap-two px-four pt-two">
        {isUploading ? (
          <View className="items-center gap-three py-five">
            <ActivityIndicator color={theme.text} />
            <Text className="font-sans text-[14px]" style={{ color: theme.textSecondary }}>
              Uploading…
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
