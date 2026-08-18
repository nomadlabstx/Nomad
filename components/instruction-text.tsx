/**
 * Turn-by-turn instruction with inline highway shields.
 */

import { memo, useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, View } from 'react-native';
import { directionWord, tokenizeInstruction } from '../utils/highway-refs';
import HighwayShield from './highway-shield';

interface InstructionTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  compact?: boolean;
}

const InstructionText = memo<InstructionTextProps>(({ text, style, compact = false }) => {
  const parts = useMemo(() => tokenizeInstruction(text), [text]);

  if (parts.length === 1 && parts[0].type === 'text') {
    return (
      <Text style={style} numberOfLines={compact ? 2 : undefined}>
        {text}
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          if (!part.value) {
            return null;
          }
          return (
            <Text key={`t-${index}`} style={style}>
              {part.value}
            </Text>
          );
        }

        const dir = directionWord(part.ref.direction);
        return (
          <View key={`s-${index}-${part.ref.raw}`} style={styles.shieldCluster}>
            <HighwayShield refData={part.ref} compact={compact} />
            {dir ? (
              <Text style={style}>{dir}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

InstructionText.displayName = 'InstructionText';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  shieldCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default InstructionText;
