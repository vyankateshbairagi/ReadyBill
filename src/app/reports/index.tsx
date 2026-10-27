import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { AppHeader } from '../../components/common/AppHeader';
import { AppNavigation } from '../../components/common/AppNavigation';
import {
  Button,
  Input,
  Badge,
  EmptyState,
  Modal,
} from '../../components/ui';

interface SummaryReport {
  date?: string;
  from?: string;
  to?: string;
  month?: string;
  year?: number;
  totalInvoices: number;
  revenue: number;
  discount: number;
  netRevenue: number;
}

interface TopProduct {
  id: string;
  name: string;
  code: string;
  category: string;
  soldQuantity: number;
  revenue: number;
}

interface TopCustomer {
  id: string;
  name: string;
  mobile: string;
  balance: number;
  totalInvoices: number;
  totalSpent: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  code: string;
  category: string;
  stock: number;
  price: number;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
type TabSection = 'summary' | 'products' | 'customers' | 'lowstock';

export default function ReportsScreen() {
  const router = useRouter();

  // State
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [activeTab, setActiveTab] = useState<TabSection>('summary');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Custom date range state
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Report Data
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  // Fetch Report Data based on selected period
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch period summary
      let summaryUrl = '/reports/daily';
      if (period === 'weekly') summaryUrl = '/reports/weekly';
      else if (period === 'monthly') summaryUrl = '/reports/monthly';
      else if (period === 'custom') {
        summaryUrl = `/reports/date-range?from=${customFrom}&to=${customTo}`;
      }

      const [summaryRes, productsRes, customersRes, lowStockRes] = await Promise.all([
        api.get<any>(summaryUrl),
        api.get<TopProduct[]>('/reports/top-products'),
        api.get<TopCustomer[]>('/reports/top-customers'),
        api.get<LowStockProduct[]>('/reports/low-stock'),
      ]);

      // If custom date range returns sales array, aggregate summary
      if (period === 'custom' && Array.isArray(summaryRes.data)) {
        const sales = summaryRes.data;
        const rev = sales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
        const disc = sales.reduce((sum: number, s: any) => sum + (Number(s.discount) || 0), 0);
        setSummaryReport({
          from: customFrom,
          to: customTo,
          totalInvoices: sales.length,
          revenue: rev,
          discount: disc,
          netRevenue: rev,
        });
      } else {
        setSummaryReport(summaryRes.data);
      }

      setTopProducts(productsRes.data || []);
      setTopCustomers(customersRes.data || []);
      setLowStock(lowStockRes.data || []);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load reports',
        text2: err.response?.data?.message || 'Check backend connection.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  // Calculations
  const averageOrderValue = useMemo(() => {
    if (!summaryReport || summaryReport.totalInvoices === 0) return 0;
    return Math.round(summaryReport.revenue / summaryReport.totalInvoices);
  }, [summaryReport]);

  const periodLabel = useMemo(() => {
    if (period === 'daily') return "Today's Performance";
    if (period === 'weekly') return 'Last 7 Days';
    if (period === 'monthly') {
      return summaryReport?.month ? `${summaryReport.month} ${summaryReport.year || ''}` : 'This Month';
    }
    return `${customFrom} to ${customTo}`;
  }, [period, summaryReport, customFrom, customTo]);

  // WhatsApp Executive Summary Share
  const handleShareWhatsApp = () => {
    const topProd = topProducts[0]?.name ? `${topProducts[0].name} (${topProducts[0].soldQuantity} sold)` : 'N/A';
    const topCust = topCustomers[0]?.name ? `${topCustomers[0].name} (₹${topCustomers[0].totalSpent.toLocaleString('en-IN')})` : 'N/A';

    const msg = [
      `📊 *READYBILL RETAIL — EXECUTIVE REPORT*`,
      `📅 Period: *${periodLabel}*`,
      `---------------------------------------`,
      `💰 *Total Revenue:* ₹${(summaryReport?.revenue || 0).toLocaleString('en-IN')}`,
      `🧾 *Invoices Generated:* ${summaryReport?.totalInvoices || 0}`,
      `🏷️ *Discounts Given:* ₹${(summaryReport?.discount || 0).toLocaleString('en-IN')}`,
      `📈 *Average Order Value:* ₹${averageOrderValue.toLocaleString('en-IN')}`,
      `---------------------------------------`,
      `⭐ *Top Product:* ${topProd}`,
      `👑 *Top Customer:* ${topCust}`,
      `⚠️ *Low Stock Items:* ${lowStock.length} items need replenishment`,
      `---------------------------------------`,
      `Generated by ReadyBill Retail Intelligence POS`,
    ].join('\n');

    const encoded = encodeURIComponent(msg);
    const url =
      Platform.OS === 'web'
        ? `https://wa.me/?text=${encoded}`
        : `whatsapp://send?text=${encoded}`;

    Linking.openURL(url).catch(() => {
      Share.share({ message: msg });
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += '--- READYBILL EXECUTIVE SALES REPORT ---\n';
      csvContent += `Period,${periodLabel}\n`;
      csvContent += `Total Revenue,${summaryReport?.revenue || 0}\n`;
      csvContent += `Total Invoices,${summaryReport?.totalInvoices || 0}\n`;
      csvContent += `Total Discount,${summaryReport?.discount || 0}\n`;
      csvContent += `Average Order Value,${averageOrderValue}\n\n`;

      csvContent += '--- TOP SELLING PRODUCTS ---\n';
      csvContent += 'Product Code,Product Name,Category,Sold Quantity,Revenue Generated\n';
      topProducts.forEach((p) => {
        csvContent += `"${p.code}","${p.name}","${p.category}",${p.soldQuantity},${p.revenue}\n`;
      });

      csvContent += '\n--- TOP CUSTOMERS ---\n';
      csvContent += 'Customer Name,Mobile,Total Invoices,Total Spent,Current Khata Balance\n';
      topCustomers.forEach((c) => {
        csvContent += `"${c.name}","${c.mobile}",${c.totalInvoices},${c.totalSpent},${c.balance}\n`;
      });

      csvContent += '\n--- LOW STOCK ALERTS ---\n';
      csvContent += 'Product Code,Product Name,Category,Current Stock,Unit Price\n';
      lowStock.forEach((p) => {
        csvContent += `"${p.code}","${p.name}","${p.category}",${p.stock},${p.price}\n`;
      });

      if (Platform.OS === 'web') {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `readybill_report_${period}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Share.share({
          message: csvContent.replace('data:text/csv;charset=utf-8,', ''),
          title: `readybill_report_${period}.csv`,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Report Exported',
        text2: 'CSV report downloaded / prepared successfully.',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: 'Unable to prepare CSV document.',
      });
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Reports & Analytics"
        subtitle="Sales, Revenue & Inventory Intelligence"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Period Selector Tabs */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'daily' && styles.periodTabActive]}
            onPress={() => setPeriod('daily')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'daily' && styles.periodTabTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'weekly' && styles.periodTabActive]}
            onPress={() => setPeriod('weekly')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'weekly' && styles.periodTabTextActive,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'monthly' && styles.periodTabActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'monthly' && styles.periodTabTextActive,
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'custom' && styles.periodTabActive]}
            onPress={() => setPeriod('custom')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'custom' && styles.periodTabTextActive,
              ]}
            >
              Custom Range
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Range Picker Inputs if selected */}
        {period === 'custom' && (
          <View style={styles.customDateBox}>
            <View style={{ flex: 1 }}>
              <Input
                label="From Date (YYYY-MM-DD)"
                value={customFrom}
                onChangeText={setCustomFrom}
                placeholder="2026-10-01"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="To Date (YYYY-MM-DD)"
                value={customTo}
                onChangeText={setCustomTo}
                placeholder="2026-10-27"
              />
            </View>
            <Button
              title="Filter"
              variant="primary"
              size="sm"
              onPress={fetchReportData}
              style={{ marginBottom: 16 }}
            />
          </View>
        )}

        {/* Executive Action Bar: Share & Export */}
        <View style={styles.reportActionsRow}>
          <TouchableOpacity
            style={styles.actionBtnWhatsApp}
            onPress={handleShareWhatsApp}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnIcon}>💬</Text>
            <Text style={styles.actionBtnTextWhatsApp}>WhatsApp Summary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnCSV}
            onPress={handleExportCSV}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnIcon}>📥</Text>
            <Text style={styles.actionBtnTextCSV}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Computing Analytics & KPIs...</Text>
          </View>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              {/* Total Revenue */}
              <View style={[styles.kpiCard, styles.kpiCardHighlight]}>
                <Text style={styles.kpiLabel}>TOTAL REVENUE</Text>
                <Text style={[styles.kpiValue, { color: COLORS.info }]}>
                  ₹{(summaryReport?.revenue || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.kpiSubtitle}>{periodLabel}</Text>
              </View>

              {/* Invoices Count */}
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>BILLS GENERATED</Text>
                <Text style={styles.kpiValue}>
                  {summaryReport?.totalInvoices || 0}
                </Text>
                <Text style={styles.kpiSubtitle}>Transactions completed</Text>
              </View>

              {/* Average Order Value */}
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>AVERAGE ORDER VALUE</Text>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                  ₹{averageOrderValue.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.kpiSubtitle}>Per customer invoice</Text>
              </View>

              {/* Total Discount */}
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>DISCOUNTS GIVEN</Text>
                <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
                  ₹{(summaryReport?.discount || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.kpiSubtitle}>Customer concessions</Text>
              </View>
            </View>

            {/* Sub-Section Navigation Tabs */}
            <View style={styles.subTabsRow}>
              <TouchableOpacity
                style={[styles.subTab, activeTab === 'summary' && styles.subTabActive]}
                onPress={() => setActiveTab('summary')}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeTab === 'summary' && styles.subTabTextActive,
                  ]}
                >
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTab, activeTab === 'products' && styles.subTabActive]}
                onPress={() => setActiveTab('products')}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeTab === 'products' && styles.subTabTextActive,
                  ]}
                >
                  Top Products ({topProducts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTab, activeTab === 'customers' && styles.subTabActive]}
                onPress={() => setActiveTab('customers')}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeTab === 'customers' && styles.subTabTextActive,
                  ]}
                >
                  VIP Customers ({topCustomers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTab, activeTab === 'lowstock' && styles.subTabActiveWarning]}
                onPress={() => setActiveTab('lowstock')}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeTab === 'lowstock' && styles.subTabTextActiveWarning,
                  ]}
                >
                  ⚠️ Low Stock ({lowStock.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* ========================================================= */}
            {/* TAB CONTENT 1: OVERVIEW SUMMARY                           */}
            {/* ========================================================= */}
            {activeTab === 'summary' && (
              <View style={styles.sectionContainer}>
                {/* Fast Snapshot Card */}
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotHeading}>Store Health & Velocity</Text>
                  <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotKey}>Gross Revenue</Text>
                    <Text style={styles.snapshotVal}>
                      ₹{(summaryReport?.revenue || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotKey}>Total Invoices</Text>
                    <Text style={styles.snapshotVal}>
                      {summaryReport?.totalInvoices || 0} bills
                    </Text>
                  </View>
                  <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotKey}>Discounts Passed</Text>
                    <Text style={[styles.snapshotVal, { color: '#F59E0B' }]}>
                      -₹{(summaryReport?.discount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotNetKey}>Net Store Revenue</Text>
                    <Text style={styles.snapshotNetVal}>
                      ₹{((summaryReport?.revenue || 0) - (summaryReport?.discount || 0)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Quick Leaders Preview */}
                <Text style={styles.sectionTitle}>Performance Leaders</Text>
                <View style={styles.leadersRow}>
                  {topProducts.length > 0 && (
                    <View style={styles.leaderBox}>
                      <Text style={styles.leaderLabel}>⭐ BESTSELLER</Text>
                      <Text style={styles.leaderName} numberOfLines={1}>
                        {topProducts[0].name}
                      </Text>
                      <Text style={styles.leaderMetric}>
                        {topProducts[0].soldQuantity} units sold
                      </Text>
                    </View>
                  )}

                  {topCustomers.length > 0 && (
                    <View style={styles.leaderBox}>
                      <Text style={styles.leaderLabel}>👑 TOP SPENDER</Text>
                      <Text style={styles.leaderName} numberOfLines={1}>
                        {topCustomers[0].name}
                      </Text>
                      <Text style={styles.leaderMetric}>
                        ₹{topCustomers[0].totalSpent.toLocaleString('en-IN')} spent
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* TAB CONTENT 2: TOP PRODUCTS                               */}
            {/* ========================================================= */}
            {activeTab === 'products' && (
              <View style={styles.sectionContainer}>
                {topProducts.length === 0 ? (
                  <EmptyState
                    icon="📦"
                    title="No Sales Data Yet"
                    description="Sell items in POS Billing to see top-performing inventory items."
                  />
                ) : (
                  topProducts.map((p, idx) => (
                    <View key={p.id || idx} style={styles.tableRowCard}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowMainText}>{p.name}</Text>
                        <View style={styles.rowSubRow}>
                          <Badge label={p.category || 'General'} variant="neutral" size="sm" />
                          <Text style={styles.rowSubText}>SKU: {p.code}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.rowQuantityText}>
                          {p.soldQuantity} units sold
                        </Text>
                        {p.revenue ? (
                          <Text style={styles.rowRevenueText}>
                            ₹{Number(p.revenue).toLocaleString('en-IN')}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ========================================================= */}
            {/* TAB CONTENT 3: TOP CUSTOMERS                              */}
            {/* ========================================================= */}
            {activeTab === 'customers' && (
              <View style={styles.sectionContainer}>
                {topCustomers.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title="No Customer Sales Recorded"
                    description="Link customers when generating POS bills to track your top VIP shoppers."
                  />
                ) : (
                  topCustomers.map((c, idx) => (
                    <View key={c.id || idx} style={styles.tableRowCard}>
                      <View style={[styles.rankBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Text style={[styles.rankText, { color: COLORS.info }]}>#{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowMainText}>{c.name}</Text>
                        <Text style={styles.rowSubText}>📞 +91 {c.mobile}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.rowRevenueText}>
                          ₹{Number(c.totalSpent).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.rowQuantityText}>
                          {c.totalInvoices} bills generated
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ========================================================= */}
            {/* TAB CONTENT 4: LOW STOCK RISKS                            */}
            {/* ========================================================= */}
            {activeTab === 'lowstock' && (
              <View style={styles.sectionContainer}>
                {lowStock.length === 0 ? (
                  <EmptyState
                    icon="🎉"
                    title="Inventory Healthy"
                    description="All products currently have stock levels above the safety threshold (10 units)."
                  />
                ) : (
                  lowStock.map((item) => (
                    <View key={item.id} style={styles.lowStockRowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowMainText}>{item.name}</Text>
                        <View style={styles.rowSubRow}>
                          <Badge label={item.category} variant="neutral" size="sm" />
                          <Text style={styles.rowSubText}>SKU: {item.code}</Text>
                          <Text style={styles.rowSubText}>₹{item.price}</Text>
                        </View>
                      </View>
                      <View style={styles.stockAlertBadge}>
                        <Text style={styles.stockAlertNum}>{item.stock}</Text>
                        <Text style={styles.stockAlertUnit}>LEFT IN STOCK</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AppNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: COLORS.primary,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  periodTabTextActive: {
    color: '#FFF',
  },
  customDateBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    backgroundColor: COLORS.bgCard,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  reportActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtnWhatsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  actionBtnTextWhatsApp: {
    color: '#34D399',
    fontWeight: '700',
    fontSize: 12,
  },
  actionBtnCSV: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 6,
  },
  actionBtnTextCSV: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  actionBtnIcon: {
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    flex: 1,
    minWidth: 145,
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  kpiCardHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  kpiSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  subTabsRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    paddingBottom: 8,
    marginBottom: 14,
  },
  subTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  subTabActiveWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subTabTextActive: {
    color: COLORS.info,
    fontWeight: '800',
  },
  subTabTextActiveWarning: {
    color: COLORS.danger,
    fontWeight: '800',
  },
  sectionContainer: {
    marginTop: 4,
  },
  snapshotCard: {
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 16,
  },
  snapshotHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  snapshotKey: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  snapshotVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 10,
  },
  snapshotNetKey: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  snapshotNetVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10B981',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  leadersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  leaderBox: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  leaderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  leaderMetric: {
    fontSize: 11,
    color: COLORS.info,
    fontWeight: '600',
  },
  tableRowCard: {
    backgroundColor: COLORS.bgCard,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  rowMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rowSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rowSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  rowQuantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.info,
  },
  rowRevenueText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  lowStockRowCard: {
    backgroundColor: COLORS.bgCard,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockAlertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  stockAlertNum: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.danger,
  },
  stockAlertUnit: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
});
