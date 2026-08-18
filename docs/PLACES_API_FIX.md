# Places API Migration - Fix Summary

## Issue Report
**Date:** October 14, 2025  
**Reporter:** User testing destination search feature  
**Severity:** Critical - Feature completely broken  

## Error Details

### Symptoms
```
WARN  Places API error: REQUEST_DENIED (repeated for every character typed)
```

### Root Cause
Google has deprecated the **legacy Places API** that our code was using. The API returned:
```
You're calling a legacy API, which is not enabled for your project. 
To get newer features and more functionality, switch to the Places API (New)
```

### Technical Details
- **Old Endpoint:** `https://maps.googleapis.com/maps/api/place/autocomplete/json`
- **Authentication:** API key passed as URL query parameter
- **Request Method:** GET with query params
- **Status:** Deprecated, requires separate API enablement

## Solution Implemented

### Migration to Places API (New)
- **New Endpoint:** `https://places.googleapis.com/v1/places:autocomplete`
- **Authentication:** API key passed in `X-Goog-Api-Key` header
- **Request Method:** POST with JSON body
- **Status:** Current, recommended by Google

### Code Changes

#### File: `components/destination-search.tsx`

**Changed: Autocomplete Request**
```typescript
// OLD (Legacy API)
const params = new URLSearchParams({
  input: query,
  key: GOOGLE_MAPS_API_KEY,
  types: 'geocode|establishment',
});
const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
const response = await fetch(url);

// NEW (Places API New)
const requestBody = {
  input: query,
  languageCode: 'en',
};
const url = `https://places.googleapis.com/v1/places:autocomplete`;
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
  },
  body: JSON.stringify(requestBody),
});
```

**Changed: Place Details Request**
```typescript
// OLD (Legacy API)
const params = new URLSearchParams({
  place_id: placeId,
  key: GOOGLE_MAPS_API_KEY,
  fields: 'geometry',
});
const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
const response = await fetch(url);

// NEW (Places API New)
const url = `https://places.googleapis.com/v1/places/${placeId}`;
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
    'X-Goog-FieldMask': 'location',
  },
});
```

**Changed: Response Parsing**
```typescript
// OLD
if (data.status === 'OK') {
  setPredictions(data.predictions);
}

// NEW
if (data.suggestions) {
  const convertedPredictions = data.suggestions
    .filter((suggestion) => suggestion.placePrediction)
    .map((suggestion) => ({
      place_id: suggestion.placePrediction.placeId,
      description: suggestion.placePrediction.text.text,
      structured_formatting: {
        main_text: suggestion.placePrediction.structuredFormat?.mainText?.text || 
                   suggestion.placePrediction.text.text,
        secondary_text: suggestion.placePrediction.structuredFormat?.secondaryText?.text || '',
      },
    }));
  setPredictions(convertedPredictions);
}
```

## Verification

### Test Script Created
`scripts/test-places-new-api.js` - Diagnostic tool for Places API

### Test Results
```
✅ Places Autocomplete (New): WORKING
📍 Found 5 suggestions
🏢 Example: Thrst Coffee Shop, Colcord Avenue, Waco, TX, USA
```

## User Action Required

### Restart Expo Server
To pick up the changes, the user needs to restart their development server:

```powershell
# Stop current Expo server (Ctrl+C)
# Then restart:
npx expo start --clear
```

## Benefits of New API

1. **More Reliable:** Current, supported API
2. **Better Data:** Enhanced place information
3. **Future-Proof:** Won't be deprecated
4. **Improved Response Format:** Cleaner structured data
5. **Better Performance:** Optimized for mobile

## Additional Notes

### API Billing
- Places API (New) is billed separately from legacy Places API
- Free tier: First $200 credit per month
- After free tier: $17 per 1,000 autocomplete requests
- Current usage should stay well within free tier during testing

### Related APIs Still Working
- ✅ Directions API (routing)
- ✅ Roads API (speed limits)
- ✅ Geocoding API (address lookup)
- ✅ Maps SDK (map rendering)

### Files Modified
1. `components/destination-search.tsx` - Core fix
2. `scripts/test-places-new-api.js` - New diagnostic tool (can be deleted after testing)
3. `scripts/test-places-api.js` - Old diagnostic tool (can be deleted)

## Status
✅ **FIXED** - Ready for testing after server restart

## Next Steps for User
1. Restart Expo development server
2. Test destination search by typing a location
3. Verify autocomplete suggestions appear
4. Verify selecting a destination calculates route
5. Report any remaining issues
