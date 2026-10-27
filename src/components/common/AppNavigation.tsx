import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../../constants/colors';

interface NavItem {
  name: string;
  route: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', route: '/dashboard', icon: '📊' },
  { name: 'POS Bill', route: '/billing', icon: '🧾' },
  { name: 'Inventory', route: '/products', icon: '📦' },
  { name: 'Khata', route: '/customers', icon: '👥' },
  { name: 'Payments', route: '/payments', icon: '💳' },
];

export const AppNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, isWeb ? styles.containerWeb : styles.containerMobile]}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.route || pathname.startsWith(item.route + '/');

        return (
          <TouchableOpacity
            key={item.route}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {item.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.borderDark,
    zIndex: 50,
  },
  containerMobile: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
  },
  containerWeb: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.65,
  },
  iconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  labelActive: {
    color: COLORS.info,
    fontWeight: '700',
  },
});
