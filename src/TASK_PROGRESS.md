# Task Progress: Recorridos & Simulación ✅

## Completed
- [x] Fix San Juan de Mozarrifar route - Updated neighborhood center coords (41.7000,-0.9000 → 41.7340,-0.8890) and all 6 route waypoints
- [x] Improve routes with too few waypoints - Added intermediate waypoints to:
  - Almozara: 5 → 9 points
  - Casablanca: 5 → 9 points  
  - Miralbueno: 5 → 9 points
  - Valdespartera: 5 → 9 points
- [x] Fix OSRM auto-fix logic bug:
  - Increased maxAddsPerSegment from 1 to 2 (more intermediate points for long segments)
  - Improved insertIntermediateWaypoints to use distance-based interpolation instead of flat midpoint
  - Early failure now immediately uses inserted intermediates
  - Added better debug logging
- [x] Fix interpolation street name mapping:
  - Replaced ratio-based mapping with Haversine nearest-point matching
  - Added proper stop proximity detection with configurable radius (30m)
  - Cleaner fallback logic for edge cases
- [x] Build succeeds with zero TypeScript errors

## No pending changes