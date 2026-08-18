/**
 * Error Display Component
 * Shows user-friendly error messages with recovery suggestions
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getErrorMessage } from '../utils/error-messages';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useAppTint } from './color-context';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const theme = useThemeColors();
  const { tint } = useAppTint();
  const errorInfo = getErrorMessage(error);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{errorInfo.title}</Text>
      <Text style={[styles.message, { color: theme.secondaryText }]}>{errorInfo.message}</Text>
      
      {errorInfo.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsTitle, { color: theme.text }]}>Try these steps:</Text>
          {errorInfo.suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Text style={[styles.bullet, { color: tint }]}>•</Text>
              <Text style={[styles.suggestion, { color: theme.secondaryText }]}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}

      {onRetry && errorInfo.actionLabel && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tint }]}
          onPress={onRetry}
        >
          <Text style={styles.buttonText}>{errorInfo.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  suggestion: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

