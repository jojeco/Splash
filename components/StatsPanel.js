import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';

import { getEmoji, getLabel } from '../constants/orientation';
import { exportStatsJSON, formatDuration, summarize } from '../lib/stats';
import RotateButton from './RotateButton';

const RECENT_EVENTS = 5;
const canShare = Share && typeof Share.share === 'function';

// Toggleable local rotation history. `now` is passed in (rather than read here)
// so the parent controls when the live dwell figure ticks. `seeded` gates the
// live dwell total: before the baseline is set, showing a delta against the
// previous session's currentSince would flash a stale figure.
export default function StatsPanel({ stats, now, seeded, visible, onToggle, onReset, storageError }) {
  const [exportText, setExportText] = useState(null);

  const confirmReset = () => {
    Alert.alert('Reset stats?', 'This clears your rotation history on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onReset },
    ]);
  };

  if (!visible) {
    return <RotateButton label="Show stats" onPress={onToggle} variant="secondary" />;
  }

  const toggleExport = () => {
    setExportText((prev) => (prev == null ? exportStatsJSON(stats, now, seeded) : null));
  };

  const shareExport = async () => {
    try {
      await Share.share({ message: exportText });
    } catch (err) {
      Alert.alert('Share failed', 'Could not share the exported stats.');
    }
  };

  const summary = summarize(stats, now, seeded);

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

      {exportText ? (
        <View style={styles.exportBlock}>
          <Text selectable style={styles.exportText}>
            {exportText}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <RotateButton label="Reset stats" onPress={confirmReset} variant="secondary" />
        <RotateButton label={exportText ? 'Hide export' : 'Export JSON'} onPress={toggleExport} variant="secondary" />
        {exportText && canShare ? (
          <RotateButton label="Share…" onPress={shareExport} variant="secondary" />
        ) : null}
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
  exportBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  exportText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'monospace',
  },
  actions: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
});
