import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatCountyLine,
  formatPlaceLine,
  type PlaceIdentity,
} from '../utils/place-identity';

interface PlaceIdentityHudProps {
  identity: PlaceIdentity | null;
}

const PlaceIdentityHud = memo(({ identity }: PlaceIdentityHudProps) => {
  if (!identity?.road && !identity?.town) {
    return null;
  }

  const placeLine = identity ? formatPlaceLine(identity) : '';
  const countyLine = identity ? formatCountyLine(identity) : '';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.card}>
        {identity?.road ? (
          <Text style={styles.road} numberOfLines={1}>
            {identity.road}
          </Text>
        ) : null}
        {placeLine ? (
          <Text style={styles.place} numberOfLines={1}>
            {placeLine}
          </Text>
        ) : null}
        {countyLine ? (
          <Text style={styles.county} numberOfLines={1}>
            {countyLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

PlaceIdentityHud.displayName = 'PlaceIdentityHud';

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 56,
  },
  card: {
    minWidth: 160,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.78)',
    alignItems: 'center',
  },
  road: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  place: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
  },
  county: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
  },
});

export default PlaceIdentityHud;
