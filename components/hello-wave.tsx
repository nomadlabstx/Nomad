import { memo } from 'react';
import Animated from 'react-native-reanimated';

export const HelloWave = memo(() => {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
});

HelloWave.displayName = 'HelloWave';
