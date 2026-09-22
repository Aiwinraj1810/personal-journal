import { useEffect, useRef, useState } from 'react';
import { FlatList, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useMemories, type Memory } from '@/hooks/use-memories';

import { MemoryCard } from './memory-card';

const AUTOPLAY_INTERVAL_MS = 9000;
const RESUME_DELAY_MS = 6000;

/** The Home screen's "✨ Memories" section — a single card, a lightweight
 * autoplaying carousel, or a quiet empty state, depending on how much
 * derived memory content exists (see @/hooks/use-memories). */
export function MemoriesSection() {
  const theme = useTheme();
  const memories = useMemories();

  if (memories.length === 0) {
    return (
      <View className="gap-three">
        <SectionHeader />
        <View className="items-center rounded-card px-four py-six" style={{ backgroundColor: theme.backgroundElement }}>
          <Text className="text-center font-sans text-[14px] leading-[21px]" style={{ color: theme.textSecondary }}>
            Start journaling.{'\n'}Your memories will appear here. ✨
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-three">
      <SectionHeader />
      {memories.length === 1 ? <MemoryCard memory={memories[0]} /> : <MemoryCarousel memories={memories} />}
    </View>
  );
}

function SectionHeader() {
  const theme = useTheme();
  return (
    <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
      Memories
    </Text>
  );
}

function MemoryCarousel({ memories }: { memories: Memory[] }) {
  const theme = useTheme();
  const listRef = useRef<FlatList<Memory>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const isUserScrolling = useRef(false);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopAutoplay() {
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer.current = setInterval(() => {
      const next = (indexRef.current + 1) % memories.length;
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, AUTOPLAY_INTERVAL_MS);
  }

  useEffect(() => {
    if (width === 0) return;
    startAutoplay();
    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, memories.length]);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  // Only a real user drag pauses autoplay and schedules a resume — the
  // autoplay timer's own `scrollToOffset` calls also fire momentum events,
  // but never a drag-begin, so they're distinguished automatically.
  function handleDragStart() {
    isUserScrolling.current = true;
    stopAutoplay();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    indexRef.current = next;
    setIndex(next);

    if (isUserScrolling.current) {
      isUserScrolling.current = false;
      resumeTimer.current = setTimeout(startAutoplay, RESUME_DELAY_MS);
    }
  }

  return (
    <View className="gap-three" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          ref={listRef}
          data={memories}
          keyExtractor={(memory) => memory.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={handleDragStart}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => <MemoryCard memory={item} style={{ width }} />}
        />
      )}

      <View className="flex-row justify-center gap-one">
        {memories.map((memory, i) => (
          <View
            key={memory.id}
            style={{
              width: i === index ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? theme.text : theme.backgroundSelected,
            }}
          />
        ))}
      </View>
    </View>
  );
}
