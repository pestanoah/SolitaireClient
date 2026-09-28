import React, { useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Card, PileLocation } from '../engine/types';

interface DraggableCardProps {
  card: Card;
  from: PileLocation;
  cardIndex: number;
  disabled?: boolean;
  onPress?: () => void;
  onDragStart?: (from: PileLocation, card: Card, cardIndex: number) => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: (dx: number, dy: number, isDrag: boolean) => void;
  children: React.ReactNode;
}

export const DraggableCard: React.FC<DraggableCardProps> = React.memo(({
  card,
  from,
  cardIndex,
  disabled = false,
  onPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}) => {
  const isDraggingRef = useRef(false);
  const startCalledRef = useRef(false);

  const callbacksRef = useRef({
    card,
    from,
    cardIndex,
    disabled,
    onPress,
    onDragStart,
    onDragMove,
    onDragEnd,
  });
  callbacksRef.current = {
    card,
    from,
    cardIndex,
    disabled,
    onPress,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !callbacksRef.current.disabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (callbacksRef.current.disabled) return false;
        return Math.hypot(gestureState.dx, gestureState.dy) >= 4;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        startCalledRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (callbacksRef.current.disabled) return;
        const dist = Math.hypot(gestureState.dx, gestureState.dy);
        if (!isDraggingRef.current && dist >= 6) {
          isDraggingRef.current = true;
          startCalledRef.current = true;
          if (callbacksRef.current.onDragStart) {
            callbacksRef.current.onDragStart(
              callbacksRef.current.from,
              callbacksRef.current.card,
              callbacksRef.current.cardIndex
            );
          }
        }
        if (isDraggingRef.current && callbacksRef.current.onDragMove) {
          callbacksRef.current.onDragMove(gestureState.dx, gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (callbacksRef.current.disabled) return;
        if (isDraggingRef.current && startCalledRef.current) {
          if (callbacksRef.current.onDragEnd) {
            callbacksRef.current.onDragEnd(gestureState.dx, gestureState.dy, true);
          }
        } else {
          if (callbacksRef.current.onDragEnd) {
            callbacksRef.current.onDragEnd(0, 0, false);
          }
          if (callbacksRef.current.onPress) {
            callbacksRef.current.onPress();
          }
        }
        isDraggingRef.current = false;
        startCalledRef.current = false;
      },
      onPanResponderTerminate: (_, gestureState) => {
        if (isDraggingRef.current && startCalledRef.current) {
          if (callbacksRef.current.onDragEnd) {
            callbacksRef.current.onDragEnd(gestureState.dx, gestureState.dy, false);
          }
        }
        isDraggingRef.current = false;
        startCalledRef.current = false;
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View {...panResponder.panHandlers} style={styles.draggable}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  draggable: {
    userSelect: 'none',
    cursor: 'grab',
  } as any,
});
