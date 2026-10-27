import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { Badge } from '../ui/Badge';
import { useAuthStore } from '../../store/authStore';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();
  const { user } = useAuthStore();

  const getRoleVariant = (role?: string) => {
    switch (role) {
      case 'OWNER':
        return 'purple';
      case 'MANAGER':
        return 'info';
      case 'CASHIER':
      default:
        return 'success';
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}

        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction ? (
          rightAction
        ) : user ? (
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <Badge
              label={user.role}
              variant={getRoleVariant(user.role)}
              size="sm"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    maxWidth: 120,
  },
});
