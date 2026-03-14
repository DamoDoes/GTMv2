// US states GeoJSON is loaded at runtime from /data/us-states.geojson
// This module exports null; the map component should fetch the file directly.
const stateGeo: GeoJSON.FeatureCollection | null = null;
export default stateGeo;
