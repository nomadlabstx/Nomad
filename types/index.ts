export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
}

export interface Trip {
  id: string;
  meters: number;
  startTs: number | null;
  endTs: number | null;
  path: TrackPoint[];
  pausedAccum?: number;
  /** "Trip to Yale Billiards" */
  name?: string;
}

export interface LocationSubscription {
  remove?: () => void;
  removeSubscription?: () => void;
  unsubscribe?: () => void;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface AppColors {
  tint: string;
  hudBackground: string;
  buttonAccent: string;
}

export interface ColorContextType {
  colors: AppColors;
  setColor: (k: keyof AppColors, v: string) => void;
  setColors: (c: Partial<AppColors>) => void;
}

export interface ToastContextType {
  show: (msg: string) => void;
}

export interface RecorderHUDProps {
  meters: number;
  elapsedMs: number;
  tracking: boolean;
  paused: boolean;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  unit: 'miles' | 'km';
  setUnit: (u: 'miles' | 'km') => void;
}
