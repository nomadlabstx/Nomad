/**
 * Voice Settings Component
 * UI for configuring voice guidance options
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColors } from '../hooks/use-theme-colors';
import { VoiceGuidanceConfig } from '../services/navigation';
import { voiceSettingsService } from '../services/voice-settings';

interface VoiceSettingsProps {
  visible: boolean;
  onClose: () => void;
  tintColor: string;
}

const VoiceSettings = React.memo<VoiceSettingsProps>(({ visible, onClose, tintColor }) => {
  const theme = useThemeColors();
  const [config, setConfig] = useState<VoiceGuidanceConfig>(voiceSettingsService.getConfig());
  const [loading, setLoading] = useState(false);

  /**
   * Load settings on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      await voiceSettingsService.initialize();
      setConfig(voiceSettingsService.getConfig());
      setLoading(false);
    };
    
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  /**
   * Update a setting
   */
  const updateSetting = useCallback(async (key: keyof VoiceGuidanceConfig, value: any) => {
    Haptics.selectionAsync();
    
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    try {
      await voiceSettingsService.updateConfig({ [key]: value });
    } catch (error) {
      console.warn('[VoiceSettings] Failed to update setting:', error);
      // Revert on error
      setConfig(config);
    }
  }, [config]);

  /**
   * Reset to defaults
   */
  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Reset Voice Settings',
      'This will reset all voice settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await voiceSettingsService.resetToDefaults();
            setConfig(voiceSettingsService.getConfig());
          },
        },
      ]
    );
  }, []);

  /**
   * Test voice with current settings
   */
  const handleTestVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // This would integrate with the navigation service to test voice
    // For now, we'll just show a confirmation
    Alert.alert(
      'Test Voice',
      'Voice test would play here with your current settings. This feature will be available when navigation is active.',
      [{ text: 'OK' }]
    );
  }, []);

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Voice Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: tintColor }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading settings...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Voice Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: tintColor }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Main Voice Toggle */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Voice Guidance</Text>
                <Text style={[styles.settingDescription, { color: theme.secondaryText }]}>
                  Enable voice announcements during navigation
                </Text>
              </View>
              <Switch
                value={config.enabled}
                onValueChange={(value) => updateSetting('enabled', value)}
                trackColor={{ false: theme.inactive, true: tintColor }}
                thumbColor={config.enabled ? '#fff' : theme.secondaryText}
              />
            </View>
          </View>

          {/* Advanced Features */}
          {config.enabled && (
            <>
              <Text style={[styles.sectionHeader, { color: theme.text }]}>Advanced Features</Text>
              
              <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>Natural Language</Text>
                    <Text style={[styles.settingDescription, { color: theme.secondaryText }]}>
                      &quot;Take a left&quot; instead of &quot;Turn left&quot;
                    </Text>
                  </View>
                  <Switch
                    value={config.useNaturalLanguage}
                    onValueChange={(value) => updateSetting('useNaturalLanguage', value)}
                    trackColor={{ false: theme.inactive, true: tintColor }}
                    thumbColor={config.useNaturalLanguage ? '#fff' : theme.secondaryText}
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>Landmarks</Text>
                    <Text style={[styles.settingDescription, { color: theme.secondaryText }]}>
                      &quot;Turn at Starbucks&quot; instead of street names
                    </Text>
                  </View>
                  <Switch
                    value={config.useLandmarks}
                    onValueChange={(value) => updateSetting('useLandmarks', value)}
                    trackColor={{ false: theme.inactive, true: tintColor }}
                    thumbColor={config.useLandmarks ? '#fff' : theme.secondaryText}
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>Speed Coaching</Text>
                    <Text style={[styles.settingDescription, { color: theme.secondaryText }]}>
                      Speed limit suggestions and warnings
                    </Text>
                  </View>
                  <Switch
                    value={config.useSpeedCoaching}
                    onValueChange={(value) => updateSetting('useSpeedCoaching', value)}
                    trackColor={{ false: theme.inactive, true: tintColor }}
                    thumbColor={config.useSpeedCoaching ? '#fff' : theme.secondaryText}
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>Context Announcements</Text>
                    <Text style={[styles.settingDescription, { color: theme.secondaryText }]}>
                      School zones, construction, and traffic alerts
                    </Text>
                  </View>
                  <Switch
                    value={config.useContextAnnouncements}
                    onValueChange={(value) => updateSetting('useContextAnnouncements', value)}
                    trackColor={{ false: theme.inactive, true: tintColor }}
                    thumbColor={config.useContextAnnouncements ? '#fff' : theme.secondaryText}
                  />
                </View>
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.secondaryBackground, borderColor: theme.border }]}
              onPress={handleTestVoice}
            >
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Test Voice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.secondaryBackground, borderColor: theme.border }]}
              onPress={handleReset}
            >
              <Text style={[styles.actionButtonText, { color: '#ff3b30' }]}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

VoiceSettings.displayName = 'VoiceSettings';

export default VoiceSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    color: '#000',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
});