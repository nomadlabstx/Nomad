import { useEffect, useRef, useState } from 'react';
import { placeIdentityService } from '../services/place-identity';
import type { PlaceIdentity } from '../utils/place-identity';

export function usePlaceIdentity(
  coords: { latitude: number; longitude: number } | null,
  fallbackRoad?: string
): PlaceIdentity | null {
  const [identity, setIdentity] = useState<PlaceIdentity | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!coords) {
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    void placeIdentityService
      .resolve(coords, { fallbackRoad })
      .then((next) => {
        if (cancelled || requestId !== requestIdRef.current || !next) {
          return;
        }
        setIdentity(next);
      })
      .catch((error) => {
        console.warn('[PlaceIdentity] resolve failed:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [coords?.latitude, coords?.longitude, fallbackRoad]);

  return identity;
}
