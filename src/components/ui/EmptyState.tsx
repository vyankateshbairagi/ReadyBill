import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionTitle && onAction && (
        <View style={styles.actionContainer}>
          <Button title={actionTitle} onPress={onAction} size="sm" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  icon: {
    fontSize: 42,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: 16,
  },
});
