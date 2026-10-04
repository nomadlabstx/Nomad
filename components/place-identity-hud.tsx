import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatCountyLine,
  formatPlaceLine,
  type PlaceIdentity,
} from '../utils/place-identity';

interface PlaceIdentityHudProps {
  identity: PlaceIdentity | null;
  compact?: boolean;
  inverted?: boolean;
}

const PlaceIdentityHud = memo(({ identity, compact = false, inverted = false }: PlaceIdentityHudProps) => {
  if (!identity?.road && !identity?.town) {
    return null;
  }

  const placeLine = identity ? formatPlaceLine(identity) : '';
  const countyLine = identity ? formatCountyLine(identity) : '';

  if (compact) {
    return (
      <View style={styles.compactWrap} pointerEvents="none">
        {identity?.road ? (
          <Text style={[styles.compactRoad, inverted && styles.compactRoadInverted]} numberOfLines={1}>
            {identity.road}
          </Text>
        ) : null}
        {placeLine || countyLine ? (
          <Text style={[styles.compactPlace, inverted && styles.compactPlaceInverted]} numberOfLines={1}>
            {[placeLine, countyLine].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
    );
  }

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
    minWidth: 140,
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 18, 18, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
  },
  road: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  place: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
  },
  county: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
  },
  compactWrap: {
    marginTop: 4,
  },
  compactRoad: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: 'rgba(0, 0, 0, 0.78)',
  },
  compactPlace: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  compactRoadInverted: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  compactPlaceInverted: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
});

export default PlaceIdentityHud;
