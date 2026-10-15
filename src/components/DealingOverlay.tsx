import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { CardView } from './CardView';
import { DealStep } from '../engine/deck';
import { GameState, PileType } from '../engine/types';
import { playDealSound } from '../utils/sound';
import { shadows } from '../theme';

export const DEFAULT_DEAL_STAGGER_MS = 28;
export const DEFAULT_DEAL_DURATION_MS = 160;

export interface DealingOverlayProps {
  steps: DealStep[];
  cardWidth: number;
  cardHeight: number;
  getPileBasePosition: (
    pile: { type: PileType; index?: number },
    wasteCountOverride?: number
  ) => { x: number; y: number };
  getPileCardPosition: (
    pile: { type: PileType; index?: number },
    cardIndexInPile: number,
    state?: GameState
  ) => { x: number; y: number };
  gameState: GameState;
  onComplete: () => void;
  soundEnabled?: boolean;
  staggerMs?: number;
  durationMs?: number;
}

interface SingleDealingCardProps {
  step: DealStep;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
  cardWidth: number;
  cardHeight: number;
  onArrived?: () => void;
}

const SingleDealingCard: React.FC<SingleDealingCardProps> = React.memo(({
  step,
  startX,
  startY,
  endX,
  endY,
  delay,
  duration,
  cardWidth,
  cardHeight,
  onArrived,
}) => {
  const [started, setStarted] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animInstance: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      setStarted(true);
      animInstance = Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      });
      animInstance.start(() => {
        onArrived?.();
      });
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animInstance) {
        animInstance.stop();
      }
    };
  }, [delay, duration, anim, onArrived]);

  if (!started) return null;

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, endY],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          height: cardHeight,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      {step.faceUp ? (
        <Animated.View
          style={{
            width: cardWidth,
            height: cardHeight,
            transform: [
              {
                rotateY: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['0deg', '90deg', '0deg'],
                }),
              },
            ],
          }}
        >
          {/* Card Back: visible during first half of flight */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: anim.interpolate({
                inputRange: [0, 0.49, 0.5, 1],
                outputRange: [1, 1, 0, 0],
              }),
            }}
          >
            <CardView card={{ ...step.card, faceUp: false }} width={cardWidth} height={cardHeight} />
          </Animated.View>

          {/* Card Front: visible during second half of flight */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: anim.interpolate({
                inputRange: [0, 0.5, 0.51, 1],
                outputRange: [0, 0, 1, 1],
              }),
            }}
          >
            <CardView card={{ ...step.card, faceUp: true }} width={cardWidth} height={cardHeight} />
          </Animated.View>
        </Animated.View>
      ) : (
        <CardView card={{ ...step.card, faceUp: false }} width={cardWidth} height={cardHeight} />
      )}
    </Animated.View>
  );
});

export const DealingOverlay: React.FC<DealingOverlayProps> = React.memo(({
  steps,
  cardWidth,
  cardHeight,
  getPileBasePosition,
  getPileCardPosition,
  gameState,
  onComplete,
  soundEnabled = true,
  staggerMs = DEFAULT_DEAL_STAGGER_MS,
  durationMs = DEFAULT_DEAL_DURATION_MS,
}) => {
  const stockPos = useMemo(() => getPileBasePosition({ type: 'stock' }), [getPileBasePosition]);

  const stepItems = useMemo(() => {
    return steps.map((step, idx) => {
      const endPos = getPileCardPosition(step.targetPile, step.targetIndexInPile, gameState);
      return {
        step,
        startX: stockPos.x,
        startY: stockPos.y,
        endX: endPos.x,
        endY: endPos.y,
        delay: idx * staggerMs,
      };
    });
  }, [steps, stockPos, getPileCardPosition, gameState, staggerMs]);

  // Rhythmically play deal sound at the start of each round
  useEffect(() => {
    if (soundEnabled === false) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const playedRounds = new Set<number>();

    stepItems.forEach((item) => {
      if (!playedRounds.has(item.step.round)) {
        playedRounds.add(item.step.round);
        const timer = setTimeout(() => {
          playDealSound();
        }, item.delay);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [stepItems, soundEnabled]);

  // Complete deal animation when the final card arrives
  useEffect(() => {
    const maxDelay = stepItems.length > 0 ? stepItems[stepItems.length - 1].delay : 0;
    const totalDuration = maxDelay + durationMs + 40;

    const timer = setTimeout(() => {
      onComplete();
    }, totalDuration);

    return () => {
      clearTimeout(timer);
    };
  }, [stepItems, durationMs, onComplete]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onComplete}
      style={styles.overlay}
      accessibilityLabel="Skip dealing animation"
      accessibilityRole="button"
    >
      {stepItems.map((item) => (
        <SingleDealingCard
          key={item.step.card.id}
          step={item.step}
          startX={item.startX}
          startY={item.startY}
          endX={item.endX}
          endY={item.endY}
          delay={item.delay}
          duration={durationMs}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
        />
      ))}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  cardContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    ...shadows.floatingDrag,
  },
});
