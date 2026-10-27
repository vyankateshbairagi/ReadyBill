import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { AppHeader } from '../../components/common';
import {
  Button,
  Card,
  Badge,
  Input,
  EmptyState,
  Modal,
} from '../../components/ui';

export interface LedgerItem {
  id: string;
  date: string;
  type: 'OPENING_BALANCE' | 'SALE' | 'PAYMENT';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerLedgerResponse {
  customer: {
    id: string;
    name: string;
    mobile: string;
    openingBalance: number;
  };
  totalInvoices: number;
  totalSales: number;
  totalPayments: number;
  currentBalance: number;
  balanceType: 'CUSTOMER_DUE' | 'ADVANCE_PAYMENT' | 'SETTLED';
  transactions: LedgerItem[];
}

export default function CustomerLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [ledger, setLedger] = useState<CustomerLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Record Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK'>('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchLedger = async () => {
    if (!id) return;

    try {
      const response = await api.get(`/ledger/customer/${id}`);
      setLedger(response.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load ledger',
        text2: err.response?.data?.message || 'Check network connection.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [id]);

  const handleCallCustomer = () => {
    if (ledger?.customer?.mobile) {
      Linking.openURL(`tel:${ledger.customer.mobile}`);
    }
  };

  const handleOpenPaymentModal = () => {
    setPaymentAmount(
      ledger?.currentBalance && ledger.balanceType === 'CUSTOMER_DUE'
        ? String(ledger.currentBalance)
        : ''
    );
    setPaymentMode('CASH');
    setPaymentNote('');
    setPaymentError(null);
    setPaymentModalVisible(true);
  };

  const handleRecordPayment = async () => {
    setPaymentError(null);

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Please enter a valid payment amount (> 0).');
      return;
    }

    try {
      setSubmittingPayment(true);
      await api.post('/payments', {
        customerId: id,
        amount: amountNum,
        paymentMode,
        note: paymentNote.trim() || undefined,
      });

      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: `₹${amountNum} received via ${paymentMode}.`,
      });

      setPaymentModalVisible(false);
      fetchLedger();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record payment.';
      setPaymentError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getBalanceBadge = () => {
    if (!ledger) return null;

    if (ledger.balanceType === 'CUSTOMER_DUE') {
      return (
        <Badge
          label={`CUSTOMER OWES: ₹${ledger.currentBalance.toLocaleString('en-IN')}`}
          variant="danger"
          size="md"
          dot
        />
      );
    }
    if (ledger.balanceType === 'ADVANCE_PAYMENT') {
      return (
        <Badge
          label={`ADVANCE CREDIT: ₹${ledger.currentBalance.toLocaleString('en-IN')}`}
          variant="info"
          size="md"
          dot
        />
      );
    }
    return <Badge label="ACCOUNT SETTLED" variant="success" size="md" dot />;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={ledger?.customer?.name || 'Customer Khata'}
        subtitle={ledger?.customer?.mobile ? `+91 ${ledger.customer.mobile}` : undefined}
        showBack
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallCustomer}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.callIcon}>📞 Call</Text>
            </TouchableOpacity>

            <Button
              title="+ Payment"
              variant="success"
              size="sm"
              onPress={handleOpenPaymentModal}
            />
          </View>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading Statement...</Text>
        </View>
      ) : !ledger ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Customer could not be loaded.</Text>
          <Button title="Go Back" variant="outline" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLedger();
              }}
              tintColor="#38BDF8"
            />
          }
        >
          {/* Outstanding Balance Banner */}
          <Card
            style={[
              styles.balanceCard,
              ledger.balanceType === 'CUSTOMER_DUE'
                ? styles.cardBorderDanger
                : ledger.balanceType === 'ADVANCE_PAYMENT'
                ? styles.cardBorderInfo
                : styles.cardBorderSuccess,
            ]}
          >
            <View style={styles.balanceHeaderRow}>
              <View>
                <Text style={styles.balanceLabel}>CURRENT OUTSTANDING BALANCE</Text>
                <Text style={styles.balanceAmount}>
                  ₹{ledger.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View>{getBalanceBadge()}</View>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>TOTAL PURCHASES</Text>
                <Text style={styles.metricValue}>
                  ₹{ledger.totalSales.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>{ledger.totalInvoices} Invoices</Text>
              </View>

              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>TOTAL PAID</Text>
                <Text style={[styles.metricValue, { color: COLORS.successLight }]}>
                  ₹{ledger.totalPayments.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>Received so far</Text>
              </View>

              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>OPENING BAL</Text>
                <Text style={styles.metricValue}>
                  ₹{ledger.customer.openingBalance.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>Initial balance</Text>
              </View>
            </View>
          </Card>

          {/* Quick Payment Action Bar */}
          <View style={styles.quickPayBar}>
            <View style={styles.quickPayTextCol}>
              <Text style={styles.quickPayTitle}>Collect / Settle Balance</Text>
              <Text style={styles.quickPaySubtitle}>
                Record cash or online payment to update khata instantly
              </Text>
            </View>
            <Button
              title="Record Payment"
              variant="success"
              size="sm"
              onPress={handleOpenPaymentModal}
            />
          </View>

          {/* Statement / Ledger Transactions */}
          <Text style={styles.sectionTitle}>Running Account Statement</Text>

          {ledger.transactions.length === 0 ? (
            <EmptyState
              icon="📜"
              title="No Transactions Yet"
              description="No sales invoices or payment records found for this customer."
              actionTitle="Record First Payment"
              onAction={handleOpenPaymentModal}
            />
          ) : (
            <View style={styles.transactionsList}>
              {ledger.transactions.map((tx, index) => {
                const isSale = tx.type === 'SALE';
                const isPayment = tx.type === 'PAYMENT';

                return (
                  <View key={tx.id || index} style={styles.txRow}>
                    {/* Left: Icon & Description */}
                    <View style={styles.txLeftCol}>
                      <View
                        style={[
                          styles.txIconBox,
                          isSale
                            ? styles.txIconSale
                            : isPayment
                            ? styles.txIconPayment
                            : styles.txIconOpening,
                        ]}
                      >
                        <Text style={styles.txIconEmoji}>
                          {isSale ? '🧾' : isPayment ? '💵' : '🏁'}
                        </Text>
                      </View>

                      <View style={styles.txInfoCol}>
                        <Text style={styles.txReference}>
                          {isSale
                            ? `Invoice #${tx.reference}`
                            : isPayment
                            ? `Payment via ${tx.reference}`
                            : 'Opening Balance'}
                        </Text>
                        <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                      </View>
                    </View>

                    {/* Right: Amount & Running Balance */}
                    <View style={styles.txRightCol}>
                      {tx.debit > 0 && (
                        <Text style={styles.debitText}>
                          +₹{tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      )}
                      {tx.credit > 0 && (
                        <Text style={styles.creditText}>
                          -₹{tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      )}
                      {tx.balance !== undefined && (
                        <Text style={styles.runningBalText}>
                          Bal: ₹{tx.balance.toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Record Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Record Payment"
        subtitle={`Crediting account of ${ledger?.customer?.name}`}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setPaymentModalVisible(false)}
              disabled={submittingPayment}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title="Submit Payment"
              variant="success"
              size="md"
              onPress={handleRecordPayment}
              loading={submittingPayment}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        {paymentError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{paymentError}</Text>
          </View>
        )}

        <Input
          label="Amount Received (₹)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          prefix={<Text style={styles.currencyPrefix}>₹</Text>}
          required
        />

        {/* Payment Mode Selector */}
        <Text style={styles.formLabel}>Payment Mode</Text>
        <View style={styles.modeGrid}>
          {(['CASH', 'UPI', 'CARD', 'BANK'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeChip,
                paymentMode === mode && styles.modeChipActive,
              ]}
              onPress={() => setPaymentMode(mode)}
            >
              <Text
                style={[
                  styles.modeChipText,
                  paymentMode === mode && styles.modeChipTextActive,
                ]}
              >
                {mode === 'CASH'
                  ? '💵 Cash'
                  : mode === 'UPI'
                  ? '📱 UPI / QR'
                  : mode === 'CARD'
                  ? '💳 Card'
                  : '🏦 Bank'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Payment Note / Transaction ID"
          placeholder="e.g. GPay Ref 49830219"
          value={paymentNote}
          onChangeText={setPaymentNote}
          helperText="Optional reference or transaction note"
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callIcon: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
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
  },
  balanceCard: {
    padding: 18,
    marginBottom: 14,
  },
  cardBorderDanger: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.danger,
  },
  cardBorderInfo: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.info,
  },
  cardBorderSuccess: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.success,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  quickPayBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 20,
  },
  quickPayTextCol: {
    flex: 1,
    marginRight: 10,
  },
  quickPayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quickPaySubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  transactionsList: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  txLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  txIconSale: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444430',
  },
  txIconPayment: {
    backgroundColor: '#10B98115',
    borderColor: '#10B98130',
  },
  txIconOpening: {
    backgroundColor: '#3B82F615',
    borderColor: '#3B82F630',
  },
  txIconEmoji: {
    fontSize: 18,
  },
  txInfoCol: {
    flex: 1,
  },
  txReference: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txRightCol: {
    alignItems: 'flex-end',
  },
  debitText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dangerLight,
  },
  creditText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.successLight,
  },
  runningBalText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderColor: '#EF444450',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorBoxText: {
    color: COLORS.dangerLight,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  currencyPrefix: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primaryLight,
  },
  modeChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: COLORS.info,
    fontWeight: '700',
  },
});
