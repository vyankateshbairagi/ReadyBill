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
  SearchBar,
  EmptyState,
  Modal,
} from '../../components/ui';

interface Payment {
  id: string;
  customerId: string;
  userId: string;
  amount: number;
  paymentMode: string;
  note?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  balance: number;
}

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'NET_BANKING'] as const;

export default function PaymentsScreen() {
  const router = useRouter();

  // State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD' | 'UDHARI'>('ALL');

  // Collect Payment Modal
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Digital Receipt Modal
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<{
    payment: Payment;
    customerName: string;
    customerMobile: string;
    remainingBalance?: number;
  } | null>(null);

  // Fetch all payments and customers
  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, customersRes] = await Promise.all([
        api.get<Payment[]>('/payments'),
        api.get<Customer[]>('/customers'),
      ]);
      setPayments(paymentsRes.data);
      setCustomers(customersRes.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load payments',
        text2: err.response?.data?.message || 'Check your server connection.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    let todayTotal = 0;
    let allTimeTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      allTimeTotal += amt;

      const pDate = new Date(p.createdAt).toDateString();
      if (pDate === today) {
        todayTotal += amt;
      }

      const mode = (p.paymentMode || '').toUpperCase();
      if (mode === 'CASH') cashTotal += amt;
      else if (mode === 'UPI') upiTotal += amt;
      else if (mode === 'CARD') cardTotal += amt;
    });

    const totalOutstandingUdhari = customers.reduce(
      (acc, c) => acc + (Number(c.balance) > 0 ? Number(c.balance) : 0),
      0
    );

    return {
      todayTotal,
      allTimeTotal,
      cashTotal,
      upiTotal,
      cardTotal,
      totalOutstandingUdhari,
      count: payments.length,
    };
  }, [payments, customers]);

  // Customers with Udhari (balance > 0)
  const udhariCustomers = useMemo(() => {
    return customers
      .filter((c) => Number(c.balance) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance));
  }, [customers]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        p.customer?.name.toLowerCase().includes(query) ||
        p.customer?.mobile.includes(query) ||
        (p.note && p.note.toLowerCase().includes(query)) ||
        p.paymentMode.toLowerCase().includes(query);

      if (!matchSearch) return false;

      if (selectedFilter === 'ALL' || selectedFilter === 'UDHARI') return true;
      return p.paymentMode.toUpperCase() === selectedFilter;
    });
  }, [payments, searchQuery, selectedFilter]);

  // Filtered Customers with Udhari for search
  const filteredUdhariCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return udhariCustomers;
    return udhariCustomers.filter(
      (c) => c.name.toLowerCase().includes(query) || c.mobile.includes(query)
    );
  }, [udhariCustomers, searchQuery]);

  // Helper: Open Collect Modal pre-selected
  const openCollectModal = (customerId?: string) => {
    setPaymentError(null);
    setPaymentNote('');
    setPaymentMode('CASH');

    if (customerId) {
      setSelectedCustomerId(customerId);
      const cust = customers.find((c) => c.id === customerId);
      if (cust && cust.balance > 0) {
        setPaymentAmount(cust.balance.toString());
      } else {
        setPaymentAmount('');
      }
    } else {
      setSelectedCustomerId(udhariCustomers.length > 0 ? udhariCustomers[0].id : customers[0]?.id || '');
      setPaymentAmount('');
    }
    setCollectModalVisible(true);
  };

  // Submit Payment
  const handleRecordPayment = async () => {
    setPaymentError(null);

    if (!selectedCustomerId) {
      setPaymentError('Please select a customer.');
      return;
    }

    const amtNum = parseFloat(paymentAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setPaymentError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await api.post('/payments', {
        customerId: selectedCustomerId,
        amount: amtNum,
        paymentMode,
        note: paymentNote.trim() || undefined,
      });

      const cust = customers.find((c) => c.id === selectedCustomerId);
      const createdPayment = res.data.payment || {
        id: `PAY-${Date.now()}`,
        customerId: selectedCustomerId,
        userId: '',
        amount: amtNum,
        paymentMode,
        note: paymentNote.trim(),
        createdAt: new Date().toISOString(),
        customer: cust ? { id: cust.id, name: cust.name, mobile: cust.mobile } : undefined,
      };

      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: `₹${amtNum.toLocaleString('en-IN')} received via ${paymentMode}.`,
      });

      setCollectModalVisible(false);
      fetchData();

      // Open receipt modal immediately
      setActiveReceipt({
        payment: createdPayment,
        customerName: cust?.name || 'Customer',
        customerMobile: cust?.mobile || '',
        remainingBalance: res.data.remainingBalance,
      });
      setReceiptModalVisible(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record payment.';
      setPaymentError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Format Date Helper
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        ' ' +
        d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    } catch {
      return iso;
    }
  };

  // Send WhatsApp Receipt
  const handleShareReceiptWhatsApp = (receipt: NonNullable<typeof activeReceipt>) => {
    const mobile = receipt.customerMobile.replace(/[^0-9]/g, '');
    const cleanPhone = mobile.startsWith('91') ? mobile : `91${mobile}`;

    const message = [
      `*PAYMENT RECEIPT — READYBILL RETAIL*`,
      `Receipt ID: #${receipt.payment.id.slice(-8).toUpperCase()}`,
      `Date: ${formatDate(receipt.payment.createdAt)}`,
      `---------------------------------`,
      `Customer: *${receipt.customerName}*`,
      `Amount Received: *₹${receipt.payment.amount.toLocaleString('en-IN')}*`,
      `Payment Mode: *${receipt.payment.paymentMode}*`,
      receipt.payment.note ? `Note/Ref: ${receipt.payment.note}` : null,
      receipt.remainingBalance !== undefined
        ? `Remaining Khata Balance: *₹${receipt.remainingBalance.toLocaleString('en-IN')}*`
        : null,
      `---------------------------------`,
      `Thank you for your prompt payment!`,
    ]
      .filter(Boolean)
      .join('\n');

    const encoded = encodeURIComponent(message);
    const url =
      Platform.OS === 'web'
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;

    Linking.openURL(url).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Could not open WhatsApp',
        text2: 'Please ensure WhatsApp is installed on this device.',
      });
    });
  };

  // Send WhatsApp Khata Due Reminder
  const handleSendDueReminder = (customer: Customer) => {
    const mobile = customer.mobile.replace(/[^0-9]/g, '');
    const cleanPhone = mobile.startsWith('91') ? mobile : `91${mobile}`;

    const message = [
      `*KHATA PAYMENT REMINDER — READYBILL RETAIL*`,
      `Dear *${customer.name}*,`,
      `This is a gentle reminder regarding your outstanding Khata balance:`,
      `---------------------------------`,
      `Current Balance Due: *₹${customer.balance.toLocaleString('en-IN')}*`,
      `---------------------------------`,
      `Kindly clear this balance at your convenience via Cash, UPI, or Card.`,
      `Thank you for your continued business!`,
    ].join('\n');

    const encoded = encodeURIComponent(message);
    const url =
      Platform.OS === 'web'
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;

    Linking.openURL(url).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Could not open WhatsApp',
        text2: 'Please ensure WhatsApp is installed on this device.',
      });
    });
  };

  // Get Mode Badge Variant
  const getModeBadge = (mode: string) => {
    const upper = (mode || '').toUpperCase();
    if (upper === 'CASH') return <Badge label="CASH" variant="success" size="sm" />;
    if (upper === 'UPI') return <Badge label="UPI" variant="info" size="sm" />;
    if (upper === 'CARD') return <Badge label="CARD" variant="warning" size="sm" />;
    return <Badge label={upper} variant="neutral" size="sm" />;
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Payments & Udhari"
        subtitle="Khata Ledger & Cash/UPI Collections"
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
        {/* KPI Metrics Dashboard Bar */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <Text style={styles.metricLabel}>TODAY'S COLLECTIONS</Text>
            <Text style={styles.metricValue}>₹{metrics.todayTotal.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>Recorded today</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL OUTSTANDING UDHARI</Text>
            <Text style={[styles.metricValue, { color: COLORS.danger }]}>
              ₹{metrics.totalOutstandingUdhari.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.metricSub}>{udhariCustomers.length} customers owe</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>MODE BREAKDOWN</Text>
            <View style={styles.modeBreakdown}>
              <Text style={styles.modeMiniText}>
                💵 Cash: <Text style={styles.modeMiniVal}>₹{metrics.cashTotal.toLocaleString('en-IN')}</Text>
              </Text>
              <Text style={styles.modeMiniText}>
                ⚡ UPI: <Text style={styles.modeMiniVal}>₹{metrics.upiTotal.toLocaleString('en-IN')}</Text>
              </Text>
              <Text style={styles.modeMiniText}>
                💳 Card: <Text style={styles.modeMiniVal}>₹{metrics.cardTotal.toLocaleString('en-IN')}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Action Header */}
        <View style={styles.actionHeader}>
          <View style={styles.searchWrapper}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by customer, phone, mode..."
            />
          </View>
          <Button
            title="+ Collect Payment"
            variant="primary"
            size="md"
            onPress={() => openCollectModal()}
          />
        </View>

        {/* Filter Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('ALL')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All Payments ({payments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'UDHARI' && styles.filterChipActiveWarning]}
            onPress={() => setSelectedFilter('UDHARI')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'UDHARI' && styles.filterChipTextActiveWarning,
              ]}
            >
              ⚠️ Due Udhari Khata ({udhariCustomers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'CASH' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('CASH')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'CASH' && styles.filterChipTextActive,
              ]}
            >
              💵 Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'UPI' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('UPI')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'UPI' && styles.filterChipTextActive,
              ]}
            >
              ⚡ UPI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'CARD' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('CARD')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'CARD' && styles.filterChipTextActive,
              ]}
            >
              💳 Card
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Content Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading payment records...</Text>
          </View>
        ) : selectedFilter === 'UDHARI' ? (
          /* ========================================================= */
          /* PENDING UDHARI CUSTOMERS VIEW                            */
          /* ========================================================= */
          filteredUdhariCustomers.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="No Pending Udhari"
              description="All registered customer accounts are settled and in good standing!"
            />
          ) : (
            <View style={styles.cardsList}>
              <Text style={styles.sectionHeading}>
                Customers with Pending Khata ({filteredUdhariCustomers.length})
              </Text>
              {filteredUdhariCustomers.map((cust) => (
                <View key={cust.id} style={styles.udhariCard}>
                  <View style={styles.udhariTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{cust.name}</Text>
                      <Text style={styles.customerMobile}>📞 +91 {cust.mobile}</Text>
                    </View>
                    <View style={styles.dueBadgeWrapper}>
                      <Text style={styles.dueBadgeLabel}>OUTSTANDING</Text>
                      <Text style={styles.dueBadgeAmount}>
                        ₹{Number(cust.balance).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.udhariActionsRow}>
                    <TouchableOpacity
                      style={styles.btnSecondary}
                      onPress={() => router.push(`/customers/${cust.id}` as any)}
                    >
                      <Text style={styles.btnSecondaryText}>📖 Full Ledger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnWhatsApp}
                      onPress={() => handleSendDueReminder(cust)}
                    >
                      <Text style={styles.btnWhatsAppText}>💬 WhatsApp Reminder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnCollect}
                      onPress={() => openCollectModal(cust.id)}
                    >
                      <Text style={styles.btnCollectText}>💰 Collect</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          /* ========================================================= */
          /* PAYMENT TRANSACTIONS FEED VIEW                           */
          /* ========================================================= */
          filteredPayments.length === 0 ? (
            <EmptyState
              icon="💳"
              title="No Payments Found"
              description="No payment records match your search or filter selection."
              actionTitle="+ Record New Payment"
              onAction={() => openCollectModal()}
            />
          ) : (
            <View style={styles.cardsList}>
              <Text style={styles.sectionHeading}>
                Transactions Feed ({filteredPayments.length})
              </Text>
              {filteredPayments.map((payment) => (
                <TouchableOpacity
                  key={payment.id}
                  style={styles.paymentCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveReceipt({
                      payment,
                      customerName: payment.customer?.name || 'Customer',
                      customerMobile: payment.customer?.mobile || '',
                    });
                    setReceiptModalVisible(true);
                  }}
                >
                  <View style={styles.paymentLeft}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(payment.customer?.name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.customerName}>
                          {payment.customer?.name || 'Direct / Walk-in Customer'}
                        </Text>
                        {getModeBadge(payment.paymentMode)}
                      </View>
                      <Text style={styles.paymentDate}>{formatDate(payment.createdAt)}</Text>
                      {payment.note && (
                        <Text style={styles.paymentNote} numberOfLines={1}>
                          📝 {payment.note}
                        </Text>
                      )}
                      {payment.user && (
                        <Text style={styles.cashierTag}>Received by: {payment.user.name}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>
                      +₹{Number(payment.amount).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.tapReceiptText}>View Receipt ❯</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* COLLECT PAYMENT MODAL                                     */}
      {/* ========================================================= */}
      <Modal
        visible={collectModalVisible}
        title="Record Payment Collection"
        onClose={() => setCollectModalVisible(false)}
      >
        <ScrollView style={{ maxHeight: 460 }}>
          {paymentError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{paymentError}</Text>
            </View>
          )}

          {/* Customer Selection */}
          <Text style={styles.inputLabel}>Select Customer *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.customerPickerScroll}
          >
            {customers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              const hasDue = Number(c.balance) > 0;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.customerChip,
                    isSelected && styles.customerChipSelected,
                    hasDue && styles.customerChipDue,
                  ]}
                  onPress={() => {
                    setSelectedCustomerId(c.id);
                    if (Number(c.balance) > 0) {
                      setPaymentAmount(c.balance.toString());
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.customerChipName,
                      isSelected && styles.customerChipNameSelected,
                    ]}
                  >
                    {c.name}
                  </Text>
                  <Text
                    style={[
                      styles.customerChipBalance,
                      hasDue ? { color: COLORS.danger } : { color: COLORS.success },
                    ]}
                  >
                    {hasDue ? `Due: ₹${c.balance}` : 'No Due'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Outstanding Balance Banner if customer selected */}
          {selectedCustomerObj && (
            <View
              style={[
                styles.customerInfoCard,
                Number(selectedCustomerObj.balance) > 0
                  ? styles.customerInfoCardDue
                  : styles.customerInfoCardSettled,
              ]}
            >
              <View>
                <Text style={styles.customerInfoName}>{selectedCustomerObj.name}</Text>
                <Text style={styles.customerInfoMobile}>+91 {selectedCustomerObj.mobile}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.customerInfoDueLabel}>Current Due</Text>
                <Text
                  style={[
                    styles.customerInfoDueVal,
                    {
                      color:
                        Number(selectedCustomerObj.balance) > 0
                          ? COLORS.danger
                          : COLORS.success,
                    },
                  ]}
                >
                  ₹{Number(selectedCustomerObj.balance).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Amount Input */}
          <View style={styles.amountInputRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Amount Received (₹) *"
                placeholder="e.g. 500"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />
            </View>
            {selectedCustomerObj && Number(selectedCustomerObj.balance) > 0 && (
              <TouchableOpacity
                style={styles.fullDueBtn}
                onPress={() => setPaymentAmount(selectedCustomerObj.balance.toString())}
              >
                <Text style={styles.fullDueBtnText}>Pay Full Due</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Payment Mode Selector */}
          <Text style={styles.inputLabel}>Payment Mode *</Text>
          <View style={styles.modeRow}>
            {PAYMENT_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  paymentMode === mode && styles.modeButtonSelected,
                ]}
                onPress={() => setPaymentMode(mode)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    paymentMode === mode && styles.modeButtonTextSelected,
                  ]}
                >
                  {mode === 'CASH'
                    ? '💵 Cash'
                    : mode === 'UPI'
                    ? '⚡ UPI'
                    : mode === 'CARD'
                    ? '💳 Card'
                    : '🏦 NetBanking'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reference / Note Input */}
          <Input
            label="Transaction Note / Reference (Optional)"
            placeholder="e.g. GPay UPI Ref 38291..."
            value={paymentNote}
            onChangeText={setPaymentNote}
          />

          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setCollectModalVisible(false)}
              disabled={submittingPayment}
              style={{ flex: 1 }}
            />
            <Button
              title={submittingPayment ? 'Saving...' : 'Confirm Receipt'}
              variant="primary"
              size="md"
              onPress={handleRecordPayment}
              loading={submittingPayment}
              disabled={submittingPayment}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* ========================================================= */}
      {/* DIGITAL PAYMENT RECEIPT SLIP MODAL                        */}
      {/* ========================================================= */}
      <Modal
        visible={receiptModalVisible}
        title="Payment Voucher Receipt"
        onClose={() => setReceiptModalVisible(false)}
      >
        {activeReceipt && (
          <ScrollView style={{ maxHeight: 480 }}>
            {/* Thermal / Paper Voucher Box */}
            <View style={styles.voucherBox}>
              <View style={styles.voucherHeader}>
                <Text style={styles.voucherBrand}>READYBILL RETAIL</Text>
                <Text style={styles.voucherTagline}>Payment Receipt Voucher</Text>
                <Text style={styles.voucherReceiptNo}>
                  REF: #{activeReceipt.payment.id.slice(-8).toUpperCase()}
                </Text>
              </View>

              <View style={styles.voucherDivider} />

              <View style={styles.voucherRow}>
                <Text style={styles.voucherKey}>Date & Time:</Text>
                <Text style={styles.voucherVal}>
                  {formatDate(activeReceipt.payment.createdAt)}
                </Text>
              </View>

              <View style={styles.voucherRow}>
                <Text style={styles.voucherKey}>Received From:</Text>
                <Text style={styles.voucherValBold}>{activeReceipt.customerName}</Text>
              </View>

              {activeReceipt.customerMobile ? (
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherKey}>Phone:</Text>
                  <Text style={styles.voucherVal}>+91 {activeReceipt.customerMobile}</Text>
                </View>
              ) : null}

              <View style={styles.voucherRow}>
                <Text style={styles.voucherKey}>Payment Mode:</Text>
                <Text style={styles.voucherValBold}>
                  {activeReceipt.payment.paymentMode.toUpperCase()}
                </Text>
              </View>

              {activeReceipt.payment.note ? (
                <View style={styles.voucherRow}>
                  <Text style={styles.voucherKey}>Ref/Note:</Text>
                  <Text style={styles.voucherVal}>{activeReceipt.payment.note}</Text>
                </View>
              ) : null}

              <View style={styles.voucherDivider} />

              {/* Amount Large Display */}
              <View style={styles.voucherAmountBlock}>
                <Text style={styles.voucherAmountLabel}>AMOUNT RECEIVED</Text>
                <Text style={styles.voucherAmountNum}>
                  ₹{Number(activeReceipt.payment.amount).toLocaleString('en-IN')}
                </Text>
                <View style={styles.paidStamp}>
                  <Text style={styles.paidStampText}>✓ RECEIVED & CREDITED</Text>
                </View>
              </View>

              {activeReceipt.remainingBalance !== undefined && (
                <View style={styles.remainingBalanceRow}>
                  <Text style={styles.remainingBalanceKey}>Remaining Khata Balance:</Text>
                  <Text style={styles.remainingBalanceVal}>
                    ₹{Number(activeReceipt.remainingBalance).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              {activeReceipt.payment.user?.name && (
                <Text style={styles.voucherCashier}>
                  Cashier: {activeReceipt.payment.user.name}
                </Text>
              )}
            </View>

            {/* Voucher Actions */}
            <View style={styles.receiptActions}>
              <Button
                title="💬 Share on WhatsApp"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => handleShareReceiptWhatsApp(activeReceipt)}
                style={{ marginBottom: 10, backgroundColor: '#10B981' }}
              />
              <Button
                title="Done"
                variant="outline"
                size="md"
                fullWidth
                onPress={() => setReceiptModalVisible(false)}
              />
            </View>
          </ScrollView>
        )}
      </Modal>

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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  metricCardPrimary: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  modeBreakdown: {
    marginTop: 2,
    gap: 2,
  },
  modeMiniText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  modeMiniVal: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  searchWrapper: {
    flex: 1,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterChipActiveWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: COLORS.info,
    fontWeight: '700',
  },
  filterChipTextActiveWarning: {
    color: COLORS.danger,
    fontWeight: '700',
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
  cardsList: {
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentCard: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: COLORS.info,
    fontSize: 18,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  paymentNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  cashierTag: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10B981',
  },
  tapReceiptText: {
    fontSize: 11,
    color: COLORS.info,
    marginTop: 4,
    fontWeight: '600',
  },
  udhariCard: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 12,
  },
  udhariTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerMobile: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dueBadgeWrapper: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dueBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
  dueBadgeAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.danger,
  },
  udhariActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  btnSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  btnWhatsApp: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  btnWhatsAppText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  btnCollect: {
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  btnCollectText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  customerPickerScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  customerChip: {
    backgroundColor: COLORS.bgDark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    minWidth: 90,
  },
  customerChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  customerChipDue: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  customerChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerChipNameSelected: {
    color: COLORS.info,
  },
  customerChipBalance: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  customerInfoCard: {
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  customerInfoCardDue: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  customerInfoCardSettled: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  customerInfoName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerInfoMobile: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  customerInfoDueLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  customerInfoDueVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  fullDueBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  fullDueBtnText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
  },
  modeButtonSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modeButtonTextSelected: {
    color: COLORS.info,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  voucherBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 16,
  },
  voucherHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  voucherBrand: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  voucherTagline: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  voucherReceiptNo: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.info,
    marginTop: 4,
  },
  voucherDivider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 10,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voucherKey: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  voucherVal: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  voucherValBold: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  voucherAmountBlock: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  voucherAmountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  voucherAmountNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10B981',
    marginVertical: 4,
  },
  paidStamp: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  paidStampText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  remainingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  remainingBalanceKey: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  remainingBalanceVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.danger,
  },
  voucherCashier: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
  },
  receiptActions: {
    marginTop: 4,
  },
});
