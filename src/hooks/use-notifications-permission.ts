import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

export type NotificationPermissionState = 'unknown' | 'granted' | 'denied' | 'undetermined';

export function useNotificationsPermission() {
  const [status, setStatus] = useState<NotificationPermissionState>('unknown');

  const refresh = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    setStatus(current.granted ? 'granted' : current.canAskAgain ? 'undetermined' : 'denied');
  }, []);

  useEffect(() => {
    // The state update inside `refresh` happens after an `await`, not
    // synchronously in this effect body, so it isn't the cascading-render
    // pattern this rule targets — the linter can't see across the async
    // boundary. This just loads the current permission status on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const request = useCallback(async () => {
    const result = await Notifications.requestPermissionsAsync();
    setStatus(result.granted ? 'granted' : 'denied');
    return result.granted;
  }, []);

  return { status, request, refresh };
}
