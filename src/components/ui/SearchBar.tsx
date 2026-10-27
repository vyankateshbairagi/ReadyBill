import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search by name, code or mobile...',
  onClear,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    width: '100%',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
    backgroundColor: '#334155',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
});
