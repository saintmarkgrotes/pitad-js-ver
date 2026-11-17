import '../services/locationTask';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/authentication/AuthProvider';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/useTheme';
import { TrackingProvider } from '../features/tracking/TrackingProvider';

export { ErrorBoundary } from 'expo-router';

function Routes() {
  const { session, ready } = useAuthStore();
  const { colors, dark } = useTheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restoring session" color={colors.primary} /></View>;
  return <>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <Stack id={undefined} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="+not-found" />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><AuthProvider><TrackingProvider><Routes /></TrackingProvider></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}
