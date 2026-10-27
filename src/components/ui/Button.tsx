import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  children,
}) => {
  const isInteractive = !loading && !disabled;

  const getVariantStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          button: {
            backgroundColor: COLORS.bgCardHover,
            borderColor: COLORS.borderDark,
            borderWidth: 1,
          },
          text: { color: COLORS.textPrimary },
        };
      case 'success':
        return {
          button: {
            backgroundColor: COLORS.success,
            borderColor: COLORS.success,
          },
          text: { color: COLORS.white },
        };
      case 'danger':
        return {
          button: {
            backgroundColor: COLORS.danger,
            borderColor: COLORS.danger,
          },
          text: { color: COLORS.white },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderColor: COLORS.borderDark,
            borderWidth: 1,
          },
          text: { color: COLORS.textPrimary },
        };
      case 'ghost':
        return {
          button: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
          text: { color: COLORS.info },
        };
      case 'primary':
      default:
        return {
          button: {
            backgroundColor: COLORS.primary,
            borderColor: COLORS.primary,
          },
          text: { color: COLORS.white },
        };
    }
  };

  const getSizeStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
          text: { fontSize: 13, fontWeight: '600' },
        };
      case 'lg':
        return {
          button: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14 },
          text: { fontSize: 16, fontWeight: '700' },
        };
      case 'md':
      default:
        return {
          button: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
          text: { fontSize: 14, fontWeight: '600' },
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={isInteractive ? onPress : undefined}
      activeOpacity={0.75}
      disabled={!isInteractive}
      style={[
        styles.baseButton,
        vStyle.button,
        sStyle.button,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={vStyle.text.color || COLORS.white}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          {title ? (
            <Text style={[styles.baseText, vStyle.text, sStyle.text, textStyle]}>
              {title}
            </Text>
          ) : (
            children
          )}
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
