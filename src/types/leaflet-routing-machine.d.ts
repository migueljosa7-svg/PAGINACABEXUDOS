import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Routing {
    interface RoutingControlOptions {
      waypoints?: L.LatLng[] | L.Routing.Waypoint[];
      router?: unknown;
      plan?: unknown;
      geocoder?: unknown;
      lineOptions?: unknown;
      routeWhileDragging?: boolean;
      routeDragInterval?: number;
      addWaypoints?: boolean;
      fitSelectedRoutes?: boolean | string;
      showAlternatives?: boolean;
      altLineOptions?: unknown;
      show?: boolean;
      createMarker?: (i: number, waypoint: unknown, n: number) => unknown;
    }

    interface Waypoint {
      latLng: L.LatLng;
      name?: string;
      options?: unknown;
    }

    class Control extends L.Control {
      constructor(options?: RoutingControlOptions);
      getWaypoints(): Waypoint[];
      setWaypoints(waypoints: L.LatLng[] | Waypoint[]): this;
      spliceWaypoints(index: number, count: number, ...waypoints: L.LatLng[] | Waypoint[]): Waypoint[];
      route(): void;
    }

    function control(options?: RoutingControlOptions): Control;
  }
}
