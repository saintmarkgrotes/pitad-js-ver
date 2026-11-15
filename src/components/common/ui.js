import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, MoveUpRight } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

/** @param {{ children: import('react').ReactNode, style?: import('react-native').StyleProp<import('react-native').TextStyle>, variant?: string, muted?: boolean }} props */
export function Label({ children, style, variant = 'body', muted = false }) {
  const { colors, typography } = useTheme();
  return <Text style={[typography[variant], { color: muted ? colors.muted : colors.text }, style]}>{children}</Text>;
}

export function Screen({ children, keyboard = false }) {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboard && Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl + spacing.sm }}>
          <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', flex: 1, gap: spacing.lg }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand() {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <MoveUpRight color={colors.primary} size={26} strokeWidth={3} />
    <Label style={{ fontSize: 23, fontWeight: '900', letterSpacing: 4 }}>pitad</Label>
  </View>;
}

export function Card({ children, style = {} }) {
  const { colors, spacing, radius } = useTheme();
  return <View style={[{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md }, style]}>{children}</View>;
}

export function Button({ title, onPress, loading = false, disabled = false, secondary = false }) {
  const { colors, radius } = useTheme();
  const inactive = loading || disabled;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }}
    disabled={inactive} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 54, borderRadius: radius.input, padding: 15, alignItems: 'center', justifyContent: 'center',
      backgroundColor: secondary ? colors.surface : colors.primary, borderWidth: secondary ? 1 : 0,
      borderColor: colors.border, opacity: inactive ? 0.55 : pressed ? 0.8 : 1 })}>
    {loading ? <ActivityIndicator accessibilityLabel="Working" color={secondary ? colors.primary : colors.onPrimary} />
      : <Label style={{ fontWeight: '700', color: secondary ? colors.text : colors.onPrimary }}>{title}</Label>}
  </Pressable>;
}

/** @param {import('react-native').TextInputProps & { label: string, error?: string, password?: boolean }} props */
export function Field({ label, error, password = false, ...props }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: 8 }}>
    <Label style={{ fontSize: 14, fontWeight: '600' }}>{label}</Label>
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1,
      borderColor: error ? colors.danger : colors.border, borderRadius: 10 }}>
      <TextInput {...props} autoCorrect={password ? false : props.autoCorrect} accessibilityLabel={label} secureTextEntry={password && !visible}
        placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 54, padding: 16, fontSize: 16, color: colors.text }} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        onPress={() => setVisible(!visible)} style={{ padding: 14, minHeight: 48, minWidth: 48 }}>
        {visible ? <EyeOff color={colors.muted} size={20} /> : <Eye color={colors.muted} size={20} />}
      </Pressable>}
    </View>
    {!!error && <Notice error text={error} />}
  </View>;
}

export function Notice({ text, error = false }) {
  const { colors } = useTheme();
  if (!text) return null;
  return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={{ padding: 14, borderRadius: 10, backgroundColor: error ? colors.dangerSurface : colors.tint }}>
    <Label variant="caption" style={{ color: error ? colors.danger : colors.text }}>{text}</Label>
  </View>;
}

export function PageHeading({ eyebrow, title, description = '' }) {
  const { colors } = useTheme();
  return <View style={{ gap: 10 }}>
    <Label variant="label" style={{ color: colors.primary }}>{eyebrow}</Label>
    <Label variant="title">{title}</Label>
    {!!description && <Label muted>{description}</Label>}
  </View>;
}
