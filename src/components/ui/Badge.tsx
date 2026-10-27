import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: COLORS.successBg,
          text: COLORS.successLight,
          border: '#10B98140',
          dot: COLORS.success,
        };
      case 'warning':
        return {
          bg: COLORS.warningBg,
          text: COLORS.warningLight,
          border: '#F59E0B40',
          dot: COLORS.warning,
        };
      case 'danger':
        return {
          bg: COLORS.dangerBg,
          text: COLORS.dangerLight,
          border: '#EF444440',
          dot: COLORS.danger,
        };
      case 'info':
        return {
          bg: COLORS.infoBg,
          text: COLORS.infoLight,
          border: '#38BDF840',
          dot: COLORS.info,
        };
      case 'purple':
        return {
          bg: COLORS.purpleBg,
          text: '#C084FC',
          border: '#8B5CF640',
          dot: COLORS.purple,
        };
      case 'neutral':
      default:
        return {
          bg: '#33415550',
          text: COLORS.textSecondary,
          border: COLORS.borderDark,
          dot: COLORS.textMuted,
        };
    }
  };

  const v = getVariantStyles();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 10,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: v.dot, width: isSm ? 5 : 6, height: isSm ? 5 : 6 },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: v.text,
            fontSize: isSm ? 10 : 12,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 99,
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
