import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { Label } from './ui';
import { useTheme } from '../../theme/useTheme';

export function NavLink({ href, children }) {
  const { colors } = useTheme();
  return <Link href={href} asChild><Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
    <Label style={{ color: colors.primary, fontWeight: '600' }}>{children}</Label>
  </Pressable></Link>;
}
