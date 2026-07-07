import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Routing {
    interface RoutingControlOptions {
      waypoints?: L.LatLng[] | L.Routing.Waypoint[];
      router?: any;
      plan?: any;
      geocoder?: any;
      lineOptions?: any;
      routeWhileDragging?: boolean;
      routeDragInterval?: number;
      addWaypoints?: boolean;
      fitSelectedRoutes?: boolean | string;
      showAlternatives?: boolean;
      altLineOptions?: any;
      show?: boolean;
      createMarker?: (i: number, waypoint: any, n: number) => any;
    }

    interface Waypoint {
      latLng: L.LatLng;
      name?: string;
      options?: any;
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
