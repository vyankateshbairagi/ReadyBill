import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { AppHeader } from '../../components/common';
import { Button, Card, Badge, Modal } from '../../components/ui';
import { useSettingsStore } from '../../store/settingsStore';

export interface SaleDetail {
  id: string;
  invoiceNo: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    balance: number;
  } | null;
  user: {
    id: string;
    name: string;
    mobile: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    total: number;
    product: {
      id: string;
      name: string;
      code?: string | null;
      category?: string | null;
    };
  }>;
}

export default function InvoiceReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const settings = useSettingsStore();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Void modal state
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const fetchSale = async () => {
    if (!id) return;

    try {
      const response = await api.get(`/sales/${id}`);
      setSale(response.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load invoice',
        text2: err.response?.data?.message || 'Invoice not found.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
  }, [id]);

  // Print Action
  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      Alert.alert(
        'Print Invoice',
        `Invoice #${sale?.invoiceNo} ready for thermal/PDF printing. Connected printer required.`
      );
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!sale) return;

    const itemsSummary = sale.items
      .map(
        (i, idx) =>
          `${idx + 1}. ${i.product.name} x ${i.quantity} = ₹${i.total.toFixed(2)}`
      )
      .join('\n');

    const customerText = sale.customer
      ? `Customer: ${sale.customer.name} (${sale.customer.mobile})`
      : 'Customer: Walk-in';

    const text = `*${settings.shopName.toUpperCase()} — INVOICE #${sale.invoiceNo}*\n` +
      `Date: ${new Date(sale.createdAt).toLocaleDateString('en-IN')}\n` +
      `${customerText}\n` +
      `Billed By: ${sale.user.name}\n\n` +
      `*ITEMS:*\n${itemsSummary}\n\n` +
      `Subtotal: ₹${sale.subtotal.toFixed(2)}\n` +
      (sale.discount > 0 ? `Discount: -₹${sale.discount.toFixed(2)}\n` : '') +
      `*Grand Total: ₹${sale.total.toFixed(2)}*\n\n` +
      `${settings.invoiceFooterNote}`;

    const phone = sale.customer?.mobile ? `91${sale.customer.mobile}` : '';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    Linking.openURL(url).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Could not open WhatsApp',
        text2: 'Please ensure WhatsApp is installed or valid browser access.',
      });
    });
  };

  // Void/Cancel invoice
  const handleVoidSale = async () => {
    if (!sale) return;

    try {
      setVoiding(true);
      await api.delete(`/sales/${sale.id}`);
      Toast.show({
        type: 'success',
        text1: 'Invoice Voided',
        text2: `Invoice #${sale.invoiceNo} cancelled and stock restored.`,
      });
      setVoidModalVisible(false);
      router.replace('/billing' as any);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to void invoice',
        text2: err.response?.data?.message || 'Check connection.',
      });
    } finally {
      setVoiding(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`Invoice #${sale?.invoiceNo || 'Receipt'}`}
        subtitle="Sales Bill Receipt"
        showBack
        rightAction={
          <View style={styles.headerBtnRow}>
            <Button
              title="💬 WhatsApp"
              variant="outline"
              size="sm"
              onPress={handleShareWhatsApp}
            />
            <Button
              title="🖨️ Print"
              variant="primary"
              size="sm"
              onPress={handlePrint}
            />
          </View>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Generating Receipt...</Text>
        </View>
      ) : !sale ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invoice not found.</Text>
          <Button title="Back to Billing" onPress={() => router.replace('/billing' as any)} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Printable Receipt Paper Card */}
          <View style={styles.receiptCard}>
            {/* Store Branding Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.storeName}>{settings.shopName}</Text>
              <Text style={styles.storeAddress}>
                {settings.shopAddress || settings.shopTagline}
              </Text>
              {settings.shopGstin ? (
                <Text style={styles.storeAddress}>GSTIN: {settings.shopGstin}</Text>
              ) : null}
              <Text style={styles.receiptTitlePill}>TAX INVOICE / CASH BILL</Text>
            </View>

            {/* Info Grid */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Invoice No:</Text>
                <Text style={styles.infoValueInvoice}>{sale.invoiceNo}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date & Time:</Text>
                <Text style={styles.infoValue}>{formatDate(sale.createdAt)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cashier / Staff:</Text>
                <Text style={styles.infoValue}>{sale.user?.name || 'Cashier'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer:</Text>
                <Text style={styles.infoValue}>
                  {sale.customer
                    ? `${sale.customer.name} (📞 +91 ${sale.customer.mobile})`
                    : 'Walk-in Customer (Cash)'}
                </Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            {/* Line Items Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 0.5 }]}>#</Text>
              <Text style={[styles.thText, { flex: 2.5 }]}>ITEM</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>QTY</Text>
              <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>RATE</Text>
              <Text style={[styles.thText, { flex: 1.4, textAlign: 'right' }]}>AMOUNT</Text>
            </View>

            {/* Line Items List */}
            {sale.items.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tdText, { flex: 0.5, color: '#64748B' }]}>
                  {index + 1}
                </Text>
                <View style={{ flex: 2.5 }}>
                  <Text style={styles.tdTextBold}>{item.product.name}</Text>
                  {item.product.code ? (
                    <Text style={styles.itemCodeSub}>SKU: {item.product.code}</Text>
                  ) : null}
                </View>
                <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.tdText, { flex: 1.2, textAlign: 'right' }]}>
                  ₹{item.price.toFixed(2)}
                </Text>
                <Text style={[styles.tdTextBold, { flex: 1.4, textAlign: 'right' }]}>
                  ₹{item.total.toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.receiptDivider} />

            {/* Financial Summary */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{sale.subtotal.toFixed(2)}</Text>
              </View>

              {sale.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: COLORS.dangerLight }]}>
                    Discount
                  </Text>
                  <Text style={[styles.summaryValue, { color: COLORS.dangerLight }]}>
                    -₹{sale.discount.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.grandTotalBox}>
                <Text style={styles.grandTotalLabel}>TOTAL PAID / DUE</Text>
                <Text style={styles.grandTotalValue}>
                  ₹{sale.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {sale.customer && (
                <View style={styles.customerBalanceNote}>
                  <Text style={styles.customerBalanceText}>
                    📝 Linked to {sale.customer.name}'s Khata account. Updated Balance:{' '}
                    <Text style={{ fontWeight: '800' }}>
                      ₹{sale.customer.balance.toLocaleString('en-IN')}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Receipt Footer Message */}
            <View style={styles.receiptFooter}>
              <Text style={styles.footerMsg}>*** THANK YOU FOR SHOPPING! ***</Text>
              <Text style={styles.footerTerms}>
                {settings.invoiceFooterNote}
              </Text>
            </View>
          </View>

          {/* Action Buttons Below Receipt */}
          <View style={styles.actionButtonsContainer}>
            <Button
              title="💬 Share WhatsApp Receipt"
              variant="success"
              size="lg"
              fullWidth
              onPress={handleShareWhatsApp}
              style={{ marginBottom: 10 }}
            />

            <Button
              title="🖨️ Print Receipt"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handlePrint}
              style={{ marginBottom: 10 }}
            />

            <Button
              title="+ Create Another Bill"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => router.replace('/billing' as any)}
              style={{ marginBottom: 10 }}
            />

            <Button
              title="Void / Cancel This Bill"
              variant="danger"
              size="sm"
              onPress={() => setVoidModalVisible(true)}
            />
          </View>
        </ScrollView>
      )}

      {/* Void Confirmation Modal */}
      <Modal
        visible={voidModalVisible}
        onClose={() => setVoidModalVisible(false)}
        title="Void Sales Invoice"
        subtitle="This action will delete the sale and return stock to inventory."
        maxWidth={400}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setVoidModalVisible(false)}
              disabled={voiding}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title="Void Invoice"
              variant="danger"
              size="md"
              onPress={handleVoidSale}
              loading={voiding}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <Text style={styles.voidWarningText}>
          Are you sure you want to void Invoice{' '}
          <Text style={{ fontWeight: '800', color: COLORS.textPrimary }}>
            #{sale?.invoiceNo}
          </Text>
          ?
        </Text>
        <Text style={styles.voidDetailText}>
          • Product quantities will be returned back to active stock.
          {'\n'}• Customer balance will be decremented by ₹{sale?.total.toFixed(2)}.
        </Text>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: COLORS.dangerLight,
    fontSize: 15,
    marginBottom: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  receiptCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingBottom: 14,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  storeAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  receiptTitlePill: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    letterSpacing: 0.8,
  },
  infoSection: {
    marginVertical: 12,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  infoValueInvoice: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  thText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdText: {
    fontSize: 12,
    color: '#1E293B',
  },
  tdTextBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemCodeSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  summarySection: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  grandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#16A34A',
  },
  customerBalanceNote: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  customerBalanceText: {
    fontSize: 11,
    color: '#1E40AF',
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerMsg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  footerTerms: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  actionButtonsContainer: {
    width: '100%',
    maxWidth: 480,
    marginTop: 20,
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voidWarningText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  voidDetailText: {
    fontSize: 12,
    color: COLORS.warningLight,
    lineHeight: 18,
  },
});
