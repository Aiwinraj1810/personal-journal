import { Ionicons } from '@expo/vector-icons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

const { VectorIcon } = NativeTabs.Trigger;

function icon(defaultName: keyof (typeof Ionicons)['glyphMap'], selectedName: keyof (typeof Ionicons)['glyphMap']) {
  return {
    default: <VectorIcon family={Ionicons} name={defaultName} />,
    selected: <VectorIcon family={Ionicons} name={selectedName} />,
  };
}

export default function AppTabs() {
  const scheme = useAppColorScheme();
  const colors = Colors[scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={icon('home-outline', 'home')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={icon('calendar-outline', 'calendar')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={icon('settings-outline', 'settings')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
