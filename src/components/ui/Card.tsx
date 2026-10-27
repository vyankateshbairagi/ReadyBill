import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export interface CardProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  accentColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerRight,
  footer,
  accentColor,
  onPress,
  style,
  children,
}) => {
  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[
        styles.card,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
        style,
      ]}
    >
      {(title || subtitle || headerRight) && (
        <View style={styles.header}>
          <View style={styles.titleColumn}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      {children && <View style={styles.content}>{children}</View>}

      {footer && <View style={styles.footer}>{footer}</View>}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleColumn: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  content: {
    width: '100%',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
});
