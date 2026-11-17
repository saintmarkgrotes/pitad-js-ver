import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline } from 'react-native-maps';
import RoutePreview from './RoutePreview';
import { routeRegion, routeSegments } from '../../features/tracking/routeGeometry';
import { useTheme } from '../../theme/useTheme';

export default function RouteMap({ points }) {
  const { colors, dark } = useTheme();
  const region = routeRegion(points);
  if (!region || (Platform.OS === 'android' && !Constants.expoConfig?.extra?.androidMapsConfigured)) return <RoutePreview points={points} />;
  return <View style={{ height: 260, borderRadius: 12, overflow: 'hidden' }}>
    <MapView style={{ flex: 1 }} region={region} userInterfaceStyle={dark ? 'dark' : 'light'}
      scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false} accessibilityLabel="Your recorded run route">
      {routeSegments(points).map((segment, i) => <Polyline key={i} coordinates={segment} strokeWidth={4} strokeColor={colors.primary} />)}
      <Marker coordinate={points[0]} title="Start" />
      <Marker coordinate={points[points.length - 1]} title="Latest point" pinColor={colors.primary} />
    </MapView>
  </View>;
}
