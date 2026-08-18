/**
 * RPG-Style Navigation Overlay
 * Displays game-like stats, achievements, and progress during navigation
 */

import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Achievement } from '../types/achievements';
import type { RPGOverlaySettings } from '../types/user-preferences';
import { achievementsService } from '../services/achievements';
import { explorerService } from '../services/explorer';
import { showAchievementShareMenu } from './achievement-share';
import { useToast } from './toast';
import { useThemeColors } from '../hooks/use-theme-colors';

/** High-contrast accent for map overlays (theme tint is white in dark mode). */
const OVERLAY_ACCENT = '#007AFF';

export interface RPGOverlayProps {
  currentCity: string;
  currentState: string;
  currentLocation?: { latitude: number; longitude: number };
  distanceTraveled: number; // meters
  timeElapsed: number; // seconds
  routeProgress?: number; // 0-100
  newlyUnlockedAchievements: Achievement[];
  onClearAchievements: () => void;
  settings: RPGOverlaySettings;
  unit?: 'miles' | 'km';
  currentSpeed?: number; // m/s
}

interface StatPopup {
  id: string;
  message: string;
  timestamp: number;
}

const RPGNavigationOverlay = memo<RPGOverlayProps>(({
  currentCity,
  currentState,
  distanceTraveled,
  timeElapsed,
  routeProgress,
  newlyUnlockedAchievements,
  onClearAchievements,
  settings,
  unit = 'miles',
  currentSpeed = 0,
}) => {
  const toast = useToast();
  const theme = useThemeColors();
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [statPopups, setStatPopups] = useState<StatPopup[]>([]);
  const [xpNotifications, setXpNotifications] = useState<{ id: string; amount: number; y: Animated.Value }[]>([]);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(100);
  
  const previousDistanceRef = useRef(0);
  const previousCitiesRef = useRef(0);
  const previousCountiesRef = useRef(0);
  const previousStatesRef = useRef(0);
  const nextLevelXpRef = useRef(100);
  const levelRef = useRef(1);
  const explorerStatsRef = useRef((() => {
    try {
      return explorerService.getStats();
    } catch {
      return { citiesVisited: 0, statesVisited: 0, countiesVisited: 0 };
    }
  })());

  const addStatPopup = useCallback((message: string) => {
    const id = `popup-${Date.now()}-${Math.random()}`;
    setStatPopups((prev) => [...prev, { id, message, timestamp: Date.now() }]);
  }, []);

  const addXPNotification = useCallback((amount: number) => {
    const id = `xp-${Date.now()}-${Math.random()}`;
    const y = new Animated.Value(0);
    
    setXpNotifications((prev) => [...prev, { id, amount, y }]);
    
    Animated.sequence([
      Animated.timing(y, {
        toValue: -50,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setXpNotifications((prev) => prev.filter((n) => n.id !== id));
    });
    
    setXp((prev) => {
      const newXp = prev + amount;
      if (newXp >= nextLevelXpRef.current) {
        const newLevel = levelRef.current + 1;
        levelRef.current = newLevel;
        nextLevelXpRef.current = newLevel * 100;
        setLevel(newLevel);
        setNextLevelXp(newLevel * 100);
        addStatPopup(`Level Up! Level ${newLevel}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return newXp;
    });
  }, [addStatPopup]);

  // Load achievement progress for level/XP
  useEffect(() => {
    const loadProgress = async () => {
      await achievementsService.initialize();
      const progress = await achievementsService.getProgress();
      setLevel(progress.level);
      setXp(progress.currentPoints);
      setNextLevelXp(progress.nextLevelPoints);
      levelRef.current = progress.level;
      nextLevelXpRef.current = progress.nextLevelPoints;
    };
    loadProgress();
  }, []);

  // Update explorer stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        explorerStatsRef.current = explorerService.getStats();
      } catch (error) {
        console.warn('[RPGOverlay] Failed to update explorer stats:', error);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check for milestone stats and create popups
  useEffect(() => {
    const distanceMiles = distanceTraveled * 0.000621371;
    const previousMiles = previousDistanceRef.current * 0.000621371;
    
    // Check for distance milestones (every 50 miles)
    if (distanceMiles >= 50 && Math.floor(distanceMiles / 50) > Math.floor(previousMiles / 50)) {
      const milestone = Math.floor(distanceMiles / 50) * 50;
      addStatPopup(`${milestone} miles traveled!`);
    }
    
    previousDistanceRef.current = distanceTraveled;
  }, [distanceTraveled, addStatPopup]);

  // Check for location milestones
  useEffect(() => {
    const stats = explorerStatsRef.current;
    
    // Cities milestone
    if (settings.showCities && stats.citiesVisited > previousCitiesRef.current) {
      const newCities = stats.citiesVisited - previousCitiesRef.current;
      if (newCities > 0) {
        // Check for round number milestones
        if (stats.citiesVisited % 10 === 0) {
          addStatPopup(`${stats.citiesVisited}th City!`);
        }
        // Add XP notification
        if (settings.showXPNotifications) {
          addXPNotification(10 * newCities);
        }
      }
      previousCitiesRef.current = stats.citiesVisited;
    }
    
    // Counties milestone (if available)
    const countiesVisited = (stats as any).countiesVisited || 0;
    if (settings.showCounties && countiesVisited > previousCountiesRef.current) {
      const newCounties = countiesVisited - previousCountiesRef.current;
      if (newCounties > 0) {
        if (countiesVisited % 5 === 0) {
          addStatPopup(`${countiesVisited}th County!`);
        }
        if (settings.showXPNotifications) {
          addXPNotification(25 * newCounties);
        }
      }
      previousCountiesRef.current = countiesVisited;
    }
    
    // States milestone
    if (settings.showStates && stats.statesVisited > previousStatesRef.current) {
      const newStates = stats.statesVisited - previousStatesRef.current;
      if (newStates > 0) {
        addStatPopup(`New State: ${currentState}!`);
        if (settings.showXPNotifications) {
          addXPNotification(50 * newStates);
        }
      }
      previousStatesRef.current = stats.statesVisited;
    }
  }, [
    currentCity,
    currentState,
    settings.showCities,
    settings.showCounties,
    settings.showStates,
    settings.showXPNotifications,
    addStatPopup,
    addXPNotification,
  ]);

  // Handle achievement unlocks
  useEffect(() => {
    if (newlyUnlockedAchievements.length === 0 || !settings.showAchievements) {
      return;
    }
    newlyUnlockedAchievements.forEach(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    const timer = setTimeout(() => {
      onClearAchievements();
    }, 5000);
    return () => clearTimeout(timer);
  }, [newlyUnlockedAchievements, settings.showAchievements, onClearAchievements]);

  // Auto-dismiss stat popups after 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setStatPopups((prev) => {
        const now = Date.now();
        return prev.filter((popup) => now - popup.timestamp < 3000);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format distance
  const formatDistance = useCallback((meters: number): string => {
    if (unit === 'miles') {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(1)} mi`;
    }
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }, [unit]);

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  // Calculate average speed
  const averageSpeed = useMemo(() => {
    if (timeElapsed === 0) return 0;
    const avgSpeedMps = distanceTraveled / timeElapsed;
    if (unit === 'miles') {
      return avgSpeedMps * 2.23694; // m/s to mph
    }
    return avgSpeedMps * 3.6; // m/s to km/h
  }, [distanceTraveled, timeElapsed, unit]);

  // XP progress percentage
  const xpProgress = useMemo(() => {
    if (nextLevelXp === 0) return 0;
    const currentLevelXp = xp - ((level - 1) * 100);
    return Math.min((currentLevelXp / 100) * 100, 100);
  }, [xp, level, nextLevelXp]);

  // Show overlay if in "everything" mode or if any major features are enabled
  if (!settings || (settings.mode === 'major-only' && 
      !settings.showAchievements && !settings.showStatsCard)) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Current City Display */}
      {(settings.mode === 'everything' || settings.showCities) && (
        <View style={[styles.cityDisplay, { borderColor: OVERLAY_ACCENT }]}>
          <Text style={styles.cityText}>{currentCity}</Text>
          <Text style={[styles.stateText, { color: theme.secondaryText }]}>{currentState}</Text>
        </View>
      )}

      {/* Stats Card Toggle Button */}
      {settings.showStatsCard && (
        <TouchableOpacity
          style={styles.statsToggle}
          onPress={() => setShowStatsCard(!showStatsCard)}
        >
          <Text style={styles.statsToggleText}>📊</Text>
        </TouchableOpacity>
      )}

      {/* Stats Card */}
      {settings.showStatsCard && showStatsCard && (
        <View style={[styles.statsCard, { borderColor: OVERLAY_ACCENT }]}>
          <Text style={[styles.statsTitle, { color: OVERLAY_ACCENT }]}>Trip Stats</Text>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Distance</Text>
            <Text style={styles.statValue}>{formatDistance(distanceTraveled)}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg Speed</Text>
            <Text style={styles.statValue}>
              {averageSpeed.toFixed(0)} {unit === 'miles' ? 'mph' : 'km/h'}
            </Text>
          </View>
          
          {routeProgress !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Route Progress</Text>
              <Text style={styles.statValue}>{routeProgress.toFixed(0)}%</Text>
            </View>
          )}
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <View 
                style={[styles.xpBarFill, { width: `${xpProgress}%`, backgroundColor: OVERLAY_ACCENT }]} 
              />
            </View>
            <Text style={[styles.xpText, { color: theme.secondaryText }]}>{xp} / {nextLevelXp} XP</Text>
          </View>
        </View>
      )}

      {/* Level/XP Display (compact) */}
      {settings.showXPNotifications && (
        <View style={[styles.levelDisplay, { borderColor: OVERLAY_ACCENT }]}>
          <Text style={[styles.levelText, { color: OVERLAY_ACCENT }]}>Lv {level}</Text>
          <View style={styles.xpBarCompact}>
            <View 
              style={[styles.xpBarFill, { width: `${xpProgress}%`, backgroundColor: OVERLAY_ACCENT }]} 
            />
          </View>
        </View>
      )}

      {/* Route Progress Bar */}
      {routeProgress !== undefined && settings.showProgressBars && (
        <View style={styles.routeProgressContainer}>
          <View style={styles.routeProgressBar}>
            <View 
              style={[styles.routeProgressFill, { width: `${routeProgress}%`, backgroundColor: OVERLAY_ACCENT }]} 
            />
          </View>
          <Text style={[styles.routeProgressText, { color: theme.secondaryText }]}>{routeProgress.toFixed(0)}% Complete</Text>
        </View>
      )}

      {/* Stat Popups */}
      {statPopups.map((popup) => (
        <Animated.View
          key={popup.id}
          style={[
            styles.statPopup,
            styles.statPopupSolid,
            {
              opacity: (() => {
                const age = Date.now() - popup.timestamp;
                if (age > 2500) return (3000 - age) / 500;
                return 1;
              })(),
            },
          ]}
        >
          <Text style={styles.statPopupText}>{popup.message}</Text>
        </Animated.View>
      ))}

      {/* XP Notifications */}
      {xpNotifications.map((notification, index) => (
        <Animated.View
          key={notification.id}
          style={[
            styles.xpNotification,
            {
              transform: [{ translateY: notification.y }],
              right: 20 + (index * 60),
            },
          ]}
        >
          <Text style={styles.xpNotificationText}>
            +{notification.amount} XP
          </Text>
        </Animated.View>
      ))}

      {/* Achievement Unlock Popups */}
      {settings.showAchievements && newlyUnlockedAchievements.map((achievement) => (
        <View key={achievement.id} style={[styles.achievementPopup, { borderColor: OVERLAY_ACCENT }]}>
          <Text style={styles.achievementIcon}>{achievement.icon}</Text>
          <Text style={[styles.achievementTitle, { color: OVERLAY_ACCENT }]}>
            Achievement Unlocked!
          </Text>
          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={[styles.achievementDescription, { color: theme.secondaryText }]}>{achievement.description}</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => showAchievementShareMenu(achievement, toast)}
          >
            <Ionicons name="share-social" size={16} color="#fff" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
});

RPGNavigationOverlay.displayName = 'RPGNavigationOverlay';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
    zIndex: 100,
  },
  cityDisplay: {
    position: 'absolute',
    top: 100,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  stateText: {
    fontSize: 12,
    marginTop: 2,
  },
  statsToggle: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: OVERLAY_ACCENT,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  statsToggleText: {
    fontSize: 20,
  },
  statsCard: {
    position: 'absolute',
    top: 150,
    right: 16,
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  xpContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  xpBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 10,
    textAlign: 'center',
  },
  levelDisplay: {
    position: 'absolute',
    top: 150,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 80,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  xpBarCompact: {
    height: 4,
    backgroundColor: '#e5e5e5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  routeProgressContainer: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  routeProgressBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  routeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  routeProgressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  statPopup: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -100 }],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statPopupSolid: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: OVERLAY_ACCENT,
  },
  statPopupText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  xpNotification: {
    position: 'absolute',
    top: '40%',
    right: 20,
  },
  xpNotificationText: {
    fontSize: 16,
    fontWeight: '700',
    color: OVERLAY_ACCENT,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  achievementPopup: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    transform: [{ translateX: -150 }],
    width: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    backgroundColor: OVERLAY_ACCENT,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RPGNavigationOverlay;

