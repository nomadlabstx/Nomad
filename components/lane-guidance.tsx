/**
 * Lane Guidance Component
 * Visual display of which lanes to use for upcoming turn
 */

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LaneInfo } from '../services/navigation';

interface LaneGuidanceProps {
  lanes?: LaneInfo[];
  tint?: string;
}

const LaneGuidance = memo<LaneGuidanceProps>(({ lanes, tint = '#007AFF' }) => {
  if (!lanes || lanes.length === 0) {
    return null;
  }

  // Get the first lane group (most relevant for upcoming turn)
  const laneGroup = lanes[0];
  if (!laneGroup || !laneGroup.lanes) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>STAY IN LANE:</Text>
      <View style={styles.lanesContainer}>
        {laneGroup.lanes.map((lane: any, index: number) => {
          const isActive = lane.valid || laneGroup.lanesActive?.[index];
          
          return (
            <View
              key={index}
              style={[
                styles.lane,
                isActive && { backgroundColor: tint, borderColor: tint },
              ]}
            >
              {lane.indications?.map((indication: any, idx: number) => (
                <Text
                  key={idx}
                  style={[
                    styles.laneArrow,
                    isActive && styles.laneArrowActive,
                  ]}
                >
                  {getLaneArrow(indication)}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
});

LaneGuidance.displayName = 'LaneGuidance';

/**
 * Get arrow symbol for lane indication
 */
function getLaneArrow(indication: string): string {
  const arrows: Record<string, string> = {
    left: '←',
    right: '→',
    'slight-left': '↖',
    'slight-right': '↗',
    'sharp-left': '↰',
    'sharp-right': '↱',
    through: '↑',
    straight: '↑',
    'uturn-left': '↶',
    'uturn-right': '↷',
    merge: '⤴',
  };

  return arrows[indication.toLowerCase()] || '↑';
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lanesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  lane: {
    width: 50,
    height: 60,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  laneArrow: {
    fontSize: 24,
    color: '#888',
    fontWeight: 'bold',
  },
  laneArrowActive: {
    color: '#fff',
  },
});

export default LaneGuidance;

