import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type TextInputProps = RNTextInputProps & { variant?: 'filled' | 'plain' };

/** The app's one text input style — filled (a soft rounded field, for forms)
 * or plain (no background, for large inline titles like the entry title). */
export function TextInput({ variant = 'filled', style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <RNTextInput
      placeholderTextColor={theme.textSecondary}
      className={variant === 'filled' ? 'rounded-small px-three py-three font-sans text-[16px]' : 'font-sans-semibold text-[16px]'}
      style={[{ color: theme.text }, variant === 'filled' && { backgroundColor: theme.backgroundElement }, style]}
      {...rest}
    />
  );
}
