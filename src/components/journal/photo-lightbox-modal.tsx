import { Image } from 'expo-image';
import { Modal, Pressable, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';

export type PhotoLightboxModalProps = {
  visible: boolean;
  url: string | undefined;
  onClose: () => void;
};

/** Full-screen tap-to-view for a single photo — no zoom/pan, matching the
 * "don't over-invest here" scope for this feature. */
export function PhotoLightboxModal({ visible, url, onClose }: PhotoLightboxModalProps) {
  if (!url) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="contain" />
        <SafeAreaView style={{ position: 'absolute', top: 0, right: 0 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="m-three h-11 w-11 items-center justify-center rounded-pill"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Icon name="close" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
