import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  prefix,
  suffix,
  onClear,
  containerStyle,
  inputStyle,
  value,
  editable = true,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredAsterisk}> *</Text>}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
        ]}
      >
        {prefix && <View style={styles.prefixContainer}>{prefix}</View>}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor="#64748B"
          value={value}
          editable={editable}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />

        {onClear && value && editable ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}

        {suffix && <View style={styles.suffixContainer}>{suffix}</View>}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  requiredAsterisk: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: COLORS.primaryLight,
    shadowColor: COLORS.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: '#0F172A80',
  },
  prefixContainer: {
    marginRight: 8,
  },
  suffixContainer: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.dangerLight,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
