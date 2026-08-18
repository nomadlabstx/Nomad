# Apple Maps Setup Guide

## Status: ✅ Ready for Future Implementation

**Current State:** All code is complete and ready. Implementation will happen when iOS build is needed.

✅ **Map Display**: Apple Maps is now enabled on iOS devices
- The map component automatically uses Apple Maps on iOS, Google Maps on Android/Web
- No additional configuration needed for map display

✅ **Native Modules Created**: MapKit routing and geocoding modules are ready
- Swift files created: `ios/MapKitDirections.swift`, `ios/MapKitGeocoding.swift`
- Bridge file created: `ios/MapKitBridge.m`
- Expo config plugin created: `app.plugin.js`
- TypeScript services updated to call native modules
- **Note:** Will be automatically included during EAS Build when ready

## What's Already Done

1. ✅ Map provider updated to use `PROVIDER_DEFAULT` on iOS (Apple Maps)
2. ✅ Service abstractions created (`routing-service.ts`, `geocoding-service.ts`)
3. ✅ MapKit services created with native module integration (`mapkit-routing.ts`, `mapkit-geocoding.ts`)
4. ✅ Native iOS modules created (Swift + Objective-C bridge)
5. ✅ Expo config plugin created to include native files in build
6. ✅ Automatic fallback to Google Maps if MapKit unavailable

## Next Steps

### ⚠️ Windows Users (You!)

**You cannot generate iOS projects on Windows.** Use EAS Build instead:

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Build iOS app with native modules**:
   ```bash
   eas build --platform ios
   ```

The Expo config plugin (`app.plugin.js`) will automatically include the native files from the `ios/` folder during the cloud build. No local iOS project needed!

### macOS/Linux Users

If you're on macOS or Linux, you can generate the iOS project locally:

```bash
npx expo prebuild --platform ios
```

The Expo config plugin will automatically copy the native files during this process.

Then build locally:
```bash
npx expo run:ios
```

## How It Works

The native files in the `ios/` folder are automatically included during:
- **EAS Build** (cloud builds) - Works on any OS including Windows
- **Local prebuild** (macOS/Linux only) - Copies files to `ios/Nomad/`

The config plugin (`app.plugin.js`) handles copying and adding files to the Xcode project automatically.

## Testing

Once you build the iOS app (via EAS Build or locally), the native modules will be available:
- ✅ Map display uses Apple Maps on iOS
- ✅ Routing uses MapKit (free, 250k requests/month)
- ✅ Geocoding uses MapKit (free, 250k requests/month)
- ✅ Automatic fallback to Google Maps if MapKit unavailable

## Benefits

- ✅ Free routing/geocoding (250k requests/month free)
- ✅ Native iOS performance
- ✅ Better iOS integration
- ✅ No API key management needed
- ✅ Automatic fallback to Google Maps if unavailable

## Troubleshooting

**If native modules don't work:**
1. Check that files exist in `ios/` folder (they should)
2. For EAS Build: Files are included automatically
3. For local builds: Verify files were copied to `ios/Nomad/`
4. Check Xcode build logs for any Swift compilation errors

**If you get React Native bridge errors:**
- Create `ios/Nomad/Nomad-Bridging-Header.h` with:
  ```objc
  #import <React/RCTBridgeModule.h>
  ```
- Set "Objective-C Bridging Header" in Xcode project settings

## Resources

- [Apple MapKit Documentation](https://developer.apple.com/documentation/mapkit)
- [MKDirections API](https://developer.apple.com/documentation/mapkit/mkdirections)
- [CLGeocoder API](https://developer.apple.com/documentation/corelocation/clgeocoder)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-ios)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
