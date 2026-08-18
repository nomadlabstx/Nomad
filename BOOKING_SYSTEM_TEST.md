# Booking System Test Guide

This document provides a comprehensive guide for testing the Nomad booking system.

## Overview

The booking system allows users to book hotels, flights, car rentals, and activities through natural conversation with the AI assistant (Pathfinder). The system:

1. Detects booking intent from user messages
2. Extracts booking details (destination, dates, guests, etc.)
3. Generates affiliate links to Expedia Group brands
4. Displays booking options in the chat
5. Allows users to save bookings to their account

## Test Scenarios

### Test 1: Hotel Booking Flow

**Steps:**
1. Open the Pathfinder tab (AI Assistant)
2. Send message: "I need a hotel in Dallas for 2 guests, check in December 15, check out December 20"
3. **Expected:** 
   - AI responds acknowledging the booking request
   - Booking options card appears below the AI response
   - Options show Expedia, Hotels.com, and Travelocity
   - Each option has an affiliate link

**Verify:**
- [ ] Booking intent is detected (hotel type)
- [ ] Destination is extracted (Dallas)
- [ ] Dates are parsed correctly
- [ ] Guest count is captured (2)
- [ ] Booking options card displays
- [ ] Affiliate links are generated
- [ ] Tapping an option opens the affiliate link

### Test 2: Flight Booking Flow

**Steps:**
1. In Pathfinder, send: "Book a flight from New York to Los Angeles for 2 passengers on December 15"
2. **Expected:**
   - AI detects flight booking intent
   - Booking options appear with flight search links
   - Links include origin, destination, and date

**Verify:**
- [ ] Flight type detected
- [ ] Origin and destination extracted
- [ ] Passenger count captured
- [ ] Departure date parsed
- [ ] Flight booking options displayed

### Test 3: Car Rental Booking Flow

**Steps:**
1. Send: "I want to rent a car in Miami from December 15 to December 20"
2. **Expected:**
   - Car rental intent detected
   - Pickup/dropoff dates extracted
   - Car rental options displayed

**Verify:**
- [ ] Car rental type detected
- [ ] Location extracted
- [ ] Dates parsed correctly
- [ ] Car rental options shown

### Test 4: Activity Booking Flow

**Steps:**
1. Send: "Find me a tour or activity in San Francisco"
2. **Expected:**
   - Activity intent detected
   - Destination extracted
   - Activity options displayed

**Verify:**
- [ ] Activity type detected
- [ ] Destination captured
- [ ] Activity options shown

### Test 5: Booking Management Screen

**Steps:**
1. Complete a booking flow (any type)
2. Navigate to Bookings tab
3. **Expected:**
   - All bookings are listed
   - Bookings can be filtered by type
   - Bookings can be filtered by status
   - Booking details can be viewed

**Verify:**
- [ ] Bookings screen loads
- [ ] All bookings are displayed
- [ ] Filter buttons work (All, Hotel, Flight, etc.)
- [ ] Status filters work (All, Confirmed, Pending, etc.)
- [ ] Tapping a booking shows details
- [ ] "Open on {provider}" button works
- [ ] "Mark as Cancelled" works (local only)

### Test 6: Booking Context Persistence

**Steps:**
1. Start a booking conversation
2. Navigate away from Pathfinder
3. Return to Pathfinder
4. **Expected:**
   - Booking context is maintained
   - Options are still available

**Verify:**
- [ ] Context persists across navigation
- [ ] Options remain visible
- [ ] Can continue booking flow

### Test 7: Multiple Booking Types

**Steps:**
1. Start a hotel booking
2. Then ask for a flight
3. **Expected:**
   - New booking context replaces old one
   - Flight options appear
   - Hotel context is cleared

**Verify:**
- [ ] Context updates correctly
- [ ] Old options are replaced
- [ ] New booking type is active

### Test 8: Edge Cases

**Test 8a: Invalid Intent**
- Send: "What's the weather today?"
- **Expected:** No booking intent detected, normal AI response

**Test 8b: Incomplete Details**
- Send: "I need a hotel"
- **Expected:** AI asks for more details (destination, dates)

**Test 8c: No Destination**
- Send: "Book a hotel for 2 guests"
- **Expected:** AI asks for destination

**Test 8d: Invalid Dates**
- Send: "Hotel in Dallas check in yesterday"
- **Expected:** AI handles gracefully, asks for valid dates

## Technical Verification

### Check Console Logs

When testing, check the console for:
- `[BookingContext]` logs - context updates
- `[ExpediaAffiliate]` logs - affiliate link generation
- `[BookingService]` logs - booking operations
- `[ConversationalBooking]` logs - intent parsing

### Verify Affiliate Links

Affiliate links should:
- Include `affcid` parameter (if affiliate ID is set)
- Include `pid` parameter (if partner ID is set)
- Include destination, dates, and guest/passenger info
- Point to correct Expedia Group brand URLs

### Check AsyncStorage

Bookings are stored in AsyncStorage under:
- `@nomad_bookings` - All saved bookings
- `@nomad_booking_context` - Current booking context

## Known Limitations

1. **Affiliate IDs Required**: For affiliate links to work, you need:
   - `EXPO_PUBLIC_EXPEDIA_AFFILIATE_ID` in `.env`
   - `EXPO_PUBLIC_EXPEDIA_PARTNER_ID` in `.env`
   - Without these, links will still work but won't track commissions

2. **Local Cancellation Only**: The "Mark as Cancelled" button only updates local status. Actual cancellations must be done through the provider's website.

3. **No Real-Time Pricing**: Booking options show placeholder prices (0). Real pricing would require integration with Expedia API.

4. **Date Parsing**: Date parsing is basic and may not handle all formats. Complex date expressions may not be parsed correctly.

## Troubleshooting

### Booking Options Not Appearing

1. Check if booking intent was detected (check console)
2. Verify booking context has options (check AsyncStorage)
3. Ensure `BookingOptionsCard` is rendered in chat
4. Check if `bookingContext` state is set correctly

### Affiliate Links Not Working

1. Verify affiliate IDs are set in `.env`
2. Check link format in console logs
3. Test link in browser to verify it opens
4. Check if `Linking.canOpenURL` returns true

### Booking Context Not Persisting

1. Check AsyncStorage for `@nomad_booking_context`
2. Verify `bookingContextManager.save()` is called
3. Check if context is cleared prematurely
4. Verify `initialize()` is called on app start

## Success Criteria

✅ All booking types (hotel, flight, car, activity) are detected  
✅ Booking details are extracted correctly  
✅ Affiliate links are generated for all providers  
✅ Booking options card displays in chat  
✅ Bookings can be saved and viewed  
✅ Booking management screen works correctly  
✅ Context persists across navigation  
✅ Edge cases are handled gracefully  

## Next Steps

After testing, consider:
1. Adding real-time pricing via Expedia API
2. Implementing booking confirmation flow
3. Adding payment method storage
4. Integrating with trip planning
5. Adding booking reminders/notifications

