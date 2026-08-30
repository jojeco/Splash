import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getEmoji, isLandscape } from '../constants/orientation';

export default function PhoneIndicator({ orientation }) {
  const landscape = isLandscape(orientation);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.emoji}>{getEmoji(orientation)}</Text>
      <View
        style={[
          styles.phone,
          landscape ? styles.phoneLandscape : styles.phonePortrait,
        ]}
      >
        <Text style={styles.screenGlyph}>📷</Text>
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
  phone: {
    borderWidth: 3,
    borderRadius: 16,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePortrait: {
    width: 90,
    height: 160,
  },
  phoneLandscape: {
    width: 160,
    height: 90,
  },
  screenGlyph: {
    fontSize: 20,
  },
});
