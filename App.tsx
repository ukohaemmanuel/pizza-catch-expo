import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import {
  FLASH_DURATION_MS,
  ITEM_SIZE,
  PAN_HEIGHT,
  ROUND_DURATION_MS,
  SLOW_FALL_MS,
  SLOW_FALL_SPEED,
  SPAWN_INTERVAL_MS,
  STEADY_FALL_SPEED,
} from './src/game/constants';
import {
  clampPanX,
  itemHitsFloor,
  itemHitsPan,
  panWidthFor,
  randomItemX,
  type FallingItem,
} from './src/game/collision';
import { ITEMS, MUST_HAVE_IDS, type MustHaveId } from './src/game/items';
import {
  applyCatch,
  applyTimeUp,
  computeGrade,
  createScoreState,
  formatSummary,
  junkTotal,
  type Grade,
  type ScoreState,
} from './src/game/scoring';
import { pickSpawnItem } from './src/game/spawn';

type Phase = 'flash' | 'playing' | 'graded';

const PAN_BOTTOM_OFFSET = 18;
const KITCHEN = '#F3E1C1';
const CREAM = '#F8EDD8';
const WOOD = '#C9A06A';
const INK = '#4A3424';

type GradeReport = {
  grade: Grade;
  score: number;
  summary: string;
};

function formatTime(ms: number): string {
  return String(Math.max(0, Math.ceil(ms / 1000)));
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('flash');
  const [playSize, setPlaySize] = useState({ width: 0, height: 0 });
  const [panX, setPanX] = useState(0);
  const [item, setItem] = useState<FallingItem | null>(null);
  const [scoreState, setScoreState] = useState<ScoreState>(createScoreState);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION_MS);
  const [floatLabel, setFloatLabel] = useState<string | null>(null);
  const [report, setReport] = useState<GradeReport | null>(null);
  const [roundId, setRoundId] = useState(0);

  const phaseRef = useRef<Phase>('flash');
  const playSizeRef = useRef(playSize);
  const panXRef = useRef(0);
  const itemRef = useRef<FallingItem | null>(null);
  const scoreRef = useRef(scoreState);
  const elapsedRef = useRef(0);
  const spawnAtRef = useRef(Number.POSITIVE_INFINITY);
  const nextItemKey = useRef(1);
  const roundIdRef = useRef(0);
  const panScale = useRef(new Animated.Value(1)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;
  const endRoundRef = useRef<() => void>(() => {});
  const spawnItemRef = useRef<() => void>(() => {});
  const resolveItemRef = useRef<(caught: boolean) => void>(() => {});

  playSizeRef.current = playSize;
  scoreRef.current = scoreState;
  roundIdRef.current = roundId;

  const panWidth = panWidthFor(playSize.width || 1);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const popPan = useCallback(() => {
    panScale.setValue(1.18);
    Animated.spring(panScale, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: false,
    }).start();
  }, [panScale]);

  const showFloat = useCallback(
    (label: string) => {
      setFloatLabel(label);
      floatOpacity.setValue(1);
      Animated.timing(floatOpacity, {
        toValue: 0,
        duration: 650,
        useNativeDriver: false,
      }).start();
    },
    [floatOpacity]
  );

  const endRound = useCallback(() => {
    if (phaseRef.current !== 'playing') {
      return;
    }
    const ended = applyTimeUp(scoreRef.current);
    scoreRef.current = ended.state;
    setScoreState(ended.state);
    setPhaseSafe('graded');
    setReport({
      grade: computeGrade(ended.state),
      score: ended.state.score,
      summary: formatSummary(ended.state),
    });
  }, [setPhaseSafe]);

  const spawnItem = useCallback(() => {
    const { width } = playSizeRef.current;
    if (width <= 0 || phaseRef.current !== 'playing') {
      return;
    }
    const falling: FallingItem = {
      key: nextItemKey.current,
      itemId: pickSpawnItem(scoreRef.current.mustHaveCounts),
      x: randomItemX(width),
      y: -ITEM_SIZE / 2,
    };
    nextItemKey.current += 1;
    itemRef.current = falling;
    setItem(falling);
    spawnAtRef.current = Number.POSITIVE_INFINITY;
  }, []);

  const resolveItem = useCallback(
    (caught: boolean) => {
      const current = itemRef.current;
      itemRef.current = null;
      setItem(null);
      if (!current || phaseRef.current !== 'playing') {
        return;
      }
      if (caught) {
        const result = applyCatch(scoreRef.current, current.itemId);
        scoreRef.current = result.state;
        setScoreState(result.state);
        popPan();
        showFloat(result.label);
      }
      spawnAtRef.current = elapsedRef.current + SPAWN_INTERVAL_MS;
    },
    [popPan, showFloat]
  );

  endRoundRef.current = endRound;
  spawnItemRef.current = spawnItem;
  resolveItemRef.current = resolveItem;

  const restart = useCallback(() => {
    const { width } = playSizeRef.current;
    const reset = createScoreState();
    scoreRef.current = reset;
    itemRef.current = null;
    elapsedRef.current = 0;
    spawnAtRef.current = Number.POSITIVE_INFINITY;
    panXRef.current = width > 0 ? width / 2 : panXRef.current;
    setScoreState(reset);
    setItem(null);
    setReport(null);
    setFloatLabel(null);
    setTimeLeftMs(ROUND_DURATION_MS);
    if (width > 0) {
      setPanX(width / 2);
    }
    floatOpacity.stopAnimation();
    panScale.stopAnimation();
    floatOpacity.setValue(0);
    panScale.setValue(1);
    setRoundId((id) => id + 1);
    setPhaseSafe('flash');
  }, [floatOpacity, panScale, setPhaseSafe]);

  const onPlayLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setPlaySize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
    const next = clampPanX(panXRef.current || width / 2, width);
    panXRef.current = next;
    setPanX(next);
  }, []);

  const movePan = useCallback((x: number) => {
    if (phaseRef.current !== 'playing') {
      return;
    }
    const next = clampPanX(x, playSizeRef.current.width);
    panXRef.current = next;
    setPanX(next);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => phaseRef.current === 'playing',
        onMoveShouldSetPanResponder: () => phaseRef.current === 'playing',
        onPanResponderGrant: (event) => movePan(event.nativeEvent.locationX),
        onPanResponderMove: (event) => movePan(event.nativeEvent.locationX),
      }),
    [movePan]
  );

  useEffect(() => {
    if (phase !== 'flash') {
      return;
    }
    const timer = setTimeout(() => {
      elapsedRef.current = 0;
      spawnAtRef.current = SPAWN_INTERVAL_MS;
      setTimeLeftMs(ROUND_DURATION_MS);
      setPhaseSafe('playing');
    }, FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase, roundId, setPhaseSafe]);

  useEffect(() => {
    if (phase !== 'playing' || playSize.width <= 0) {
      return;
    }

    let frame = 0;
    let running = true;
    let last = performance.now();
    const startedAt = last;
    elapsedRef.current = 0;

    const tick = (now: number) => {
      if (!running || phaseRef.current !== 'playing' || roundIdRef.current !== roundId) {
        return;
      }
      const elapsed = now - startedAt;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      elapsedRef.current = elapsed;
      setTimeLeftMs(ROUND_DURATION_MS - elapsed);

      if (elapsed >= ROUND_DURATION_MS) {
        endRoundRef.current();
        return;
      }

      if (!itemRef.current && elapsed >= spawnAtRef.current) {
        spawnItemRef.current();
      }

      const falling = itemRef.current;
      if (falling) {
        const speed = elapsed < SLOW_FALL_MS ? SLOW_FALL_SPEED : STEADY_FALL_SPEED;
        const next = { ...falling, y: falling.y + speed * dt };
        if (
          itemHitsPan(
            next,
            panXRef.current,
            playSizeRef.current.width,
            playSizeRef.current.height,
            PAN_BOTTOM_OFFSET
          )
        ) {
          resolveItemRef.current(true);
        } else if (itemHitsFloor(next.y, playSizeRef.current.height)) {
          resolveItemRef.current(false);
        } else {
          itemRef.current = next;
          setItem(next);
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [phase, playSize.width, roundId]);

  const itemDef = item ? ITEMS[item.itemId] : null;
  const junkCaught = junkTotal(scoreState);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.phone}>
        <View style={styles.hud}>
          <Text style={styles.hudTimer}>⏱ {formatTime(timeLeftMs)}</Text>
          <Text style={styles.hudScore}>{scoreState.score}</Text>
          <View style={styles.hudTypes}>
            {MUST_HAVE_IDS.map((id: MustHaveId) => (
              <Text
                key={id}
                style={[
                  styles.hudEmoji,
                  scoreState.mustHaveCounts[id] <= 0 && styles.hudEmojiDim,
                ]}
              >
                {ITEMS[id].emoji}
              </Text>
            ))}
            {junkCaught > 0 ? <Text style={styles.hudJunk}>⚠</Text> : null}
          </View>
        </View>

        <View
          style={styles.play}
          onLayout={onPlayLayout}
          {...panResponder.panHandlers}
        >
          {item && itemDef ? (
            <Text
              style={[
                styles.item,
                {
                  left: item.x - ITEM_SIZE / 2,
                  top: item.y - ITEM_SIZE / 2,
                },
              ]}
            >
              {itemDef.emoji}
            </Text>
          ) : null}

          <Animated.View
            style={[
              styles.pan,
              {
                width: panWidth,
                left: panX - panWidth / 2,
                transform: [{ scale: panScale }],
                pointerEvents: 'none',
              },
            ]}
          >
            <Text style={styles.panEmoji}>🍳</Text>
          </Animated.View>

          {floatLabel ? (
            <Animated.Text
              style={[
                styles.floatLabel,
                {
                  left: panX - 70,
                  opacity: floatOpacity,
                  pointerEvents: 'none',
                },
              ]}
            >
              {floatLabel}
            </Animated.Text>
          ) : null}
        </View>

        {phase === 'flash' ? (
          <View style={[styles.flash, { pointerEvents: 'none' }]}>
            <Text style={styles.flashTitle}>Make a Pizza</Text>
            <Text style={styles.flashEmojis}>
              {ITEMS.dough.emoji} {ITEMS.sauce.emoji} {ITEMS.cheese.emoji}
            </Text>
          </View>
        ) : null}

        {phase === 'graded' && report ? (
          <View style={styles.modalWrap}>
            <View style={styles.modal}>
              <Text style={styles.grade}>{report.grade}</Text>
              <Text style={styles.summary}>{report.summary}</Text>
              <Text style={styles.finalScore}>Score {report.score}</Text>
              <Pressable
                onPress={restart}
                style={({ pressed }) => [styles.replay, pressed && styles.replayPressed]}
              >
                <Text style={styles.replayLabel}>Replay</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8D3A8',
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: KITCHEN,
    paddingTop: Platform.OS === 'web' ? 24 : 48,
    paddingBottom: Platform.OS === 'web' ? 28 : 12,
    position: 'relative',
  },
  hud: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudTimer: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    width: 88,
  },
  hudScore: {
    fontSize: 28,
    fontWeight: '800',
    color: INK,
  },
  hudTypes: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 88,
    justifyContent: 'flex-end',
    gap: 4,
  },
  hudEmoji: {
    fontSize: 22,
  },
  hudEmojiDim: {
    opacity: 0.28,
  },
  hudJunk: {
    fontSize: 18,
    marginLeft: 4,
  },
  play: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: CREAM,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: WOOD,
    overflow: 'hidden',
  },
  item: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    fontSize: 40,
    textAlign: 'center',
    lineHeight: ITEM_SIZE,
  },
  pan: {
    position: 'absolute',
    bottom: PAN_BOTTOM_OFFSET,
    height: PAN_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#E8C992',
    borderWidth: 3,
    borderColor: '#8B5A2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panEmoji: {
    fontSize: 34,
  },
  floatLabel: {
    position: 'absolute',
    bottom: PAN_BOTTOM_OFFSET + PAN_HEIGHT + 8,
    width: 140,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: INK,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: KITCHEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: INK,
    marginBottom: 16,
  },
  flashEmojis: {
    fontSize: 48,
    letterSpacing: 10,
  },
  modalWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(48, 28, 12, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: CREAM,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: WOOD,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  grade: {
    fontSize: 56,
    fontWeight: '900',
    color: INK,
    marginBottom: 12,
  },
  summary: {
    fontSize: 18,
    lineHeight: 28,
    color: INK,
    textAlign: 'center',
    marginBottom: 12,
  },
  finalScore: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    marginBottom: 20,
  },
  replay: {
    backgroundColor: '#8B5A2B',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 999,
  },
  replayPressed: {
    opacity: 0.8,
  },
  replayLabel: {
    color: '#FFF8EC',
    fontSize: 18,
    fontWeight: '800',
  },
});
