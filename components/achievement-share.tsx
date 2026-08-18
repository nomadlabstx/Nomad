/**
 * Achievement Share Component
 * Provides sharing functionality for achievements
 */

import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Linking, Alert } from 'react-native';
import type { Achievement } from '../types/achievements';
import { useToast } from './toast';

/**
 * Generate achievement summary text for sharing
 */
export function getAchievementSummary(achievement: Achievement): string {
  const tierEmoji = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '💠',
    legendary: '⭐',
  };

  const unlockedDate = achievement.unlockedAt 
    ? new Date(achievement.unlockedAt).toLocaleDateString()
    : 'Recently';

  return `${achievement.icon} ${achievement.name} - ${tierEmoji[achievement.tier]}

${achievement.description}

🏆 Tier: ${achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
📅 Unlocked: ${unlockedDate}
⭐ Points: ${achievement.points}

Unlocked with Nomad - Your Travel Companion`;
}

/**
 * Share achievement summary as text
 */
export async function shareAchievementSummary(achievement: Achievement, toast: { show: (msg: string) => void }): Promise<void> {
  try {
    const summary = getAchievementSummary(achievement);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync({
        message: summary,
      });
      toast.show('Achievement shared');
    } else {
      // Fallback to clipboard
      await Clipboard.setStringAsync(summary);
      toast.show('Achievement summary copied to clipboard');
    }
  } catch (error) {
    console.warn('Share achievement failed:', error);
    const summary = getAchievementSummary(achievement);
    await Clipboard.setStringAsync(summary);
    toast.show('Achievement summary copied to clipboard');
  }
}

/**
 * Share achievement to Twitter
 */
export async function shareAchievementTwitter(achievement: Achievement, toast: { show: (msg: string) => void }): Promise<void> {
  const summary = getAchievementSummary(achievement);
  const tweetText = encodeURIComponent(`🏆 Just unlocked: ${achievement.icon} ${achievement.name}!\n\n${achievement.description}\n\nTracked with Nomad`);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
  
  try {
    const canOpen = await Linking.canOpenURL(twitterUrl);
    if (canOpen) {
      await Linking.openURL(twitterUrl);
    } else {
      await Clipboard.setStringAsync(summary);
      toast.show('Twitter not available. Summary copied to clipboard');
    }
  } catch (error) {
    console.warn('Twitter share failed:', error);
    await Clipboard.setStringAsync(summary);
    toast.show('Summary copied to clipboard');
  }
}

/**
 * Share achievement to Facebook
 */
export async function shareAchievementFacebook(achievement: Achievement, toast: { show: (msg: string) => void }): Promise<void> {
  const summary = getAchievementSummary(achievement);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://nomad.app')}&quote=${encodeURIComponent(`🏆 Just unlocked: ${achievement.icon} ${achievement.name}! ${achievement.description}`)}`;
  
  try {
    const canOpen = await Linking.canOpenURL(facebookUrl);
    if (canOpen) {
      await Linking.openURL(facebookUrl);
    } else {
      await Clipboard.setStringAsync(summary);
      toast.show('Facebook not available. Summary copied to clipboard');
    }
  } catch (error) {
    console.warn('Facebook share failed:', error);
    await Clipboard.setStringAsync(summary);
    toast.show('Summary copied to clipboard');
  }
}

/**
 * Show share options menu for achievement
 */
export function showAchievementShareMenu(
  achievement: Achievement,
  toast: { show: (msg: string) => void }
): void {
  Alert.alert(
    'Share Achievement',
    `Share your ${achievement.name} achievement!`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Share Summary', 
        onPress: () => shareAchievementSummary(achievement, toast) 
      },
      { 
        text: 'Share to Twitter', 
        onPress: () => shareAchievementTwitter(achievement, toast) 
      },
      { 
        text: 'Share to Facebook', 
        onPress: () => shareAchievementFacebook(achievement, toast) 
      },
    ],
    { cancelable: true }
  );
}

