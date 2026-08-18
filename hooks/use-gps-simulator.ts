import { useSyncExternalStore } from 'react';
import { gpsSimulator, type GpsSimulatorSnapshot } from '../utils/gps-simulator';

export function useGpsSimulator(): GpsSimulatorSnapshot {
  return useSyncExternalStore(
    gpsSimulator.subscribeState,
    gpsSimulator.getSnapshot,
    gpsSimulator.getSnapshot
  );
}
