import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';

import { getNext, getLabel } from './constants/orientation';
import PhoneIndicator from './components/PhoneIndicator';
import RotateButton from './components/RotateButton';

export default function App() {
  const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // get initial screen orientation
    ScreenOrientation.getOrientationAsync().then((info) => {
      setOrientation(info);
    });
    // subscribe to future events
    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      setOrientation(evt.orientationInfo.orientation);
    });
    // unsubscribe when component is unmounted
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  const rotate = () => {
    const { next, lock } = getNext(orientation);
    setOrientation(next);
    ScreenOrientation.lockAsync(lock).catch(() => {});
    setLocked(true);
  };

  const unlock = () => {
    ScreenOrientation.unlockAsync().catch(() => {});
    setLocked(false);
  };

  return (
    <View style={styles.container}>
      <PhoneIndicator orientation={orientation} />
      <Text style={styles.label}>{getLabel(orientation)}</Text>
      <Text style={styles.code}>Orientation code: {orientation}</Text>
      <RotateButton label="Rotate" onPress={rotate} variant="primary" />
      <RotateButton
        label={locked ? 'Unlock (follow device)' : 'Following device sensor'}
        onPress={unlock}
        disabled={!locked}
        variant="secondary"
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1da1f2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  code: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
  },
});
