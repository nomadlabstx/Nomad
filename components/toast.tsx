import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ToastContextType } from '../types';

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export const ToastProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMsg(message);
    fadeAnim.setValue(0);
    
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 200, 
      useNativeDriver: true 
    }).start();
    
    timeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, { 
        toValue: 0, 
        duration: 200, 
        useNativeDriver: true 
      }).start(() => setMsg(null));
    }, 2000);
  }, [fadeAnim]);

  const contextValue = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {msg ? (
        <Animated.View style={[styles.container, { opacity: fadeAnim, pointerEvents: 'none' }]}>
          <View style={styles.toast}>
            <Text style={styles.text}>{msg}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
});

ToastProvider.displayName = 'ToastProvider';

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 44,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  text: { color: '#fff' },
});

export default ToastProvider;
