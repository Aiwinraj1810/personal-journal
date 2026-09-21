import type { MoodCode } from '@/db/schema';

export const MOOD_ORDER: MoodCode[] = ['great', 'good', 'okay', 'low', 'awful'];

export const MOOD_META: Record<MoodCode, { emoji: string; label: string }> = {
  great: { emoji: '😄', label: 'Great' },
  good: { emoji: '🙂', label: 'Good' },
  okay: { emoji: '😐', label: 'Okay' },
  low: { emoji: '🙁', label: 'Low' },
  awful: { emoji: '😞', label: 'Awful' },
};
