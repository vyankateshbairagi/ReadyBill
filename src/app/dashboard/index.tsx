import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../store/authStore';
import { api, API_BASE_URL } from '../../services/api';
import { AppNavigation } from '../../components/common';

interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockProducts: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, salesRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/recent-sales').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setRecentSales(salesRes.data || []);
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    Toast.show({
      type: 'info',
      text1: 'Signed Out',
      text2: 'You have been logged out securely.',
    });
    router.replace('/auth/login');
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'OWNER':
        return { bg: '#8B5CF625', text: '#A78BFA', border: '#8B5CF650' };
      case 'MANAGER':
        return { bg: '#3B82F625', text: '#60A5FA', border: '#3B82F650' };
      default:
        return { bg: '#10B98125', text: '#34D399', border: '#10B98150' };
    }
  };

  const roleStyle = getRoleBadgeStyle(user?.role);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            tintColor="#38BDF8"
          />
        }
      >
        {/* Top Navbar */}
        <View style={styles.navBar}>
          <View>
            <Text style={styles.brandTitle}>ReadyBill</Text>
            <Text style={styles.brandTagline}>POS & Smart Khata</Text>
          </View>

          <View style={styles.userSection}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: roleStyle.bg, borderColor: roleStyle.border },
              ]}
            >
              <Text style={[styles.roleText, { color: roleStyle.text }]}>
                {user?.role || 'USER'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings' as any)}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeGreeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Store User'}</Text>
          <Text style={styles.userMobile}>📞 +91 {user?.mobile || '----------'}</Text>
        </View>

        {/* Connection Status Pill */}
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: apiConnected ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text style={styles.statusText}>
            {apiConnected === null
              ? 'Checking API...'
              : apiConnected
              ? `Connected: ${API_BASE_URL}`
              : `Offline or Unreachable: ${API_BASE_URL}`}
          </Text>
        </View>

        {/* Metric Cards Grid */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Loading Dashboard KPIs...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {/* Revenue */}
            <View style={[styles.card, styles.cardAccentPrimary]}>
              <Text style={styles.cardLabel}>TODAY'S REVENUE</Text>
              <Text style={styles.cardValue}>
                ₹{Number(stats?.todayRevenue || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.cardSubtitle}>
                From {stats?.todaySales || 0} bills completed
              </Text>
            </View>

            {/* Total Invoices */}
            <View style={[styles.card, styles.cardAccentSecondary]}>
              <Text style={styles.cardLabel}>BILLS GENERATED</Text>
              <Text style={styles.cardValue}>{stats?.todaySales || 0}</Text>
              <Text style={styles.cardSubtitle}>Total sales recorded today</Text>
            </View>

            {/* Products */}
            <View style={[styles.card, styles.cardAccentTertiary]}>
              <Text style={styles.cardLabel}>TOTAL PRODUCTS</Text>
              <Text style={styles.cardValue}>{stats?.totalProducts || 0}</Text>
              <Text style={styles.cardSubtitle}>Items in inventory catalog</Text>
            </View>

            {/* Low Stock Alerts */}
            <View
              style={[
                styles.card,
                stats && stats.lowStockProducts > 0
                  ? styles.cardAccentDanger
                  : styles.cardAccentSuccess,
              ]}
            >
              <Text style={styles.cardLabel}>LOW STOCK ALERTS</Text>
              <Text style={styles.cardValue}>
                {stats?.lowStockProducts || 0}
              </Text>
              <Text style={styles.cardSubtitle}>
                {stats && stats.lowStockProducts > 0
                  ? 'Products with stock ≤ 10'
                  : 'All inventory healthy'}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Launchpad */}
        <Text style={styles.sectionTitle}>Quick Modules</Text>
        <View style={styles.moduleGrid}>
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/billing' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>🧾</Text>
            <Text style={styles.moduleName}>New Bill (POS)</Text>
            <Text style={[styles.moduleStatus, { color: '#60A5FA' }]}>Create Invoices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/products' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>📦</Text>
            <Text style={styles.moduleName}>Inventory</Text>
            <Text style={[styles.moduleStatus, { color: '#34D399' }]}>Manage Catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/customers' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>👥</Text>
            <Text style={styles.moduleName}>Customer Khata</Text>
            <Text style={[styles.moduleStatus, { color: '#38BDF8' }]}>View Ledger & Due</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/payments' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>💳</Text>
            <Text style={styles.moduleName}>Payments & Udhari</Text>
            <Text style={[styles.moduleStatus, { color: '#10B981' }]}>Cash / UPI Collections</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/reports' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>📊</Text>
            <Text style={styles.moduleName}>Reports & Analytics</Text>
            <Text style={[styles.moduleStatus, { color: '#F59E0B' }]}>Sales & Top Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>⚙️</Text>
            <Text style={styles.moduleName}>Settings & Staff</Text>
            <Text style={[styles.moduleStatus, { color: '#A78BFA' }]}>Shop & Roles</Text>
          </TouchableOpacity>
        </View>

        {/* Live Recent Invoices Feed */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          <TouchableOpacity onPress={() => router.push('/billing' as any)}>
            <Text style={styles.viewAllText}>+ New Bill</Text>
          </TouchableOpacity>
        </View>

        {recentSales.length === 0 ? (
          <View style={styles.emptyRecentCard}>
            <Text style={styles.emptyRecentText}>No sales recorded yet today.</Text>
            <TouchableOpacity
              style={styles.createFirstBillBtn}
              onPress={() => router.push('/billing' as any)}
            >
              <Text style={styles.createFirstBillText}>+ Start POS Billing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentSales.slice(0, 5).map((sale) => (
              <TouchableOpacity
                key={sale.id}
                style={styles.recentSaleCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/billing/${sale.id}` as any)}
              >
                <View style={styles.recentLeft}>
                  <View style={styles.recentIconBox}>
                    <Text style={styles.recentIcon}>🧾</Text>
                  </View>
                  <View>
                    <Text style={styles.recentInvoiceNo}>#{sale.invoiceNo}</Text>
                    <Text style={styles.recentCustomer}>
                      {sale.customer?.name || 'Walk-in Customer'}
                    </Text>
                  </View>
                </View>

                <View style={styles.recentRight}>
                  <Text style={styles.recentAmount}>
                    ₹{Number(sale.total).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.recentReceiptLink}>Receipt ❯</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      <AppNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingsButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsIcon: {
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  welcomeGreeting: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  userMobile: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B80',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardAccentPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  cardAccentSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: '#818CF8',
  },
  cardAccentTertiary: {
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
  },
  cardAccentSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#34D399',
  },
  cardAccentDanger: {
    borderLeftWidth: 4,
    borderLeftColor: '#F87171',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 6,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  moduleIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  moduleStatus: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
    marginTop: 4,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  viewAllText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyRecentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyRecentText: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 12,
  },
  createFirstBillBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createFirstBillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recentList: {
    gap: 8,
  },
  recentSaleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentIcon: {
    fontSize: 16,
  },
  recentInvoiceNo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  recentCustomer: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  recentReceiptLink: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
});