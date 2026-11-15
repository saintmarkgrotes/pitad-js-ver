import { useColorScheme } from 'react-native';
import { palettes, radius, spacing, typography } from './tokens';

export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? palettes.dark : palettes.light, dark, radius, spacing, typography };
}
