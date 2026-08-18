/**
 * Booking System Test Script
 * Tests the complete booking flow from intent detection to booking creation
 */

const { conversationalBookingService } = require('../services/conversational-booking');
const { bookingContextManager } = require('../services/booking-context');
const { expediaAffiliateService } = require('../services/expedia-affiliate');
const { bookingService } = require('../services/booking');

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function test(name, fn) {
  try {
    log(`\n🧪 Testing: ${name}`, BLUE);
    const result = fn();
    if (result === true || result === undefined) {
      log(`✅ PASS: ${name}`, GREEN);
      testsPassed++;
      return true;
    } else {
      log(`❌ FAIL: ${name} - ${result}`, RED);
      testsFailed++;
      return false;
    }
  } catch (error) {
      log(`❌ FAIL: ${name} - ${error.message}`, RED);
      console.error(error);
      testsFailed++;
      return false;
  }
}

async function runTests() {
  log('\n🚀 Starting Booking System Tests\n', YELLOW);
  log('='.repeat(60), YELLOW);

  // Initialize services
  await bookingContextManager.initialize();
  await bookingService.initialize();

  // Test 1: Booking Intent Parsing
  test('Parse hotel booking intent', () => {
    const intent = conversationalBookingService.parseBookingIntent(
      'I need a hotel in Dallas for 2 guests, check in 12/15/2024, check out 12/20/2024'
    );
    
    if (intent.type !== 'hotel') return 'Expected hotel type';
    if (intent.confidence < 0.5) return 'Confidence too low';
    if (intent.details.guests !== 2) return 'Guests not parsed correctly';
    if (!intent.details.checkIn) return 'Check-in date not parsed';
    if (!intent.details.checkOut) return 'Check-out date not parsed';
    return true;
  });

  test('Parse flight booking intent', () => {
    const intent = conversationalBookingService.parseBookingIntent(
      'Book a flight from New York to Los Angeles for 2 passengers'
    );
    
    if (intent.type !== 'flight') return 'Expected flight type';
    if (intent.details.passengers !== 2) return 'Passengers not parsed correctly';
    return true;
  });

  test('Parse car rental intent', () => {
    const intent = conversationalBookingService.parseBookingIntent(
      'I want to rent a car in Miami'
    );
    
    if (intent.type !== 'car-rental') return 'Expected car-rental type';
    return true;
  });

  test('Parse activity booking intent', () => {
    const intent = conversationalBookingService.parseBookingIntent(
      'Find me a tour or activity in San Francisco'
    );
    
    if (intent.type !== 'activity') return 'Expected activity type';
    return true;
  });

  // Test 2: Affiliate Link Generation
  test('Generate hotel affiliate link', () => {
    const link = expediaAffiliateService.generateHotelLink({
      brand: 'expedia',
      destination: 'Dallas, TX',
      checkIn: '2024-12-15',
      checkOut: '2024-12-20',
      adults: 2,
    });
    
    if (!link) return 'Link not generated';
    if (!link.includes('expedia.com')) return 'Link does not contain expedia.com';
    if (!link.includes('destination=Dallas')) return 'Destination not in link';
    return true;
  });

  test('Generate flight affiliate link', () => {
    const link = expediaAffiliateService.generateFlightLink({
      brand: 'expedia',
      origin: 'JFK',
      destinationAirport: 'LAX',
      departureDate: '2024-12-15',
      adults: 2,
    });
    
    if (!link) return 'Link not generated';
    if (!link.includes('expedia.com')) return 'Link does not contain expedia.com';
    if (!link.includes('Flights-Search')) return 'Link does not contain Flights-Search';
    return true;
  });

  test('Generate car rental affiliate link', () => {
    const link = expediaAffiliateService.generateCarRentalLink({
      brand: 'expedia',
      carPickupLocation: 'Miami, FL',
      carPickupDate: '2024-12-15',
      carDropoffDate: '2024-12-20',
    });
    
    if (!link) return 'Link not generated';
    if (!link.includes('expedia.com')) return 'Link does not contain expedia.com';
    if (!link.includes('Cars')) return 'Link does not contain Cars';
    return true;
  });

  test('Generate activity affiliate link', () => {
    const link = expediaAffiliateService.generateActivityLink({
      brand: 'expedia',
      destination: 'San Francisco, CA',
    });
    
    if (!link) return 'Link not generated';
    if (!link.includes('expedia.com')) return 'Link does not contain expedia.com';
    if (!link.includes('Activities')) return 'Link does not contain Activities';
    return true;
  });

  // Test 3: Booking Context Management
  test('Start booking context', async () => {
    await bookingContextManager.clear();
    const context = await bookingContextManager.startBooking('hotel');
    
    if (!context) return 'Context not created';
    if (context.type !== 'hotel') return 'Wrong booking type';
    if (context.status !== 'searching') return 'Wrong status';
    return true;
  });

  test('Update booking context with destination', async () => {
    await bookingContextManager.setDestination('Dallas, TX', { latitude: 32.7767, longitude: -96.7970 });
    const context = bookingContextManager.getContext();
    
    if (!context) return 'Context not found';
    if (!context.destination) return 'Destination not set';
    if (context.destination.name !== 'Dallas, TX') return 'Wrong destination name';
    return true;
  });

  test('Update booking context with dates', async () => {
    const checkIn = new Date('2024-12-15').getTime();
    const checkOut = new Date('2024-12-20').getTime();
    await bookingContextManager.setDates({ checkIn, checkOut });
    const context = bookingContextManager.getContext();
    
    if (!context) return 'Context not found';
    if (!context.dates) return 'Dates not set';
    if (context.dates.checkIn !== checkIn) return 'Wrong check-in date';
    if (context.dates.checkOut !== checkOut) return 'Wrong check-out date';
    return true;
  });

  test('Generate and set booking options', async () => {
    const intent = conversationalBookingService.parseBookingIntent(
      'I need a hotel in Dallas for 2 guests, check in 12/15/2024, check out 12/20/2024'
    );
    
    const options = await conversationalBookingService.generateBookingOptions('hotel', intent.details);
    
    if (!options || options.length === 0) return 'No options generated';
    if (options[0].type !== 'hotel') return 'Wrong option type';
    if (!options[0].affiliateLink) return 'No affiliate link';
    
    await bookingContextManager.setOptions(options);
    const context = bookingContextManager.getContext();
    
    if (!context.options || context.options.length === 0) return 'Options not set in context';
    return true;
  });

  // Test 4: Full Booking Flow
  test('Complete booking flow: intent → context → options', async () => {
    await bookingContextManager.clear();
    
    const message = 'I need a hotel in Dallas for 2 guests, check in 12/15/2024, check out 12/20/2024';
    const intent = conversationalBookingService.parseBookingIntent(message);
    
    if (!intent.type || intent.confidence < 0.5) {
      return 'Intent not detected';
    }
    
    const context = await conversationalBookingService.processBookingIntent(intent);
    
    if (!context) return 'Context not created';
    if (!context.options || context.options.length === 0) return 'Options not generated';
    if (context.status !== 'reviewing') return 'Wrong status after options generated';
    
    return true;
  });

  // Test 5: Booking Service Operations
  test('Create booking', async () => {
    const booking = await bookingService.createBooking({
      type: 'hotel',
      status: 'pending',
      provider: 'expedia',
      affiliateLink: 'https://www.expedia.com/Hotel-Search?destination=Dallas',
      checkInDate: new Date('2024-12-15').getTime(),
      checkOutDate: new Date('2024-12-20').getTime(),
    });
    
    if (!booking) return 'Booking not created';
    if (!booking.id) return 'Booking ID not generated';
    if (booking.type !== 'hotel') return 'Wrong booking type';
    return true;
  });

  test('Get all bookings', async () => {
    const bookings = await bookingService.getAllBookings();
    
    if (!Array.isArray(bookings)) return 'Bookings not an array';
    if (bookings.length === 0) return 'No bookings found';
    return true;
  });

  test('Get bookings by type', async () => {
    const hotelBookings = await bookingService.getBookingsByType('hotel');
    
    if (!Array.isArray(hotelBookings)) return 'Bookings not an array';
    const allHotels = hotelBookings.every(b => b.type === 'hotel');
    if (!allHotels) return 'Not all bookings are hotels';
    return true;
  });

  test('Update booking status', async () => {
    const bookings = await bookingService.getAllBookings();
    if (bookings.length === 0) return 'No bookings to update';
    
    const booking = bookings[0];
    const updated = await bookingService.updateBooking(booking.id, { status: 'confirmed' });
    
    if (!updated) return 'Booking not updated';
    if (updated.status !== 'confirmed') return 'Status not updated correctly';
    return true;
  });

  test('Cancel booking', async () => {
    const bookings = await bookingService.getAllBookings();
    if (bookings.length === 0) return 'No bookings to cancel';
    
    const booking = bookings[0];
    const cancelled = await bookingService.cancelBooking(booking.id);
    
    if (!cancelled) return 'Booking not cancelled';
    
    const updated = await bookingService.getBooking(booking.id);
    if (updated.status !== 'cancelled') return 'Status not set to cancelled';
    return true;
  });

  // Test 6: Edge Cases
  test('Handle invalid booking intent', () => {
    const intent = conversationalBookingService.parseBookingIntent('What is the weather today?');
    
    if (intent.type !== null) return 'Should not detect booking intent';
    if (intent.confidence > 0.5) return 'Confidence should be low';
    return true;
  });

  test('Handle missing destination in intent', () => {
    const intent = conversationalBookingService.parseBookingIntent('I need a hotel');
    
    if (intent.type !== 'hotel') return 'Should detect hotel type';
    if (intent.details.destination) return 'Should not have destination';
    return true;
  });

  // Summary
  log('\n' + '='.repeat(60), YELLOW);
  log(`\n📊 Test Results:`, YELLOW);
  log(`✅ Passed: ${testsPassed}`, GREEN);
  log(`❌ Failed: ${testsFailed}`, testsFailed > 0 ? RED : GREEN);
  log(`📈 Total: ${testsPassed + testsFailed}`, BLUE);
  
  if (testsFailed === 0) {
    log('\n🎉 All tests passed!', GREEN);
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', RED);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, RED);
  console.error(error);
  process.exit(1);
});

