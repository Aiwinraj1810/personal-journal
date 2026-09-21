import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  type BottomSheetModalProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, type PropsWithChildren } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';

export type AppBottomSheetProps = PropsWithChildren<Partial<BottomSheetModalProps>>;

function renderBackdrop(props: BottomSheetBackdropProps) {
  // opacity capped well below fully opaque — a heavy dark scrim reads as high-
  // stimulation; this stays subtle while still focusing attention on the sheet.
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} pressBehavior="close" />;
}

/** The app's one bottom sheet: content-sized by default (no manual snap
 * points needed for forms/pickers), themed to match light/dark, rounded top
 * corners, and a soft backdrop. Every modal-presented sheet in the app
 * (image picker, entry/event options, mood picker, event form) wraps this. */
export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(function AppBottomSheet(
  { children, ...props },
  ref,
) {
  const theme = useTheme();

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.background, borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet }}
      handleIndicatorStyle={{ backgroundColor: theme.backgroundSelected, width: 36 }}
      {...props}>
      <BottomSheetView style={{ paddingBottom: Radius.sheet }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
