import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { AppHeader, AppNavigation } from '../../components/common';
import {
  Button,
  Input,
  Card,
  Badge,
  SearchBar,
  EmptyState,
  Modal,
} from '../../components/ui';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  openingBalance: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export default function CustomersScreen() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DUE' | 'SETTLED'>('ALL');

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formOpeningBalance, setFormOpeningBalance] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load customers',
        text2: err.response?.data?.message || 'Check API connectivity.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalDue = 0;
    let dueCount = 0;
    let settledCount = 0;

    customers.forEach((c) => {
      if (c.balance > 0) {
        totalDue += c.balance;
        dueCount++;
      } else {
        settledCount++;
      }
    });

    return { totalDue, dueCount, settledCount };
  }, [customers]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q);

      let matchFilter = true;
      if (filterMode === 'DUE') {
        matchFilter = c.balance > 0;
      } else if (filterMode === 'SETTLED') {
        matchFilter = c.balance <= 0;
      }

      return matchSearch && matchFilter;
    });
  }, [customers, searchQuery, filterMode]);

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormMobile('');
    setFormOpeningBalance('0');
    setFormError(null);
    setModalVisible(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormMobile(customer.mobile);
    setFormOpeningBalance(String(customer.openingBalance));
    setFormError(null);
    setModalVisible(true);
  };

  // Save customer (POST or PATCH)
  const handleSaveCustomer = async () => {
    setFormError(null);

    const name = formName.trim();
    const mobile = formMobile.trim();
    const openingBalanceNum = parseFloat(formOpeningBalance) || 0;

    if (!name) {
      setFormError('Customer name is required.');
      return;
    }
    if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      setFormError('Mobile number must be exactly 10 digits.');
      return;
    }

    try {
      setSaving(true);

      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer.id}`, {
          name,
          mobile,
        });
        Toast.show({
          type: 'success',
          text1: 'Customer Updated',
          text2: `${name}'s details have been saved.`,
        });
      } else {
        await api.post('/customers', {
          name,
          mobile,
          openingBalance: openingBalanceNum,
        });
        Toast.show({
          type: 'success',
          text1: 'Customer Added',
          text2: `${name} added to khata records.`,
        });
      }

      setModalVisible(false);
      fetchCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save customer.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete customer
  const confirmDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteModalVisible(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/customers/${customerToDelete.id}`);
      Toast.show({
        type: 'success',
        text1: 'Customer Deleted',
        text2: `${customerToDelete.name} was removed.`,
      });
      setDeleteModalVisible(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Cannot delete customer because they have existing sales or payment records.';
      Toast.show({
        type: 'error',
        text1: 'Cannot Delete Customer',
        text2: msg,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) {
      return (
        <Badge
          label={`DUE: ₹${balance.toLocaleString('en-IN')}`}
          variant="danger"
          size="sm"
          dot
        />
      );
    }
    if (balance < 0) {
      return (
        <Badge
          label={`ADVANCE: ₹${Math.abs(balance).toLocaleString('en-IN')}`}
          variant="info"
          size="sm"
          dot
        />
      );
    }
    return <Badge label="SETTLED" variant="success" size="sm" dot />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Customer Khata"
        subtitle={`${customers.length} registered customers`}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button
              title="💳 Payments"
              variant="outline"
              size="sm"
              onPress={() => router.push('/payments' as any)}
            />
            <Button
              title="+ Add Customer"
              variant="primary"
              size="sm"
              onPress={handleOpenAddModal}
            />
          </View>
        }
      />

      <View style={styles.content}>
        {/* KPI Summary Card */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.cardAccentDanger]}>
            <Text style={styles.summaryLabel}>TOTAL KHATA DUE</Text>
            <Text style={styles.summaryValue}>
              ₹{metrics.totalDue.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.summarySubtitle}>
              Across {metrics.dueCount} customers
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.cardAccentSuccess]}>
            <Text style={styles.summaryLabel}>SETTLED / ADVANCE</Text>
            <Text style={styles.summaryValue}>{metrics.settledCount}</Text>
            <Text style={styles.summarySubtitle}>Zero or credit balance</Text>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by customer name or mobile..."
          style={styles.searchBar}
        />

        {/* Filter Chips Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterMode === 'ALL' && styles.filterChipActive,
            ]}
            onPress={() => setFilterMode('ALL')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterMode === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filterMode === 'DUE' && styles.filterChipActiveDanger,
            ]}
            onPress={() => setFilterMode('DUE')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterMode === 'DUE' && styles.filterChipTextActiveDanger,
              ]}
            >
              🔴 Due / Khata ({metrics.dueCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filterMode === 'SETTLED' && styles.filterChipActiveSuccess,
            ]}
            onPress={() => setFilterMode('SETTLED')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterMode === 'SETTLED' && styles.filterChipTextActiveSuccess,
              ]}
            >
              🟢 Settled ({metrics.settledCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Loading Customers...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchCustomers();
                }}
                tintColor="#38BDF8"
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="👥"
                title="No Customers Found"
                description={
                  searchQuery || filterMode !== 'ALL'
                    ? 'No customer records match the current filter criteria.'
                    : 'Add customers to record credit sales (udhari) and maintain running khata.'
                }
                actionTitle="+ Add Customer"
                onAction={handleOpenAddModal}
              />
            }
            renderItem={({ item }) => (
              <Card style={styles.customerCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerMobile}>📞 +91 {item.mobile}</Text>
                    {item.openingBalance !== 0 && (
                      <Text style={styles.openingBalText}>
                        Opening Balance: ₹{item.openingBalance.toLocaleString('en-IN')}
                      </Text>
                    )}
                  </View>
                  <View>{getBalanceBadge(item.balance)}</View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooterRow}>
                  <Button
                    title="View Khata / Ledger ➔"
                    size="sm"
                    variant="ghost"
                    onPress={() => router.push(`/customers/${item.id}` as any)}
                  />

                  <View style={styles.actionsRow}>
                    <Button
                      title="Edit"
                      size="sm"
                      variant="outline"
                      onPress={() => handleOpenEditModal(item)}
                      style={styles.actionBtn}
                    />
                    <Button
                      title="Delete"
                      size="sm"
                      variant="danger"
                      onPress={() => confirmDelete(item)}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        subtitle={
          editingCustomer
            ? `Updating profile for ${editingCustomer.name}`
            : 'Enter customer details to register in Khata'
        }
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setModalVisible(false)}
              disabled={saving}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title={editingCustomer ? 'Update Customer' : 'Save Customer'}
              variant="primary"
              size="md"
              onPress={handleSaveCustomer}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        {formError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{formError}</Text>
          </View>
        )}

        <Input
          label="Customer Full Name"
          placeholder="e.g. Anand Deshmukh"
          value={formName}
          onChangeText={setFormName}
          required
        />

        <Input
          label="Mobile Number"
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
          maxLength={10}
          value={formMobile}
          onChangeText={(text) => setFormMobile(text.replace(/[^0-9]/g, ''))}
          prefix={<Text style={styles.prefixText}>+91</Text>}
          required
        />

        {!editingCustomer && (
          <Input
            label="Opening Balance (₹)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={formOpeningBalance}
            onChangeText={setFormOpeningBalance}
            prefix={<Text style={styles.prefixText}>₹</Text>}
            helperText="Positive for existing credit due, 0 for new account"
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Confirm Deletion"
        subtitle="This action cannot be undone."
        maxWidth={400}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setDeleteModalVisible(false)}
              disabled={deleting}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title="Delete Customer"
              variant="danger"
              size="md"
              onPress={handleDeleteCustomer}
              loading={deleting}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <Text style={styles.deleteConfirmText}>
          Are you sure you want to permanently delete{' '}
          <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
            "{customerToDelete?.name}"
          </Text>
          ?
        </Text>
        <Text style={styles.deleteWarningText}>
          Note: Customers with recorded sale bills or payments cannot be deleted to preserve accounting records.
        </Text>
      </Modal>

      <AppNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cardAccentDanger: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  cardAccentSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  searchBar: {
    marginBottom: 10,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.borderDark,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primaryLight,
  },
  filterChipActiveDanger: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  filterChipActiveSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.info,
    fontWeight: '700',
  },
  filterChipTextActiveDanger: {
    color: COLORS.dangerLight,
    fontWeight: '700',
  },
  filterChipTextActiveSuccess: {
    color: COLORS.successLight,
    fontWeight: '700',
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
  listContent: {
    paddingBottom: 24,
  },
  customerCard: {
    marginBottom: 10,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerMobile: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  openingBalText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
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
  prefixText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteConfirmText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  deleteWarningText: {
    fontSize: 12,
    color: COLORS.warningLight,
    lineHeight: 16,
  },
});
