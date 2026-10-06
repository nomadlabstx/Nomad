/**
 * Dynamic Expo config. Static identity stays in app.json.
 * EAS production/preview inject Maps keys from the Expo dashboard
 * (or a local .env) so TestFlight GPS is not a blank/unroutable build.
 */
module.exports = ({ config }) => {
  const mapsKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY ||
    '';
  const iosMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || mapsKey;
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || mapsKey;

  const next = {
    ...config,
    ios: { ...(config.ios || {}) },
    android: { ...(config.android || {}) },
  };

  if (iosMapsKey) {
    next.ios.config = {
      ...(next.ios.config || {}),
      googleMapsApiKey: iosMapsKey,
    };
  }

  if (androidMapsKey) {
    next.android.config = {
      ...(next.android.config || {}),
      googleMaps: {
        ...((next.android.config && next.android.config.googleMaps) || {}),
        apiKey: androidMapsKey,
      },
    };
  }

  return next;
};
