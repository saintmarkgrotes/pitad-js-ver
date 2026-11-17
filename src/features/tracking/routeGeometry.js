// Only display samples are reduced. SQLite retains every accepted GPS point.
export function limitRoute(points, limit = 600) {
  if (points.length <= limit) return points;
  const stride = Math.ceil(points.length / limit);
  return points.filter((point, i) => i === 0 || i === points.length - 1 || i % stride === 0 ||
    point.segment !== points[i - 1]?.segment || point.segment !== points[i + 1]?.segment);
}
export function routeSegments(points) {
  /** @type {Array<Array<{segment: number, latitude: number, longitude: number}>>} */
  const segments = [];
  for (const point of points) {
    if (!segments.length || segments[segments.length - 1]?.[0]?.segment !== point.segment) segments.push([]);
    segments[segments.length - 1].push(point);
  }
  return segments;
}
export function routeRegion(points) {
  if (!points.length) return null;
  const latitudes = points.map((p) => p.latitude);
  // Unwrap around the first longitude so dateline crossings fit the short way.
  const origin = points[0].longitude;
  const longitudes = points.map((p) => origin + ((p.longitude - origin + 540) % 360 - 180));
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  return { latitude: (minLat + maxLat) / 2, longitude: ((minLon + maxLon) / 2 + 540) % 360 - 180,
    latitudeDelta: Math.max(0.003, (maxLat - minLat) * 1.3), longitudeDelta: Math.max(0.003, (maxLon - minLon) * 1.3) };
}
