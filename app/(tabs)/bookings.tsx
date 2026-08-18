/**
 * Bookings Tab
 * View and manage saved travel bookings
 */

import { useAppTint } from '@/components/color-context';
import { bookingService } from '@/services/booking';
import type { Booking, BookingStatus, BookingType } from '@/types/booking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useSelectedBackgroundColor } from '../../utils/theme-helpers';

type FilterType = BookingType | 'all';
type FilterStatus = BookingStatus | 'all';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface BookingCardProps {
  booking: Booking;
  index: number;
  theme: ReturnType<typeof useThemeColors>;
  tint: string;
  onPress: () => void;
}

const BookingCard = memo<BookingCardProps>(({ booking, index, theme, tint, onPress }) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getTypeIcon = (type: BookingType): string => {
    const icons: Record<BookingType, string> = {
      hotel: 'bed',
      flight: 'airplane',
      'car-rental': 'car',
      activity: 'ticket',
    };
    return icons[type] || 'calendar';
  };

  const getBookingName = (booking: Booking): string => {
    if (booking.hotelName) return booking.hotelName;
    if (booking.flightNumber) return `Flight ${booking.flightNumber}`;
    if (booking.carRentalCompany) return booking.carRentalCompany;
    if (booking.activityName) return booking.activityName;
    return `${booking.type.charAt(0).toUpperCase() + booking.type.slice(1)} Booking`;
  };

  const getProviderLabel = (provider: string): string => {
    const labels: Record<string, string> = {
      Expedia: 'Expedia',
      'Booking.com': 'Booking.com',
      Airbnb: 'Airbnb',
      'Kayak': 'Kayak',
    };
    return labels[provider] || provider;
  };

  const getStatusColor = (status: BookingStatus): string => {
    const colors: Record<BookingStatus, string> = {
      confirmed: '#10b981',
      pending: '#f59e0b',
      cancelled: '#ef4444',
      completed: '#3b82f6',
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
      <AnimatedTouchable
        style={[
          styles.bookingCard,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
          animatedStyle,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
      <View style={styles.bookingHeader}>
        <View style={[styles.bookingIconContainer, { backgroundColor: tint + '15' }]}>
          <Ionicons name={getTypeIcon(booking.type) as any} size={24} color={tint} />
        </View>
        <View style={styles.bookingInfo}>
          <Text style={[styles.bookingName, { color: theme.text }]} numberOfLines={1}>
            {getBookingName(booking)}
          </Text>
          <Text style={[styles.bookingProvider, { color: theme.secondaryText }]}>
            {getProviderLabel(booking.provider)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        {booking.checkInDate && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.secondaryText} />
            <Text style={[styles.detailText, { color: theme.secondaryText }]}>
              {formatDate(booking.checkInDate)}
              {booking.checkOutDate && ` - ${formatDate(booking.checkOutDate)}`}
            </Text>
          </View>
        )}
        {booking.totalPrice && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={theme.secondaryText} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {booking.currency || 'USD'} ${booking.totalPrice.toFixed(2)}
            </Text>
          </View>
        )}
        {booking.confirmationNumber && (
          <View style={styles.detailRow}>
            <Ionicons name="receipt-outline" size={16} color={theme.secondaryText} />
            <Text style={[styles.detailText, { color: theme.secondaryText }]}>
              Confirmation: {booking.confirmationNumber}
            </Text>
          </View>
        )}
      </View>
      </AnimatedTouchable>
    </Animated.View>
  );
});

BookingCard.displayName = 'BookingCard';

export default function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const selectedBgColor = useSelectedBackgroundColor(tint);
  const router = useRouter();

  /**
   * Load bookings from storage
   */
  const loadBookings = useCallback(async () => {
    try {
      const allBookings = await bookingService.getAllBookings();
      // Sort by creation date (newest first)
      const sorted = allBookings.sort((a, b) => b.createdAt - a.createdAt);
      setBookings(sorted);
    } catch (error) {
      console.error('[Bookings] Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Apply filters
   */
  useEffect(() => {
    let filtered = [...bookings];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(b => b.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, typeFilter, statusFilter]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

  /**
   * Handle mark booking as cancelled (local status only)
   * Note: This does NOT cancel the booking with the provider or process refunds.
   * Users must cancel through the provider's website/app.
   */
  const handleMarkAsCancelled = useCallback((booking: Booking) => {
    Alert.alert(
      'Mark as Cancelled?',
      `This will only update the local status. To actually cancel and get a refund, you must cancel through ${getProviderLabel(booking.provider)}'s website or app.\n\nDid you already cancel this booking with ${getProviderLabel(booking.provider)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Mark as Cancelled',
          style: 'default',
          onPress: async () => {
            try {
              await bookingService.cancelBooking(booking.id);
              await loadBookings();
              setShowDetails(false);
              Alert.alert(
                '✅ Status Updated',
                'Booking marked as cancelled locally. Make sure you\'ve cancelled with the provider to get a refund.'
              );
            } catch (error) {
              console.error('[Bookings] Error updating booking status:', error);
              Alert.alert('Error', 'Failed to update booking status. Please try again.');
            }
          },
        },
      ]
    );
  }, [loadBookings]);

  /**
   * Handle delete booking
   */
  const handleDeleteBooking = useCallback((booking: Booking) => {
    Alert.alert(
      'Delete Booking?',
      'This action cannot be undone. The booking will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingService.deleteBooking(booking.id);
              await loadBookings();
              setShowDetails(false);
              Alert.alert('✅ Booking Deleted', 'The booking has been removed.');
            } catch (error) {
              console.error('[Bookings] Error deleting booking:', error);
              Alert.alert('Error', 'Failed to delete booking. Please try again.');
            }
          },
        },
      ]
    );
  }, [loadBookings]);

  /**
   * Handle open affiliate link
   */
  const handleOpenLink = useCallback(async (booking: Booking) => {
    try {
      const canOpen = await Linking.canOpenURL(booking.affiliateLink);
      if (canOpen) {
        await Linking.openURL(booking.affiliateLink);
      } else {
        Alert.alert('Error', 'Cannot open this link.');
      }
    } catch (error) {
      console.error('[Bookings] Error opening link:', error);
      Alert.alert('Error', 'Failed to open link. Please try again.');
    }
  }, []);

  /**
   * Format date
   */
  const formatDate = useCallback((timestamp?: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  /**
   * Format date and time
   */
  const formatDateTime = useCallback((timestamp?: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  /**
   * Get type icon
   */
  const getTypeIcon = (type: BookingType): string => {
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

  /**
   * Get type label
   */
  const getTypeLabel = (type: BookingType): string => {
    switch (type) {
      case 'hotel':
        return 'Hotel';
      case 'flight':
        return 'Flight';
      case 'car-rental':
        return 'Car Rental';
      case 'activity':
        return 'Activity';
      default:
        return 'Booking';
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case 'confirmed':
        return '#10B981'; // green
      case 'pending':
        return '#F59E0B'; // amber
      case 'cancelled':
        return '#EF4444'; // red
      case 'completed':
        return '#6B7280'; // gray
      case 'failed':
        return '#DC2626'; // dark red
      default:
        return theme.secondaryText;
    }
  };

  /**
   * Get provider label
   */
  const getProviderLabel = (provider: Booking['provider']): string => {
    const labels: Record<Booking['provider'], string> = {
      expedia: 'Expedia',
      'hotels.com': 'Hotels.com',
      vrbo: 'Vrbo',
      travelocity: 'Travelocity',
      orbitz: 'Orbitz',
    };
    return labels[provider] || provider;
  };

  /**
   * Get booking display name
   */
  const getBookingName = (booking: Booking): string => {
    if ('hotelName' in booking) {
      return booking.hotelName;
    }
    if ('airline' in booking) {
      return `${booking.airline} Flight`;
    }
    if ('rentalCompany' in booking) {
      return `${booking.rentalCompany} Rental`;
    }
    if ('activityName' in booking) {
      return booking.activityName;
    }
    return `${getTypeLabel(booking.type)} Booking`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Bookings</Text>
        <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
          {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
        </Text>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {/* Type Filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>Type:</Text>
            {(['all', 'hotel', 'flight', 'car-rental', 'activity'] as FilterType[]).map((type) => {
              const isSelected = typeFilter === type;
              
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: isSelected ? selectedBgColor : theme.cardBackground,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setTypeFilter(type)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      { color: isSelected ? '#fff' : theme.text },
                    ]}
                  >
                    {type === 'all' ? 'All' : getTypeLabel(type as BookingType)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status Filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>Status:</Text>
            {(['all', 'confirmed', 'pending', 'cancelled', 'completed'] as FilterStatus[]).map((status) => {
              const isSelected = statusFilter === status;
              
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: isSelected ? selectedBgColor : theme.cardBackground,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      { color: isSelected ? '#fff' : theme.text },
                    ]}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={theme.secondaryText} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Bookings Found</Text>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            {bookings.length === 0
              ? "You don't have any bookings yet. Start planning a trip with Pathfinder to create bookings!"
              : 'Try adjusting your filters to see more bookings.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />}
        >
          {filteredBookings.map((booking, index) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              index={index}
              theme={theme}
              tint={tint}
              onPress={() => {
                setSelectedBooking(booking);
                setShowDetails(true);
              }}
            />
          ))}
        </ScrollView>
      )}

      {/* Booking Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {selectedBooking && (
            <>
              <View style={[styles.modalHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Booking Details</Text>
                <View style={styles.closeButton} />
              </View>

              <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
                {/* Booking Type & Status */}
                <View style={[styles.modalSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name={getTypeIcon(selectedBooking.type) as any} size={20} color={tint} />
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>
                      {getTypeLabel(selectedBooking.type)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedBooking.status) }]}>
                      {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Booking Information */}
                <View style={[styles.modalSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Information</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>Name:</Text>
                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                      {getBookingName(selectedBooking)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>Provider:</Text>
                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                      {getProviderLabel(selectedBooking.provider)}
                    </Text>
                  </View>
                  {selectedBooking.confirmationNumber && (
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>Confirmation:</Text>
                      <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                        {selectedBooking.confirmationNumber}
                      </Text>
                    </View>
                  )}
                  {selectedBooking.totalPrice && (
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>Price:</Text>
                      <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                        {selectedBooking.currency || 'USD'} ${selectedBooking.totalPrice.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Dates */}
                {(selectedBooking.checkInDate || selectedBooking.checkOutDate) && (
                  <View style={[styles.modalSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Dates</Text>
                    {selectedBooking.checkInDate && (
                      <View style={styles.modalDetailRow}>
                        <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>
                          {selectedBooking.type === 'flight' ? 'Departure' : 'Check-in'}:
                        </Text>
                        <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                          {formatDateTime(selectedBooking.checkInDate)}
                        </Text>
                      </View>
                    )}
                    {selectedBooking.checkOutDate && (
                      <View style={styles.modalDetailRow}>
                        <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>
                          {selectedBooking.type === 'flight' ? 'Arrival' : 'Check-out'}:
                        </Text>
                        <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                          {formatDateTime(selectedBooking.checkOutDate)}
                        </Text>
                      </View>
                    )}
                    {selectedBooking.cancellationDeadline && (
                      <View style={styles.modalDetailRow}>
                        <Text style={[styles.modalDetailLabel, { color: theme.secondaryText }]}>Cancellation Deadline:</Text>
                        <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                          {formatDateTime(selectedBooking.cancellationDeadline)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Location (for hotel/activity/car rental) */}
                {('location' in selectedBooking || 'address' in selectedBooking) && (
                  <View style={[styles.modalSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Location</Text>
                    {'address' in selectedBooking && selectedBooking.address && (
                      <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                        {selectedBooking.address}
                        {'city' in selectedBooking && selectedBooking.city && `, ${selectedBooking.city}`}
                        {'state' in selectedBooking && selectedBooking.state && `, ${selectedBooking.state}`}
                        {'country' in selectedBooking && selectedBooking.country && `, ${selectedBooking.country}`}
                      </Text>
                    )}
                  </View>
                )}

                {/* Notes */}
                {selectedBooking.notes && (
                  <View style={[styles.modalSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Notes</Text>
                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>{selectedBooking.notes}</Text>
                  </View>
                )}

                {/* Important Notice */}
                <View style={[styles.noticeContainer, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Ionicons name="information-circle" size={20} color="#F59E0B" />
                  <Text style={[styles.noticeText, { color: '#92400E' }]}>
                    To cancel and get a refund, you must cancel through {getProviderLabel(selectedBooking.provider)}'s website or app. This app only tracks your bookings locally.
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: selectedBgColor }]}
                    onPress={() => handleOpenLink(selectedBooking)}
                  >
                    <Ionicons name="open-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Open on {getProviderLabel(selectedBooking.provider)}</Text>
                  </TouchableOpacity>

                  {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton, { borderColor: theme.secondaryText }]}
                      onPress={() => handleMarkAsCancelled(selectedBooking)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={theme.secondaryText} />
                      <Text style={[styles.actionButtonText, { color: theme.secondaryText }]}>
                        Mark as Cancelled (Local Only)
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, { borderColor: theme.border }]}
                    onPress={() => handleDeleteBooking(selectedBooking)}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.text} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  bookingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bookingProvider: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  modalSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  noticeContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

