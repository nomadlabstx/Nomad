/**
 * Performance utilities for the Nomad app
 */

import { InteractionManager } from 'react-native';

/**
 * Debounce function to limit the rate of function execution
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit the rate of function execution
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Run function after interactions are complete
 */
export const runAfterInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(callback);
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(label);
    console.log(`⏱️ ${label}: ${duration}ms`);
    return duration;
  }

  static measureAsync<T>(
    label: string,
    asyncFn: () => Promise<T>
  ): Promise<T> {
    this.startTimer(label);
    return asyncFn().finally(() => this.endTimer(label));
  }
}

/**
 * Memory usage utilities
 */
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    if (memory) {
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };
    }
  }
  return null;
};

/**
 * Log performance metrics
 */
export const logPerformanceMetrics = () => {
  const memory = getMemoryUsage();
  if (memory) {
    console.log('📊 Memory Usage:', memory);
  }
};

/**
 * Optimize large arrays for better performance
 */
export const optimizeArray = <T>(array: T[], chunkSize: number = 1000): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Batch state updates for better performance
 */
export const batchStateUpdates = (updates: (() => void)[]) => {
  runAfterInteractions(() => {
    updates.forEach(update => update());
  });
};
