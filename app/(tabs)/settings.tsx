/**
 * Settings Tab
 * User preferences for agentic AI personalization
 */

import { useAppTint, useDarkMode } from '@/components/color-context';
import { userPreferencesService } from '@/services/user-preferences';
import type { UserPreferences } from '@/types/user-preferences';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceSettings from '../../components/voice-settings';
import { AnalyticsDashboard } from '../../components/analytics-dashboard';
import { useThemeColors } from '../../hooks/use-theme-colors';

// Predefined options for common preferences
const COMMON_CUISINES = ['Mexican', 'Italian', 'Chinese', 'Japanese', 'BBQ', 'Seafood', 'Indian', 'Thai', 'Mediterranean', 'American'];
const COMMON_RESTRICTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Kosher', 'Halal', 'Keto', 'Paleo'];
const COMMON_INTERESTS = ['Museums', 'Hiking', 'Shopping', 'Sports', 'Photography', 'Art', 'History', 'Nature', 'Nightlife', 'Food Tours', 'Theme Parks', 'Beaches'];
const PRICE_RANGES: UserPreferences['food']['priceRange'][] = ['budget', 'moderate', 'upscale', 'any'];
const ADVENTURE_LEVELS: UserPreferences['activities']['adventureLevel'][] = ['relaxed', 'moderate', 'adventurous'];
const ACTIVITY_STYLES: UserPreferences['activities']['outdoorVsIndoor'][] = ['outdoor', 'indoor', 'both'];

export default function SettingsTab() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [customInput, setCustomInput] = useState('');
  const [activeCustomField, setActiveCustomField] = useState<'cuisine' | 'restriction' | 'interest' | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { tint } = useAppTint();
  const { isDarkMode, darkModePreference, setDarkModePreference } = useDarkMode();
  const theme = useThemeColors();

  /**
   * Load preferences
   */
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await userPreferencesService.getPreferences();
      console.log('[Settings] Loaded preferences:', prefs);
      setPreferences(prefs);
    } catch (error) {
      console.error('[Settings] Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Toggle preference (add or remove)
   */
  const togglePreference = useCallback(async (category: 'cuisine' | 'restriction' | 'interest', item: string) => {
    console.log('[Settings] Toggle pressed:', category, item);
    
    if (!preferences) {
      console.log('[Settings] No preferences loaded');
      return;
    }

    let currentList: string[] = [];
    
    if (category === 'cuisine') {
      currentList = preferences.food.cuisines;
    } else if (category === 'restriction') {
      currentList = preferences.food.dietaryRestrictions;
    } else {
      currentList = preferences.activities.interests;
    }

    const isSelected = currentList.includes(item);
    const updated = isSelected
      ? currentList.filter(i => i !== item)
      : [...currentList, item];

    console.log('[Settings] Updating:', category, 'from', currentList, 'to', updated);

    try {
      // Update service
      if (category === 'cuisine') {
        await userPreferencesService.updateFoodPreferences({ cuisines: updated });
      } else if (category === 'restriction') {
        await userPreferencesService.updateFoodPreferences({ dietaryRestrictions: updated });
      } else {
        await userPreferencesService.updateActivityPreferences({ interests: updated });
      }

      console.log('[Settings] Service updated, reloading preferences...');

      // Force state update by getting fresh preferences and creating a new object
      const freshPrefs = await userPreferencesService.getPreferences();
      console.log('[Settings] Fresh preferences:', JSON.stringify(freshPrefs, null, 2));
      setPreferences({ ...freshPrefs }); // Create new object to force re-render
      
      console.log('[Settings] State updated');
    } catch (error) {
      console.error('[Settings] Error toggling preference:', error);
    }
  }, [preferences]);

  /**
   * Add custom preference
   */
  const handleAddCustom = useCallback(async () => {
    if (!customInput.trim() || !activeCustomField || !preferences) return;

    const item = customInput.trim();
    
    if (activeCustomField === 'cuisine') {
      const updated = [...preferences.food.cuisines, item];
      await userPreferencesService.updateFoodPreferences({ cuisines: updated });
    } else if (activeCustomField === 'restriction') {
      const updated = [...preferences.food.dietaryRestrictions, item];
      await userPreferencesService.updateFoodPreferences({ dietaryRestrictions: updated });
    } else if (activeCustomField === 'interest') {
      const updated = [...preferences.activities.interests, item];
      await userPreferencesService.updateActivityPreferences({ interests: updated });
    }

    setCustomInput('');
    setActiveCustomField(null);
    const freshPrefs = await userPreferencesService.getPreferences();
    setPreferences({ ...freshPrefs });
  }, [customInput, activeCustomField, preferences]);

  /**
   * Render selectable option button
   */
  const renderOption = (item: string, category: 'cuisine' | 'restriction' | 'interest', color: string) => {
    if (!preferences) return null;

    let isSelected = false;
    if (category === 'cuisine') isSelected = preferences.food.cuisines.includes(item);
    else if (category === 'restriction') isSelected = preferences.food.dietaryRestrictions.includes(item);
    else if (category === 'interest') isSelected = preferences.activities.interests.includes(item);

    // Use proper accent color in dark mode instead of white tint
    const selectedColor = isSelected 
      ? (isDarkMode && color === tint ? '#0a7ea4' : color)
      : undefined;

    return (
      <TouchableOpacity
        key={item}
        style={[
          styles.optionButton,
          { 
            borderColor: theme.border,
            backgroundColor: theme.cardBackground,
          },
          isSelected && selectedColor && { backgroundColor: selectedColor, borderColor: selectedColor },
        ]}
        onPress={() => togglePreference(category, item)}
      >
        <Text style={[
          styles.optionText,
          { color: theme.text },
          isSelected && { color: '#fff' }
        ]}>
          {item}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading || !preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint || '#007AFF'} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>⚙️ Settings & Preferences</Text>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
            Teach Pathfinder your preferences for personalized suggestions
          </Text>
        </View>

        {/* Dark Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🌓 Appearance</Text>
          <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>Choose your preferred theme</Text>
          <View style={styles.darkModeOptions}>
            <TouchableOpacity
              style={[
                styles.darkModeButton,
                { borderColor: theme.border },
                darkModePreference === 'light' && { 
                  backgroundColor: isDarkMode ? '#0a7ea4' : theme.tint, 
                  borderColor: isDarkMode ? '#0a7ea4' : theme.tint 
                }
              ]}
              onPress={() => setDarkModePreference('light')}
            >
              <Ionicons 
                name="sunny" 
                size={24} 
                color={darkModePreference === 'light' ? '#fff' : theme.text} 
              />
              <Text style={[
                styles.darkModeButtonText,
                { color: darkModePreference === 'light' ? '#fff' : theme.text }
              ]}>
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.darkModeButton,
                { borderColor: theme.border },
                darkModePreference === 'dark' && { 
                  backgroundColor: isDarkMode ? '#0a7ea4' : theme.tint, 
                  borderColor: isDarkMode ? '#0a7ea4' : theme.tint 
                }
              ]}
              onPress={() => setDarkModePreference('dark')}
            >
              <Ionicons 
                name="moon" 
                size={24} 
                color={darkModePreference === 'dark' ? '#fff' : theme.text} 
              />
              <Text style={[
                styles.darkModeButtonText,
                { color: darkModePreference === 'dark' ? '#fff' : theme.text }
              ]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.darkModeButton,
                { borderColor: theme.border },
                darkModePreference === 'auto' && { 
                  backgroundColor: isDarkMode ? '#0a7ea4' : theme.tint, 
                  borderColor: isDarkMode ? '#0a7ea4' : theme.tint 
                }
              ]}
              onPress={() => setDarkModePreference('auto')}
            >
              <Ionicons 
                name="phone-portrait" 
                size={24} 
                color={darkModePreference === 'auto' ? '#fff' : theme.text} 
              />
              <Text style={[
                styles.darkModeButtonText,
                { color: darkModePreference === 'auto' ? '#fff' : theme.text }
              ]}>
                Auto
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionDescription, { marginTop: 8 }]}>
            {darkModePreference === 'auto' 
              ? `Currently using: ${isDarkMode ? 'Dark' : 'Light'} (system preference)`
              : `Dark mode is ${darkModePreference === 'dark' ? 'enabled' : 'disabled'}`
            }
          </Text>
        </View>

        {/* AI Personality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Personality</Text>
          <Text style={styles.sectionDescription}>How should Pathfinder communicate with you?</Text>
          <View style={styles.personalityOptions}>
            {(['professional', 'friendly', 'casual', 'enthusiastic'] as const).map(personality => (
              <TouchableOpacity
                key={personality}
                style={[
                  styles.personalityButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.aiPersonality === personality && { 
                    backgroundColor: isDarkMode ? '#0a7ea4' : theme.tint,
                    borderColor: isDarkMode ? '#0a7ea4' : theme.tint
                  },
                ]}
                onPress={async () => {
                  await userPreferencesService.updateAISettings({ aiPersonality: personality });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text
                  style={[
                    styles.personalityText,
                    { color: theme.text },
                    preferences.aiPersonality === personality && { color: '#fff' },
                  ]}
                >
                  {personality.charAt(0).toUpperCase() + personality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Travel Analytics</Text>
          <Text style={styles.sectionDescription}>View detailed statistics about your travels</Text>
          
          <TouchableOpacity
            style={[styles.voiceSettingsButton, { borderColor: theme.border }]}
            onPress={() => setShowAnalytics(true)}
          >
            <View style={styles.voiceSettingsContent}>
              <View style={styles.voiceSettingsInfo}>
                <Text style={[styles.voiceSettingsTitle, { color: theme.text }]}>View Analytics</Text>
                <Text style={[styles.voiceSettingsDescription, { color: theme.secondaryText }]}>
                  Trip statistics, location insights, and travel patterns
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Voice Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Voice Guidance</Text>
          <Text style={styles.sectionDescription}>Configure voice announcements during navigation</Text>
          
          <TouchableOpacity
            style={[styles.voiceSettingsButton, { borderColor: theme.border }]}
            onPress={() => setShowVoiceSettings(true)}
          >
            <View style={styles.voiceSettingsContent}>
              <View style={styles.voiceSettingsInfo}>
                <Text style={[styles.voiceSettingsTitle, { color: theme.text }]}>Voice Settings</Text>
                <Text style={[styles.voiceSettingsDescription, { color: theme.secondaryText }]}>
                  Natural language, landmarks, speed coaching, and more
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Report Missing Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Help Improve Data</Text>
          <Text style={styles.sectionDescription}>Report missing counties, cities, or incorrect information</Text>
          
          <TouchableOpacity
            style={[styles.voiceSettingsButton, { borderColor: theme.border }]}
            onPress={() => router.push('/report-data')}
          >
            <View style={styles.voiceSettingsContent}>
              <View style={styles.voiceSettingsInfo}>
                <Text style={[styles.voiceSettingsTitle, { color: theme.text }]}>Report Missing Data</Text>
                <Text style={[styles.voiceSettingsDescription, { color: theme.secondaryText }]}>
                  Found a missing city or county? Let us know!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Food Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Food Preferences</Text>
          <Text style={styles.sectionDescription}>Tap to select your favorite cuisines</Text>
          
          <View style={styles.optionsGrid}>
            {COMMON_CUISINES.map(cuisine => renderOption(cuisine, 'cuisine', tint || '#007AFF'))}
          </View>

          {/* Custom Cuisine Input */}
          {activeCustomField !== 'cuisine' ? (
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={() => setActiveCustomField('cuisine')}
            >
              <Ionicons name="add-circle-outline" size={20} color={tint || '#007AFF'} />
              <Text style={[styles.addCustomText, { color: tint || '#007AFF' }]}>
                Add custom cuisine
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Enter cuisine name..."
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={handleAddCustom}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.customAddButton, { backgroundColor: tint || '#007AFF' }]}
                onPress={handleAddCustom}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customCancelButton}
                onPress={() => {
                  setActiveCustomField(null);
                  setCustomInput('');
                }}
              >
                <Ionicons name="close" size={24} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
          )}

          {/* Dietary Restrictions */}
          <Text style={styles.subsectionTitle}>Dietary Restrictions</Text>
          <Text style={styles.subsectionDescription}>Select any that apply to you</Text>
          <View style={styles.optionsGrid}>
            {COMMON_RESTRICTIONS.map(restriction => renderOption(restriction, 'restriction', '#ef4444'))}
          </View>

          {/* Custom Restriction Input */}
          {activeCustomField !== 'restriction' ? (
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={() => setActiveCustomField('restriction')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ef4444" />
              <Text style={[styles.addCustomText, { color: '#ef4444' }]}>
                Add custom restriction
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Enter restriction..."
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={handleAddCustom}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.customAddButton, { backgroundColor: '#ef4444' }]}
                onPress={handleAddCustom}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customCancelButton}
                onPress={() => {
                  setActiveCustomField(null);
                  setCustomInput('');
                }}
              >
                <Ionicons name="close" size={24} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
          )}

          {/* Price Range */}
          <Text style={styles.subsectionTitle}>Price Range for Restaurants</Text>
          <View style={styles.priceRangeOptions}>
            {PRICE_RANGES.map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.priceButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.food.priceRange === range && {
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                  },
                ]}
                onPress={async () => {
                  await userPreferencesService.updateFoodPreferences({ priceRange: range });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text
                  style={[
                    styles.priceButtonText,
                    { color: theme.text },
                    preferences.food.priceRange === range && { color: '#fff' },
                  ]}
                >
                  {range === 'budget' && '$ Budget'}
                  {range === 'moderate' && '$$ Moderate'}
                  {range === 'upscale' && '$$$ Upscale'}
                  {range === 'any' && 'Any Price'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Avoid Chains */}
          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.food.avoidChains && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateFoodPreferences({ 
                avoidChains: !preferences.food.avoidChains 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.food.avoidChains && { color: tint || '#007AFF' }
              ]}>
                Avoid Chain Restaurants
              </Text>
              <Text style={styles.toggleDescription}>Prefer local, independent restaurants</Text>
            </View>
            <Ionicons
              name={preferences.food.avoidChains ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.food.avoidChains ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>
        </View>

        {/* Activity Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Activity Preferences</Text>
          <Text style={styles.sectionDescription}>What do you like to do when traveling?</Text>
          
          <View style={styles.optionsGrid}>
            {COMMON_INTERESTS.map(interest => renderOption(interest, 'interest', tint || '#007AFF'))}
          </View>

          {/* Custom Interest Input */}
          {activeCustomField !== 'interest' ? (
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={() => setActiveCustomField('interest')}
            >
              <Ionicons name="add-circle-outline" size={20} color={tint || '#007AFF'} />
              <Text style={[styles.addCustomText, { color: tint || '#007AFF' }]}>
                Add custom interest
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Enter interest..."
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={handleAddCustom}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.customAddButton, { backgroundColor: tint || '#007AFF' }]}
                onPress={handleAddCustom}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customCancelButton}
                onPress={() => {
                  setActiveCustomField(null);
                  setCustomInput('');
                }}
              >
                <Ionicons name="close" size={24} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
          )}

          {/* Activity Style */}
          <Text style={styles.subsectionTitle}>Activity Style</Text>
          <View style={styles.styleOptions}>
            {ACTIVITY_STYLES.map(style => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.styleButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.activities.outdoorVsIndoor === style && {
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                  },
                ]}
                onPress={async () => {
                  await userPreferencesService.updateActivityPreferences({ outdoorVsIndoor: style });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text
                  style={[
                    styles.styleButtonText,
                    { color: theme.text },
                    preferences.activities.outdoorVsIndoor === style && { color: '#fff' },
                  ]}
                >
                  {style === 'outdoor' && '🏕️ Outdoor'}
                  {style === 'indoor' && '🏛️ Indoor'}
                  {style === 'both' && '🌐 Both'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Adventure Level */}
          <Text style={styles.subsectionTitle}>Adventure Level</Text>
          <View style={styles.styleOptions}>
            {ADVENTURE_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.styleButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.activities.adventureLevel === level && {
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                  },
                ]}
                onPress={async () => {
                  await userPreferencesService.updateActivityPreferences({ adventureLevel: level });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text
                  style={[
                    styles.styleButtonText,
                    { color: theme.text },
                    preferences.activities.adventureLevel === level && { color: '#fff' },
                  ]}
                >
                  {level === 'relaxed' && '😌 Relaxed'}
                  {level === 'moderate' && '🚶 Moderate'}
                  {level === 'adventurous' && '🏔️ Adventurous'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Family Friendly */}
          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.activities.familyFriendly && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateActivityPreferences({ 
                familyFriendly: !preferences.activities.familyFriendly 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.activities.familyFriendly && { color: tint || '#007AFF' }
              ]}>
                Family-Friendly Activities
              </Text>
              <Text style={styles.toggleDescription}>Traveling with kids, need kid-appropriate activities</Text>
            </View>
            <Ionicons
              name={preferences.activities.familyFriendly ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.activities.familyFriendly ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>
        </View>

        {/* Travel Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Travel Preferences</Text>
          <Text style={styles.sectionDescription}>How do you prefer to travel?</Text>
          
          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.travel.avoidTolls && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateTravelPreferences({ 
                avoidTolls: !preferences.travel.avoidTolls 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.travel.avoidTolls && { color: tint || '#007AFF' }
              ]}>
                Avoid Toll Roads
              </Text>
              <Text style={styles.toggleDescription}>Prefer free routes, even if longer</Text>
            </View>
            <Ionicons
              name={preferences.travel.avoidTolls ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.travel.avoidTolls ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.travel.avoidHighways && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateTravelPreferences({ 
                avoidHighways: !preferences.travel.avoidHighways 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.travel.avoidHighways && { color: tint || '#007AFF' }
              ]}>
                Avoid Highways
              </Text>
              <Text style={styles.toggleDescription}>Take back roads and local routes</Text>
            </View>
            <Ionicons
              name={preferences.travel.avoidHighways ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.travel.avoidHighways ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.travel.scenicRoutes && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateTravelPreferences({ 
                scenicRoutes: !preferences.travel.scenicRoutes 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.travel.scenicRoutes && { color: tint || '#007AFF' }
              ]}>
                Prefer Scenic Routes
              </Text>
              <Text style={styles.toggleDescription}>Prioritize beautiful, memorable drives</Text>
            </View>
            <Ionicons
              name={preferences.travel.scenicRoutes ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.travel.scenicRoutes ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>
        </View>

        {/* Travel Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Travel Details</Text>
          <Text style={styles.sectionDescription}>Fine-tune your travel preferences</Text>
          
          <Text style={styles.subsectionTitle}>Max Driving Hours Per Day</Text>
          <View style={styles.hoursOptions}>
            {[4, 6, 8, 10, 12].map(hours => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.hoursButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.travel.maxDrivingHours === hours && {
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'),
                  },
                ]}
                onPress={async () => {
                  await userPreferencesService.updateTravelPreferences({ maxDrivingHours: hours });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text style={[
                  styles.hoursButtonText,
                  { color: theme.text },
                  preferences.travel.maxDrivingHours === hours && { color: '#fff' },
                ]}>
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subsectionTitle}>Preferred Stops</Text>
          <Text style={styles.subsectionDescription}>What do you like to stop for?</Text>
          <View style={styles.optionsGrid}>
            {['Rest stops', 'Gas stations', 'Scenic overlooks', 'Buc-ee\'s', 'Coffee shops', 'Fast food', 'Sit-down restaurants', 'Shopping centers'].map(stop => (
              <TouchableOpacity
                key={stop}
                style={[
                  styles.optionButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.travel.preferredStops.includes(stop) && { 
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'), 
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF') 
                  },
                ]}
                onPress={async () => {
                  const isSelected = preferences.travel.preferredStops.includes(stop);
                  const updated = isSelected
                    ? preferences.travel.preferredStops.filter(s => s !== stop)
                    : [...preferences.travel.preferredStops, stop];
                  await userPreferencesService.updateTravelPreferences({ preferredStops: updated });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: theme.text },
                  preferences.travel.preferredStops.includes(stop) && { color: '#fff' }
                ]}>
                  {stop}
                </Text>
                {preferences.travel.preferredStops.includes(stop) && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accommodation Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏨 Hotel Preferences</Text>
          <Text style={styles.sectionDescription}>Your accommodation preferences</Text>
          
          <Text style={styles.subsectionTitle}>Preferred Hotel Chains</Text>
          <View style={styles.optionsGrid}>
            {['Hilton', 'Marriott', 'Holiday Inn', 'Best Western', 'Hyatt', 'Wyndham', 'Radisson', 'InterContinental'].map(chain => (
              <TouchableOpacity
                key={chain}
                style={[
                  styles.optionButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.accommodation.hotelChains.includes(chain) && { 
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'), 
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF') 
                  },
                ]}
                onPress={async () => {
                  const isSelected = preferences.accommodation.hotelChains.includes(chain);
                  const updated = isSelected
                    ? preferences.accommodation.hotelChains.filter(c => c !== chain)
                    : [...preferences.accommodation.hotelChains, chain];
                  await userPreferencesService.updateAccommodationPreferences({ hotelChains: updated });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: theme.text },
                  preferences.accommodation.hotelChains.includes(chain) && { color: '#fff' }
                ]}>
                  {chain}
                </Text>
                {preferences.accommodation.hotelChains.includes(chain) && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subsectionTitle}>Budget Per Night</Text>
          <View style={styles.budgetOptions}>
            <Text style={styles.budgetLabel}>${preferences.accommodation.budgetPerNight.min} - ${preferences.accommodation.budgetPerNight.max}</Text>
            
            <Text style={styles.budgetSubtitle}>Minimum Budget</Text>
            <View style={styles.budgetButtons}>
              {[25, 50, 75, 100, 150, 200, 300].map(min => (
                <TouchableOpacity
                  key={`min-${min}`}
                  style={[
                    styles.budgetButton,
                    preferences.accommodation.budgetPerNight.min === min && {
                      backgroundColor: tint || '#007AFF',
                      borderColor: tint || '#007AFF',
                    },
                  ]}
                  onPress={async () => {
                    const newMin = min;
                    const newMax = Math.max(newMin, preferences.accommodation.budgetPerNight.max);
                    await userPreferencesService.updateAccommodationPreferences({ 
                      budgetPerNight: { min: newMin, max: newMax }
                    });
                    const freshPrefs = await userPreferencesService.getPreferences();
                    setPreferences({ ...freshPrefs });
                  }}
                >
                  <Text style={[
                    styles.budgetButtonText,
                    preferences.accommodation.budgetPerNight.min === min && styles.budgetButtonTextActive,
                  ]}>
                    ${min}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.budgetSubtitle}>Maximum Budget</Text>
            <View style={styles.budgetButtons}>
              {[100, 150, 200, 300, 400, 500, 750].map(max => (
                <TouchableOpacity
                  key={`max-${max}`}
                  style={[
                    styles.budgetButton,
                    preferences.accommodation.budgetPerNight.max === max && {
                      backgroundColor: tint || '#007AFF',
                      borderColor: tint || '#007AFF',
                    },
                  ]}
                  onPress={async () => {
                    const newMax = max;
                    const newMin = Math.min(newMax, preferences.accommodation.budgetPerNight.min);
                    await userPreferencesService.updateAccommodationPreferences({ 
                      budgetPerNight: { min: newMin, max: newMax }
                    });
                    const freshPrefs = await userPreferencesService.getPreferences();
                    setPreferences({ ...freshPrefs });
                  }}
                >
                  <Text style={[
                    styles.budgetButtonText,
                    preferences.accommodation.budgetPerNight.max === max && styles.budgetButtonTextActive,
                  ]}>
                    ${max}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.subsectionTitle}>Required Amenities</Text>
          <View style={styles.optionsGrid}>
            {['Pool', 'Gym', 'Free breakfast', 'WiFi', 'Parking', 'Pet-friendly', 'Airport shuttle', 'Business center'].map(amenity => (
              <TouchableOpacity
                key={amenity}
                style={[
                  styles.optionButton,
                  { 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                  },
                  preferences.accommodation.amenities.includes(amenity) && { 
                    backgroundColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF'), 
                    borderColor: isDarkMode ? '#0a7ea4' : (tint || '#007AFF') 
                  },
                ]}
                onPress={async () => {
                  const isSelected = preferences.accommodation.amenities.includes(amenity);
                  const updated = isSelected
                    ? preferences.accommodation.amenities.filter(a => a !== amenity)
                    : [...preferences.accommodation.amenities, amenity];
                  await userPreferencesService.updateAccommodationPreferences({ amenities: updated });
                  const freshPrefs = await userPreferencesService.getPreferences();
                  setPreferences({ ...freshPrefs });
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: theme.text },
                  preferences.accommodation.amenities.includes(amenity) && { color: '#fff' }
                ]}>
                  {amenity}
                </Text>
                {preferences.accommodation.amenities.includes(amenity) && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Behavior Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Behavior</Text>
          <Text style={styles.sectionDescription}>Control how Pathfinder AI interacts with you</Text>
          
          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.rememberPastTrips && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateAISettings({ 
                rememberPastTrips: !preferences.rememberPastTrips 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.rememberPastTrips && { color: tint || '#007AFF' }
              ]}>
                Remember Past Trips
              </Text>
              <Text style={styles.toggleDescription}>AI learns from your previous trips and preferences</Text>
            </View>
            <Ionicons
              name={preferences.rememberPastTrips ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.rememberPastTrips ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleOption,
              preferences.proactiveSuggestions && { 
                backgroundColor: (tint || '#007AFF') + '20',
                borderColor: tint || '#007AFF'
              },
            ]}
            onPress={async () => {
              await userPreferencesService.updateAISettings({ 
                proactiveSuggestions: !preferences.proactiveSuggestions 
              });
              const freshPrefs = await userPreferencesService.getPreferences();
              setPreferences({ ...freshPrefs });
            }}
          >
            <View style={styles.toggleInfo}>
              <Text style={[
                styles.toggleLabel,
                preferences.proactiveSuggestions && { color: tint || '#007AFF' }
              ]}>
                Proactive Suggestions
              </Text>
              <Text style={styles.toggleDescription}>AI suggests activities and restaurants without being asked</Text>
            </View>
            <Ionicons
              name={preferences.proactiveSuggestions ? "checkmark-circle" : "add-circle-outline"}
              size={32}
              color={preferences.proactiveSuggestions ? (tint || '#007AFF') : '#999'}
            />
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            Alert.alert(
              'Reset All Preferences?',
              'This will clear all your preferences and reset to defaults. The AI will forget your food, activity, and travel preferences.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: async () => {
                    await userPreferencesService.resetToDefaults();
                    const freshPrefs = await userPreferencesService.getPreferences();
                    setPreferences({ ...freshPrefs });
                    Alert.alert('✅ Reset Complete', 'All preferences have been cleared.');
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="refresh-outline" size={20} color="#ef4444" />
          <Text style={styles.resetButtonText}>Reset All Preferences</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voice Settings Modal */}
      <VoiceSettings
        visible={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        tintColor={tint || '#007AFF'}
      />

      {/* Analytics Dashboard Modal */}
      <AnalyticsDashboard
        visible={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#888',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    marginTop: 20,
  },
  subsectionDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  personalityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  personalityButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
  },
  personalityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  personalityTextActive: {
    color: '#fff',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  optionTextActive: {
    color: '#fff',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  addCustomText: {
    fontSize: 15,
    fontWeight: '600',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  customAddButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  priceRangeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  priceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  priceButtonTextActive: {
    color: '#fff',
  },
  styleOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  styleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  styleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  styleButtonTextActive: {
    color: '#fff',
  },
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    marginTop: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
    marginTop: 24,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  hoursOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  hoursButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  hoursButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  hoursButtonTextActive: {
    color: '#fff',
  },
  budgetOptions: {
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  budgetSliders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 14,
    color: '#888',
  },
  budgetSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  budgetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  budgetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  budgetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  budgetButtonTextActive: {
    color: '#fff',
  },
  darkModeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  darkModeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  darkModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  darkModeButtonTextActive: {
    color: '#fff',
  },
  voiceSettingsButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  voiceSettingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceSettingsInfo: {
    flex: 1,
  },
  voiceSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  voiceSettingsDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
});
