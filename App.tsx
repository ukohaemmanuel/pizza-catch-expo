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
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import {
  RAIL_FEED_MS,
  RAIL_MAX_QUEUE,
  RECIPE_DURATION_MS,
  ROUND_DURATION_MS,
  TOKEN_SIZE,
} from './src/game/constants';
import { ITEMS, MUST_HAVE_IDS, type ItemId, type MustHaveId } from './src/game/items';
import { dropIsOnPlate, swipeIsReject, type Circle } from './src/game/plate';
import {
  applyAccept,
  applyReject,
  applyTimeUp,
  chefLine,
  computePlatingLabel,
  createScoreState,
  formatSummary,
  junkTotal,
  type PlatingLabel,
  type ScoreState,
} from './src/game/scoring';
import { pickSpawnItem } from './src/game/spawn';

type Phase = 'recipe' | 'plating' | 'graded';

type RailToken = {
  key: number;
  itemId: ItemId;
};

type DeskReport = {
  label: PlatingLabel;
  score: number;
  summary: string;
  line: string;
};

const WOOD = '#E7D3B0';
const WOOD_DEEP = '#D7C09A';
const CREAM = '#F7EBDA';
const INK = '#4A3424';
const INK_SOFT = '#7A624C';
const PLATE = '#FFFEFB';
const PLATE_RIM = '#E4DDD0';
const RAIL = '#C9A574';
const EMBER = '#D98A3A';

function slotOffset(id: MustHaveId): { x: number; y: number } {
  if (id === 'dough') {
    return { x: 0, y: 34 };
  }
  if (id === 'sauce') {
    return { x: 0, y: 2 };
  }
  return { x: 0, y: -30 };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('recipe');
  const [scoreState, setScoreState] = useState<ScoreState>(createScoreState);
  const [queue, setQueue] = useState<RailToken[]>([]);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION_MS);
  const [report, setReport] = useState<DeskReport | null>(null);
  const [roundId, setRoundId] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [plateLayout, setPlateLayout] = useState<Circle>({ cx: 0, cy: 0, r: 0 });

  const phaseRef = useRef<Phase>('recipe');
  const scoreRef = useRef(scoreState);
  const queueRef = useRef<RailToken[]>([]);
  const roundIdRef = useRef(0);
  const plateRef = useRef<Circle>(plateLayout);
  const nextKey = useRef(1);
  const dragStart = useRef({ pageX: 0, pageY: 0, cx: 0, cy: 0 });
  const plateViewRef = useRef<View>(null);
  const recipeOpacity = useRef(new Animated.Value(1)).current;

  scoreRef.current = scoreState;
  queueRef.current = queue;
  roundIdRef.current = roundId;
  plateRef.current = plateLayout;

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const feedOne = useCallback(() => {
    if (phaseRef.current !== 'plating') {
      return;
    }
    setQueue((prev) => {
      if (prev.length >= RAIL_MAX_QUEUE) {
        return prev;
      }
      const token: RailToken = {
        key: nextKey.current,
        itemId: pickSpawnItem(scoreRef.current.mustHaveCounts),
      };
      nextKey.current += 1;
      return [...prev, token];
    });
  }, []);

  const resolveActive = useCallback((mode: 'accept' | 'reject') => {
    const current = queueRef.current[0];
    setDrag({ x: 0, y: 0, active: false });
    if (!current || phaseRef.current !== 'plating') {
      return;
    }
    if (mode === 'accept') {
      const result = applyAccept(scoreRef.current, current.itemId);
      scoreRef.current = result.state;
      setScoreState(result.state);
    } else {
      scoreRef.current = applyReject(scoreRef.current, current.itemId);
    }
    setQueue((prev) => prev.slice(1));
  }, []);

  const endRound = useCallback(() => {
    if (phaseRef.current !== 'plating') {
      return;
    }
    const ended = applyTimeUp(scoreRef.current);
    scoreRef.current = ended.state;
    setScoreState(ended.state);
    setDrag({ x: 0, y: 0, active: false });
    setPhaseSafe('graded');
    setReport({
      label: computePlatingLabel(ended.state),
      score: ended.state.score,
      summary: formatSummary(ended.state),
      line: chefLine(ended.state),
    });
  }, [setPhaseSafe]);

  const restart = useCallback(() => {
    const reset = createScoreState();
    scoreRef.current = reset;
    setScoreState(reset);
    setQueue([]);
    setReport(null);
    setTimeLeftMs(ROUND_DURATION_MS);
    setDrag({ x: 0, y: 0, active: false });
    recipeOpacity.setValue(1);
    setRoundId((id) => id + 1);
    setPhaseSafe('recipe');
  }, [recipeOpacity, setPhaseSafe]);

  const onPlateLayout = useCallback(() => {
    plateViewRef.current?.measureInWindow((x, y, w, h) => {
      const circle = { cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2 };
      plateRef.current = circle;
      setPlateLayout(circle);
    });
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          phaseRef.current === 'plating' && queueRef.current.length > 0,
        onMoveShouldSetPanResponder: () =>
          phaseRef.current === 'plating' && queueRef.current.length > 0,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const { pageX, pageY } = event.nativeEvent;
          dragStart.current = { pageX, pageY, cx: pageX, cy: pageY };
          setDrag({ x: 0, y: 0, active: true });
        },
        onPanResponderMove: (event: GestureResponderEvent) => {
          const { pageX, pageY } = event.nativeEvent;
          setDrag({
            x: pageX - dragStart.current.pageX,
            y: pageY - dragStart.current.pageY,
            active: true,
          });
        },
        onPanResponderRelease: (
          event: GestureResponderEvent,
          gesture: PanResponderGestureState
        ) => {
          const { pageX, pageY } = event.nativeEvent;
          const overPlate = dropIsOnPlate(pageX, pageY, plateRef.current);
          if (overPlate) {
            resolveActive('accept');
            return;
          }
          if (swipeIsReject(gesture.vx, gesture.vy, overPlate)) {
            resolveActive('reject');
            return;
          }
          setDrag({ x: 0, y: 0, active: false });
        },
        onPanResponderTerminate: () => {
          setDrag({ x: 0, y: 0, active: false });
        },
      }),
    [resolveActive]
  );

  useEffect(() => {
    if (phase !== 'recipe') {
      return;
    }
    recipeOpacity.setValue(1);
    const fade = setTimeout(() => {
      Animated.timing(recipeOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && roundIdRef.current === roundId) {
          setPhaseSafe('plating');
        }
      });
    }, RECIPE_DURATION_MS - 280);
    return () => clearTimeout(fade);
  }, [phase, recipeOpacity, roundId, setPhaseSafe]);

  useEffect(() => {
    if (phase !== 'plating') {
      return;
    }
    feedOne();
    const feed = setInterval(feedOne, RAIL_FEED_MS);
    return () => clearInterval(feed);
  }, [feedOne, phase, roundId]);

  useEffect(() => {
    if (phase !== 'plating') {
      return;
    }
    let frame = 0;
    let running = true;
    const startedAt = performance.now();

    const tick = (now: number) => {
      if (!running || phaseRef.current !== 'plating' || roundIdRef.current !== roundId) {
        return;
      }
      const remaining = ROUND_DURATION_MS - (now - startedAt);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        endRound();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [endRound, phase, roundId]);

  const oven = Math.max(0, Math.min(1, timeLeftMs / ROUND_DURATION_MS));
  const active = queue[0] ?? null;
  const waiting = queue.slice(1);
  const contaminated = junkTotal(scoreState) > 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.desk}>
        <View style={styles.grain} pointerEvents="none" />
        <View style={styles.header}>
          <Text style={styles.dish}>Pizza</Text>
          <View style={styles.ovenWell}>
            <View style={[styles.ovenFill, { width: 72 * oven }]} />
          </View>
        </View>

        <View style={styles.board}>
          <View style={styles.plateShadow} />
          <View ref={plateViewRef} style={styles.plate} onLayout={onPlateLayout}>
            {contaminated ? <View style={styles.stain} /> : null}
            {MUST_HAVE_IDS.map((id) => {
              const filled = scoreState.mustHaveCounts[id] > 0;
              const pos = slotOffset(id);
              return (
                <View
                  key={id}
                  style={[
                    styles.slot,
                    {
                      transform: [{ translateX: pos.x }, { translateY: pos.y }],
                      opacity: filled ? 1 : 0.22,
                    },
                  ]}
                >
                  <Text style={styles.slotEmoji}>{ITEMS[id].emoji}</Text>
                  {scoreState.mustHaveCounts[id] > 1 ? (
                    <Text style={styles.extraMark}>+</Text>
                  ) : null}
                </View>
              );
            })}
            {scoreState.junkCounts.banana > 0 ? (
              <Text style={[styles.junkMark, { transform: [{ translateX: 36 }, { translateY: 18 }] }]}>
                🍌
              </Text>
            ) : null}
            {scoreState.junkCounts.iceCream > 0 ? (
              <Text style={[styles.junkMark, { transform: [{ translateX: -34 }, { translateY: -8 }] }]}>
                🍦
              </Text>
            ) : null}
          </View>
        </View>

        {phase !== 'graded' ? (
          <View style={styles.rail}>
            <Text style={styles.railLabel}>mise</Text>
            <View style={styles.railTrack}>
              {active ? (
                <View
                  style={[
                    styles.token,
                    drag.active && {
                      transform: [{ translateX: drag.x }, { translateY: drag.y }],
                      zIndex: 4,
                      elevation: 4,
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <Text style={styles.tokenEmoji}>{ITEMS[active.itemId].emoji}</Text>
                </View>
              ) : (
                <View style={styles.tokenGhost} />
              )}
              {waiting.map((token) => (
                <View key={token.key} style={[styles.token, styles.tokenWaiting]}>
                  <Text style={styles.tokenEmoji}>{ITEMS[token.itemId].emoji}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {phase === 'recipe' ? (
          <Animated.View
            pointerEvents="auto"
            style={[styles.recipe, { opacity: recipeOpacity }]}
          >
            <Text style={styles.recipeKicker}>On the pass</Text>
            <View style={styles.recipePlate}>
              {MUST_HAVE_IDS.map((id) => {
                const pos = slotOffset(id);
                return (
                  <View
                    key={id}
                    style={[
                      styles.recipeSlot,
                      { transform: [{ translateX: pos.x * 1.15 }, { translateY: pos.y * 1.15 }] },
                    ]}
                  >
                    <Text style={styles.recipeEmoji}>{ITEMS[id].emoji}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.recipeHint}>Pizza</Text>
          </Animated.View>
        ) : null}

        {phase === 'graded' && report ? (
          <View style={styles.finish} pointerEvents="box-none">
            <Text style={styles.finishLabel}>{report.label}</Text>
            <Text style={styles.chef}>{report.line}</Text>
            <Text style={styles.finishSummary}>{report.summary}</Text>
            <Pressable
              onPress={restart}
              style={({ pressed }) => [styles.replay, pressed && styles.replayPressed]}
            >
              <Text style={styles.replayLabel}>Replay</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WOOD_DEEP,
    alignItems: 'center',
  },
  desk: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: WOOD,
    paddingTop: Platform.OS === 'web' ? 28 : 56,
    paddingBottom: 16,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    opacity: 0.08,
  },
  header: {
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dish: {
    fontSize: 15,
    letterSpacing: 6,
    textTransform: 'uppercase',
    color: INK_SOFT,
    fontWeight: '500',
  },
  ovenWell: {
    width: 72,
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(90, 50, 20, 0.12)',
    overflow: 'hidden',
  },
  ovenFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: EMBER,
    opacity: 0.72,
  },
  board: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateShadow: {
    position: 'absolute',
    width: 236,
    height: 28,
    borderRadius: 99,
    backgroundColor: 'rgba(74, 52, 36, 0.22)',
    transform: [{ translateY: 108 }],
  },
  plate: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: PLATE,
    borderWidth: 1.5,
    borderColor: PLATE_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stain: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 110,
    backgroundColor: 'rgba(176, 122, 48, 0.22)',
  },
  slot: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmoji: {
    fontSize: 32,
  },
  extraMark: {
    position: 'absolute',
    right: 0,
    top: 2,
    fontSize: 12,
    color: INK_SOFT,
  },
  junkMark: {
    position: 'absolute',
    fontSize: 26,
    opacity: 0.9,
  },
  rail: {
    marginHorizontal: 18,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: RAIL,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#B08A55',
    overflow: 'visible',
  },
  railLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(74, 52, 36, 0.55)',
    marginBottom: 8,
  },
  railTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOKEN_SIZE,
    gap: 10,
  },
  token: {
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    borderRadius: 16,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 36, 0.08)',
  },
  tokenWaiting: {
    opacity: 0.55,
  },
  tokenGhost: {
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 36, 0.12)',
    borderStyle: 'dashed',
  },
  tokenEmoji: {
    fontSize: 30,
  },
  recipe: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WOOD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeKicker: {
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: INK_SOFT,
    marginBottom: 28,
  },
  recipePlate: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: PLATE_RIM,
    backgroundColor: 'rgba(255,254,251,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeSlot: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(74, 52, 36, 0.18)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeEmoji: {
    fontSize: 28,
    opacity: 0.45,
  },
  recipeHint: {
    marginTop: 28,
    fontSize: 15,
    letterSpacing: 6,
    textTransform: 'uppercase',
    color: INK_SOFT,
  },
  finish: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(231, 211, 176, 0.42)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: 28,
  },
  finishLabel: {
    fontSize: 34,
    letterSpacing: 8,
    textTransform: 'uppercase',
    fontWeight: '400',
    color: INK,
    marginBottom: 10,
  },
  chef: {
    fontSize: 16,
    lineHeight: 24,
    color: INK,
    textAlign: 'center',
    marginBottom: 10,
  },
  finishSummary: {
    fontSize: 13,
    lineHeight: 20,
    color: INK_SOFT,
    textAlign: 'center',
    marginBottom: 22,
  },
  replay: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: INK,
  },
  replayPressed: {
    opacity: 0.6,
  },
  replayLabel: {
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: INK,
  },
});
