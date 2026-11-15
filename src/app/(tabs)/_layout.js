import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, Compass, House, Play, UserRound } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();
  return <Tabs id={undefined} screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarHideOnKeyboard: true }}>
    <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
    <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
    <Tabs.Screen name="record" options={{ title: 'Record', tabBarIcon: () => <View style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 7 }}><Play size={21} color={colors.onPrimary} fill={colors.onPrimary} /></View> }} />
    <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <ChartNoAxesColumnIncreasing color={color} size={size} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
  </Tabs>;
}
