/**
 * Preview + in-nav route lines: selected path in traffic colors, alternatives muted.
 */

import { Fragment, memo, useMemo } from 'react';
import { Polyline as MaybePolyline } from './maybe-map';
import type { Route } from '../types/navigation';
import { navigationService } from '../services/navigation';
import {
  TRAFFIC_COLORS,
  buildTrafficSlices,
  fallbackSpeedForLevel,
  type TrafficLevel,
} from '../utils/traffic';

interface RoutePreviewPolylinesProps {
  routes: Route[];
  selectedRouteId: string | null;
  onSelectRoute?: (routeId: string) => void;
}

const RoutePreviewPolylines = memo<RoutePreviewPolylinesProps>(({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  const layers = useMemo(() => {
    return routes.map((route) => {
      const points = navigationService.getDetailedRoutePath(route);
      const level: TrafficLevel = route.trafficLevel || 'clear';
      const selected = route.id === selectedRouteId;
      const slices = selected
        ? buildTrafficSlices(
            points,
            undefined,
            fallbackSpeedForLevel(level)
          )
        : [{ coordinates: points, color: TRAFFIC_COLORS.ALT, speed: 'NORMAL' as const }];

      return { route, points, selected, slices };
    });
  }, [routes, selectedRouteId]);

  return (
    <>
      {layers
        .filter((layer) => !layer.selected)
        .map((layer) =>
          layer.points.length >= 2 ? (
            <MaybePolyline
              key={`alt-${layer.route.id}`}
              coordinates={layer.points}
              strokeWidth={4}
              strokeColor={TRAFFIC_COLORS.ALT}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
              tappable={Boolean(onSelectRoute)}
              onPress={() => onSelectRoute?.(layer.route.id)}
            />
          ) : null
        )}

      {layers
        .filter((layer) => layer.selected)
        .map((layer) => (
          <Fragment key={`sel-${layer.route.id}`}>
            {layer.points.length >= 2 ? (
              <MaybePolyline
                coordinates={layer.points}
                strokeWidth={10}
                strokeColor={TRAFFIC_COLORS.CASING}
                lineCap="round"
                lineJoin="round"
                zIndex={3}
              />
            ) : null}
            {layer.slices.map((slice, index) => (
              <MaybePolyline
                key={`seg-${layer.route.id}-${index}`}
                coordinates={slice.coordinates}
                strokeWidth={6}
                strokeColor={slice.color}
                lineCap="round"
                lineJoin="round"
                zIndex={4}
              />
            ))}
          </Fragment>
        ))}
    </>
  );
});

RoutePreviewPolylines.displayName = 'RoutePreviewPolylines';

export default RoutePreviewPolylines;
