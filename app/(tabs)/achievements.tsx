/**
 * Achievements Tab
 * Shows all achievements with progress bars and categories
 */

import { useAppTint } from '@/components/color-context';
import { achievementsService } from '@/services/achievements';
import type { Achievement, AchievementProgress } from '@/types/achievements';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/use-theme-colors';

export default function AchievementsTab() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['explorer']));
  const { tint } = useAppTint();
  const theme = useThemeColors();

  /**
   * Load achievements from storage
   */
  const loadAchievements = useCallback(async () => {
    try {
      const [allAchievements, progressData] = await Promise.all([
        achievementsService.getAllAchievements(),
        achievementsService.getProgress(),
      ]);
      setAchievements(allAchievements);
      setProgress(progressData);
    } catch (error) {
      console.error('[Achievements] Error loading:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAchievements();
  }, [loadAchievements]);

  /**
   * Toggle category expansion
   */
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  /**
   * Get tier color
   */
  const getTierColor = (tier: Achievement['tier']) => {
    switch (tier) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
      case 'diamond': return '#b9f2ff';
      case 'legendary': return '#ff6b6b';
      default: return '#888';
    }
  };

  /**
   * Get category name
   */
  const getCategoryName = (category: Achievement['category']) => {
    switch (category) {
      case 'explorer': return '🗺️ Explorer';
      case 'navigator': return '🧭 Navigator';
      case 'highways': return '🛣️ Highways';
      case 'distance': return '🚙 Distance';
      case 'social': return '📤 Social';
      case 'special': return '⭐ Special';
      default: return category;
    }
  };

  /**
   * Group achievements by category
   */
  const achievementsByCategory = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  /**
   * Render achievement item
   */
  const renderAchievement = (achievement: Achievement) => {
    const tierColor = getTierColor(achievement.tier);
    const progressPercent = Math.min(100, (achievement.currentProgress / achievement.requirement) * 100);

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
          achievement.unlocked && styles.achievementUnlocked,
        ]}
      >
        <View style={styles.achievementHeader}>
          <View style={[styles.iconContainer, { backgroundColor: tierColor + '30' }]}>
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
          </View>
          <View style={styles.achievementInfo}>
            <Text style={[styles.achievementName, { color: theme.text }, achievement.unlocked && styles.achievementNameUnlocked]}>
              {achievement.name}
            </Text>
            <Text style={[styles.achievementDescription, { color: theme.secondaryText }]}>{achievement.description}</Text>
            <Text style={[styles.achievementTier, { color: tierColor }]}>
              {achievement.tier.toUpperCase()} • {achievement.points} pts
            </Text>
          </View>
          {achievement.unlocked && (
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
          )}
        </View>

        {/* Progress Bar */}
        {!achievement.unlocked && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.inactive }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%`, backgroundColor: tierColor },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.secondaryText }]}>
              {achievement.currentProgress} / {achievement.requirement}
            </Text>
          </View>
        )}

        {/* Unlocked Date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <Text style={[styles.unlockedDate, { color: theme.secondaryText }]}>
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint || '#007AFF'} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Overall Progress */}
        <View style={[styles.progressCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.progressCardTitle, { color: theme.text }]}>🏆 Achievement Progress</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{progress?.level || 1}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{progress?.unlockedAchievements || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Unlocked</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{progress?.completionPercent || 0}%</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Complete</Text>
            </View>
          </View>

          {/* Overall Progress Bar */}
          <View style={styles.overallProgressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.inactive }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${progress?.completionPercent || 0}%`,
                    backgroundColor: tint || '#007AFF'
                  },
                ]}
              />
            </View>
            <Text style={[styles.overallProgressText, { color: theme.secondaryText }]}>
              {progress?.currentPoints || 0} / {progress?.totalPoints || 0} points
            </Text>
          </View>
        </View>

        {/* Achievements by Category */}
        {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => {
          const unlocked = categoryAchievements.filter(a => a.unlocked).length;
          const total = categoryAchievements.length;
          const isExpanded = expandedCategories.has(category);

          return (
            <View key={category} style={[styles.categorySection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <Text style={[styles.categoryTitle, { color: theme.text }]}>{getCategoryName(category as any)}</Text>
                <View style={styles.categoryStats}>
                  <Text style={[styles.categoryCount, { color: theme.secondaryText }]}>
                    {unlocked}/{total}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.icon}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.achievementsList}>
                  {categoryAchievements.map(renderAchievement)}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
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
  },
  progressCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  progressCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0369a1',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  overallProgressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  overallProgressText: {
    fontSize: 13,
    color: '#0369a1',
    textAlign: 'center',
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  achievementsList: {
    marginTop: 8,
    gap: 8,
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  achievementUnlocked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  achievementNameUnlocked: {
    color: '#10b981',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  achievementTier: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'right',
  },
  unlockedDate: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

