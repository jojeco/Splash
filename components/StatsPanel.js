import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { getEmoji, getLabel } from '../constants/orientation';
import { formatDuration, summarize } from '../lib/stats';
import RotateButton from './RotateButton';

const RECENT_EVENTS = 5;

// Toggleable local rotation history. `now` is passed in (rather than read here)
// so the parent controls when the live dwell figure ticks.
export default function StatsPanel({ stats, now, visible, onToggle, onReset, storageError }) {
  const confirmReset = () => {
    Alert.alert('Reset stats?', 'This clears your rotation history on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onReset },
    ]);
  };

  if (!visible) {
    return <RotateButton label="Show stats" onPress={onToggle} variant="secondary" />;
  }

  const summary = summarize(stats, now);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Rotation stats</Text>
      {storageError ? (
        <Text style={styles.notice}>Storage unavailable: stats won't be saved after you close the app.</Text>
      ) : null}
      <Text style={styles.total}>Total rotations: {summary.totalRotations}</Text>

      <Text style={styles.sectionTitle}>Time in each orientation</Text>
      {summary.rows.length === 0 ? (
        <Text style={styles.muted}>Nothing recorded yet.</Text>
      ) : (
        summary.rows.map((row) => (
          <View key={row.orientation} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel}>
                {getEmoji(row.orientation)} {getLabel(row.orientation)}
              </Text>
              <Text style={styles.rowValue}>
                {formatDuration(row.totalMs)} · {row.count}x
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(row.share * 100)}%` }]} />
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Recent rotations</Text>
      {summary.events.length === 0 ? (
        <Text style={styles.muted}>No rotations yet.</Text>
      ) : (
        summary.events.slice(0, RECENT_EVENTS).map((evt, i) => (
          <Text key={`${evt.at}-${i}`} style={styles.event}>
            {new Date(evt.at).toLocaleTimeString()}: {getLabel(evt.from)} to {getLabel(evt.to)} ({evt.source})
          </Text>
        ))
      )}

      <View style={styles.actions}>
        <RotateButton label="Reset stats" onPress={confirmReset} variant="secondary" />
        <RotateButton label="Hide stats" onPress={onToggle} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  notice: {
    fontSize: 12,
    color: '#fff3cd',
  },
  total: {
    fontSize: 14,
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
  },
  muted: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  row: {
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 13,
    color: '#ffffff',
  },
  rowValue: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  event: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  actions: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
});
