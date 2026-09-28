import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { getEmoji, getRotationDegrees, nextAngle } from '../constants/orientation';

const ANIMATION_MS = 280;

// `animate` should stay false until the parent has a real orientation reading;
// before that, changes (e.g. the default PORTRAIT_UP being corrected to the
// actual launch orientation) jump straight to the target instead of spinning.
export default function PhoneIndicator({ orientation, animate = true }) {
  // Cumulative angle (can exceed 0-360 across several rotations) driving the
  // transform. Initialized directly to the current target so the first mount
  // never animates.
  const angle = useRef(new Animated.Value(getRotationDegrees(orientation))).current;
  const currentAngleRef = useRef(getRotationDegrees(orientation));
  const lastOrientationRef = useRef(orientation);
  const isFirstRenderRef = useRef(true);
  const animationRef = useRef(null);
  const reduceMotionRef = useRef(false);
  // Whether `animate` was already true on the previous effect run. Requiring
  // it on both runs means an orientation correction batched into the same
  // render as the parent's ready flag still jumps instead of animating.
  const wasAnimateRef = useRef(animate);

  // Track reduced-motion preference for the life of the component.
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reduceMotionRef.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Animate (or jump, under reduced motion) whenever orientation changes.
  useEffect(() => {
    const canAnimate = animate && wasAnimateRef.current;
    wasAnimateRef.current = animate;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastOrientationRef.current = orientation;
      return;
    }
    if (orientation === lastOrientationRef.current) return;
    lastOrientationRef.current = orientation;

    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    const target = nextAngle(currentAngleRef.current, getRotationDegrees(orientation));
    currentAngleRef.current = target;

    if (reduceMotionRef.current || !canAnimate) {
      angle.setValue(target);
      return;
    }

    const animation = Animated.timing(angle, {
      toValue: target,
      duration: ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animationRef.current = animation;
    animation.start();
  }, [orientation, angle, animate]);

  // Stop any in-flight animation on unmount.
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const rotate = angle.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.emoji}>{getEmoji(orientation)}</Text>
      <View style={styles.rotationContainer}>
        <Animated.View style={[styles.phone, { transform: [{ rotate }] }]}>
          <Text style={styles.screenGlyph}>📷</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  // Fixed square footprint so rotating the phone body never shifts layout
  // below the indicator, whether it settles portrait or landscape-shaped.
  rotationContainer: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 90,
    height: 160,
    borderWidth: 3,
    borderRadius: 16,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenGlyph: {
    fontSize: 20,
  },
});
