/**
 * MUTCD highway shields (M1-1 Interstate, M1-4 US, state square).
 * Apple does not expose the shield artwork baked into MapKit tiles, so these
 * are the same public-domain federal sign drawings Apple Maps reproduces.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import type { HighwayRef } from '../utils/highway-refs';

interface HighwayShieldProps {
  refData: HighwayRef;
  compact?: boolean;
}

const INTERSTATE_BLUE = '#003F87';
const INTERSTATE_RED = '#BF0A30';

/**
 * Official MUTCD M1-1 outline (2-digit), viewBox 0 0 48 48.
 * Source: FHWA MUTCD — public domain.
 */
const I2 =
  'M24.02 1.15c12.9 0 20.55 3.35 22.15 5.55l1.18 10.7c0 13.85-10.2 24.2-23.33 30.4C10.9 41.6.67 31.25.67 17.4L1.87 6.7C3.47 4.5 11.12 1.15 24.02 1.15Z';

const I2_INNER =
  'M24.02 2.85c11.7 0 18.7 3.05 20.05 4.95l1.05 9.6c0 12.7-9.35 22.2-21.1 27.85C12.27 39.6 2.92 30.1 2.92 17.4L3.97 7.8C5.32 5.9 12.32 2.85 24.02 2.85Z';

const I2_RED =
  'M4.15 7.55C5.7 5.85 13.1 3.55 24.02 3.55S42.35 5.85 43.9 7.55l.7 6.35H3.45Z';

const I3 =
  'M31.1 1.15c16.4 0 26.2 3.35 28.2 5.55l1.5 10.7c0 13.85-13 24.2-29.7 30.4C14.4 41.6 1.4 31.25 1.4 17.4L2.9 6.7C4.9 4.5 14.7 1.15 31.1 1.15Z';

const I3_INNER =
  'M31.1 2.85c14.9 0 23.8 3.05 25.5 4.95l1.35 9.6c0 12.7-11.9 22.2-26.85 27.85C16.15 39.6 4.25 30.1 4.25 17.4L5.6 7.8C7.3 5.9 16.2 2.85 31.1 2.85Z';

const I3_RED =
  'M5.85 7.55C7.8 5.85 17.3 3.55 31.1 3.55s23.3 2.3 25.25 4l.9 6.35H4.95Z';

/** MUTCD M1-4 US route, viewBox 0 0 48 48. */
const US_OUTER =
  'M9.2 5.4 24 1.8 38.8 5.4 43.6 14.2v19.2c0 6.6-8.4 12.2-19.6 12.2S4.4 40 4.4 33.4V14.2Z';

const US_INNER =
  'M11.1 7.2 24 4.1 36.9 7.2 40.6 14.6v18.4c0 5.4-7.1 10.2-16.6 10.2S7.4 38.4 7.4 33V14.6Z';

const HighwayShield = memo<HighwayShieldProps>(({ refData, compact = false }) => {
  const digits = refData.number.length;
  const wide = digits >= 3;

  if (refData.kind === 'interstate') {
    const width = compact ? (wide ? 32 : 24) : wide ? 38 : 28;
    const height = compact ? 30 : 36;
    const vbW = wide ? 62 : 48;
    const cx = vbW / 2;
    const numberSize = wide ? (compact ? 15 : 17) : compact ? 17 : 20;

    return (
      <View style={styles.wrap}>
        <Svg width={width} height={height} viewBox={`0 0 ${vbW} 48`}>
          <Path d={wide ? I3 : I2} fill="#fff" />
          <Path d={wide ? I3_INNER : I2_INNER} fill={INTERSTATE_BLUE} />
          <Path d={wide ? I3_RED : I2_RED} fill={INTERSTATE_RED} />
          <SvgText
            x={cx}
            y={11.6}
            fill="#fff"
            fontSize={wide ? 4.2 : 4.6}
            fontWeight="700"
            textAnchor="middle"
            letterSpacing={0.85}
            fontFamily="Helvetica"
          >
            INTERSTATE
          </SvgText>
          <SvgText
            x={cx}
            y={34.5}
            fill="#fff"
            fontSize={numberSize}
            fontWeight="800"
            textAnchor="middle"
            fontFamily="Helvetica"
          >
            {refData.number}
          </SvgText>
        </Svg>
      </View>
    );
  }

  if (refData.kind === 'us') {
    const width = compact ? (wide ? 30 : 24) : wide ? 34 : 28;
    const height = compact ? 28 : 34;

    return (
      <View style={styles.wrap}>
        <Svg width={width} height={height} viewBox="0 0 48 48">
          <Path d={US_OUTER} fill="#1a1a1a" />
          <Path d={US_INNER} fill="#fff" />
          <SvgText
            x="24"
            y="12"
            fill="#1a1a1a"
            fontSize="5.2"
            fontWeight="700"
            textAnchor="middle"
            letterSpacing={1.1}
            fontFamily="Helvetica"
          >
            U.S.
          </SvgText>
          <SvgText
            x="24"
            y="34"
            fill="#1a1a1a"
            fontSize={wide ? 15 : 19}
            fontWeight="800"
            textAnchor="middle"
            fontFamily="Helvetica"
          >
            {refData.number}
          </SvgText>
        </Svg>
      </View>
    );
  }

  const width = compact ? 24 : 28;
  const height = compact ? 26 : 30;
  const label = refData.state || 'SR';

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height} viewBox="0 0 48 48">
        <Rect x="2" y="2" width="44" height="44" rx="3.5" fill="#1a1a1a" />
        <Rect x="4.4" y="4.4" width="39.2" height="39.2" rx="2.5" fill="#fff" />
        <SvgText
          x="24"
          y="15"
          fill="#1a1a1a"
          fontSize="7.5"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing={0.6}
          fontFamily="Helvetica"
        >
          {label}
        </SvgText>
        <SvgText
          x="24"
          y="36"
          fill="#1a1a1a"
          fontSize={digits >= 3 ? 15 : 19}
          fontWeight="800"
          textAnchor="middle"
          fontFamily="Helvetica"
        >
          {refData.number}
        </SvgText>
      </Svg>
    </View>
  );
});

HighwayShield.displayName = 'HighwayShield';

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 3,
    marginVertical: 1,
  },
});

export default HighwayShield;
