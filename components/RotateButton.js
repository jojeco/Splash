import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export default function RotateButton({ label, onPress, disabled, variant }) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isSecondary ? styles.secondary : styles.primary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          isSecondary && styles.labelSecondary,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 220,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#ffffff',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'transparent',
  },
  label: {
    color: '#ffffff',
    fontWeight: '600',
  },
  labelSecondary: {
    fontWeight: '400',
  },
  labelDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
