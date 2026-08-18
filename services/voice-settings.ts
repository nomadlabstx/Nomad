/**
 * Voice Settings Service
 * Manages voice guidance configuration and persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoiceGuidanceConfig } from './navigation';

const VOICE_SETTINGS_KEY = 'voiceSettings';

const DEFAULT_VOICE_CONFIG: VoiceGuidanceConfig = {
  enabled: true,
  language: 'en-US',
  pitch: 1.0,
  rate: 0.95,
  useNaturalLanguage: true,
  useSpeedCoaching: true,
  useContextAnnouncements: true,
  useLandmarks: true,
};

class VoiceSettingsService {
  private config: VoiceGuidanceConfig = DEFAULT_VOICE_CONFIG;
  private initialized = false;

  /**
   * Initialize voice settings from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
      if (stored) {
        this.config = { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(stored) };
      }
      this.initialized = true;
    } catch (error) {
      console.warn('[VoiceSettings] Failed to load settings:', error);
      this.config = DEFAULT_VOICE_CONFIG;
      this.initialized = true;
    }
  }

  /**
   * Get current voice configuration
   */
  getConfig(): VoiceGuidanceConfig {
    return { ...this.config };
  }

  /**
   * Update voice configuration
   */
  async updateConfig(updates: Partial<VoiceGuidanceConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    
    try {
      await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('[VoiceSettings] Failed to save settings:', error);
    }
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config = { ...DEFAULT_VOICE_CONFIG };
    
    try {
      await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('[VoiceSettings] Failed to reset settings:', error);
    }
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): { code: string; name: string }[] {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
    ];
  }
}

export const voiceSettingsService = new VoiceSettingsService();
