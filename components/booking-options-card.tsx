/**
 * Booking Options Card Component
 * Displays booking options with affiliate links in the chat interface
 */

import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BookingOption } from '../types/booking';
import { expediaAffiliateService } from '../services/expedia-affiliate';
import { useThemeColors } from '../hooks/use-theme-colors';

interface BookingOptionsCardProps {
  options: BookingOption[];
  onOptionSelect?: (option: BookingOption) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function BookingOptionsCard({ options, onOptionSelect }: BookingOptionsCardProps) {
  const theme = useThemeColors();

  const handleOptionPress = async (option: BookingOption) => {
    // Track affiliate click
    expediaAffiliateService.trackClick(option.type, option.affiliateLink);
    
    // Open affiliate link
    try {
      const canOpen = await Linking.canOpenURL(option.affiliateLink);
      if (canOpen) {
        await Linking.openURL(option.affiliateLink);
      } else {
        console.warn('[BookingOptionsCard] Cannot open URL:', option.affiliateLink);
      }
    } catch (error) {
      console.error('[BookingOptionsCard] Failed to open link:', error);
    }
    
    // Notify parent if callback provided
    if (onOptionSelect) {
      onOptionSelect(option);
    }
  };

  const BookingOptionItem = ({ option, index }: { option: BookingOption; index: number }) => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View entering={FadeInRight.delay(index * 100).duration(300).springify()}>
        <AnimatedTouchable
          style={[
            styles.optionCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
            animatedStyle,
          ]}
          onPress={() => handleOptionPress(option)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
        <View style={styles.optionHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: theme.tint + '15' }]}>
            <Ionicons 
              name={getTypeIcon(option.type) as any} 
              size={24} 
              color={theme.tint} 
              style={styles.icon}
            />
          </View>
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>
              {getProviderLabel(option.provider)}
            </Text>
            {option.description && (
              <Text style={[styles.optionDescription, { color: theme.secondaryText }]} numberOfLines={2}>
                {option.description}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </View>
        
        {option.price > 0 && (
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: theme.secondaryText }]}>From</Text>
            <Text style={[styles.price, { color: theme.tint }]}>
              ${option.price.toFixed(0)}
              {option.currency && option.currency !== 'USD' && ` ${option.currency}`}
            </Text>
          </View>
        )}
        
        {option.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.rating, { color: theme.text }]}>
              {option.rating.toFixed(1)}
              {option.reviewCount && ` (${option.reviewCount} reviews)`}
            </Text>
          </View>
        )}
        </AnimatedTouchable>
      </Animated.View>
    );
  };

  if (options.length === 0) {
    return null;
  }

  const getTypeIcon = (type: BookingOption['type']) => {
    switch (type) {
      case 'hotel':
        return 'bed';
      case 'flight':
        return 'airplane';
      case 'car-rental':
        return 'car';
      case 'activity':
        return 'ticket';
      default:
        return 'calendar';
    }
  };

  const getTypeLabel = (type: BookingOption['type']) => {
    switch (type) {
      case 'hotel':
        return 'Hotels';
      case 'flight':
        return 'Flights';
      case 'car-rental':
        return 'Car Rentals';
      case 'activity':
        return 'Activities';
      default:
        return 'Bookings';
    }
  };

  const getProviderLabel = (provider: BookingOption['provider']) => {
    const labels: Record<BookingOption['provider'], string> = {
      expedia: 'Expedia',
      'hotels.com': 'Hotels.com',
      vrbo: 'Vrbo',
      travelocity: 'Travelocity',
      orbitz: 'Orbitz',
    };
    return labels[provider] || provider;
  };

  return (
    <Animated.View 
      entering={FadeInRight.duration(400).springify()}
      style={[styles.container, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {getTypeLabel(options[0].type)} Options
      </Text>
      
      {options.map((option, index) => (
        <BookingOptionItem key={option.id} option={option} index={index} />
      ))}
      
      <Text style={[styles.footer, { color: theme.secondaryText }]}>
        Tap any option to view on {getProviderLabel(options[0].provider)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    // Icon styling handled by wrapper
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
  },
  footer: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

