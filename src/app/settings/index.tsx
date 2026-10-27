import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { useAuthStore, UserRole } from '../../store/authStore';
import { useSettingsStore, PrinterType } from '../../store/settingsStore';
import { AppHeader } from '../../components/common/AppHeader';
import { AppNavigation } from '../../components/common/AppNavigation';
import {
  Button,
  Input,
  Badge,
  EmptyState,
  Modal,
} from '../../components/ui';

interface StaffUser {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  createdAt: string;
  _count?: {
    sales: number;
    payments: number;
  };
}

type SettingsSection = 'shop' | 'pos' | 'staff' | 'account';

const ROLES: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER'];

const PRINTER_OPTIONS: { label: string; value: PrinterType; desc: string }[] = [
  { label: 'Thermal 80mm', value: 'THERMAL_80', desc: 'Standard high-speed POS receipt printer' },
  { label: 'Thermal 58mm', value: 'THERMAL_58', desc: 'Compact mobile Bluetooth receipt printer' },
  { label: 'Standard A4/A5', value: 'STANDARD_A4', desc: 'Regular office or laser invoice paper' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const settings = useSettingsStore();

  const [activeSection, setActiveSection] = useState<SettingsSection>('shop');

  // Shop Profile Form State
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopTagline, setShopTagline] = useState(settings.shopTagline);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [shopMobile, setShopMobile] = useState(settings.shopMobile);
  const [shopGstin, setShopGstin] = useState(settings.shopGstin);
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(settings.invoiceFooterNote);

  // POS Preferences State
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterType>(settings.printerType);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate.toString());
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(settings.autoPrintInvoice);

  // Staff State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add Staff Modal
  const [addStaffVisible, setAddStaffVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('CASHIER');
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Edit Role Modal
  const [editRoleVisible, setEditRoleVisible] = useState(false);
  const [userToEdit, setUserToEdit] = useState<StaffUser | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Initialize store settings
  useEffect(() => {
    settings.initializeSettings();
  }, []);

  // Sync state if settings change
  useEffect(() => {
    setShopName(settings.shopName);
    setShopTagline(settings.shopTagline);
    setShopAddress(settings.shopAddress);
    setShopMobile(settings.shopMobile);
    setShopGstin(settings.shopGstin);
    setInvoiceFooterNote(settings.invoiceFooterNote);
    setSelectedPrinter(settings.printerType);
    setDefaultTaxRate(settings.defaultTaxRate.toString());
    setAutoPrintInvoice(settings.autoPrintInvoice);
  }, [settings.shopName, settings.printerType]);

  // Fetch Staff Users
  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const res = await api.get<StaffUser[]>('/users');
      setStaffList(res.data);
    } catch {
      // Non-owners might get 403 or error if endpoint restricted
    } finally {
      setLoadingStaff(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'staff') {
      fetchStaff();
    }
  }, [activeSection, fetchStaff]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeSection === 'staff') {
      fetchStaff();
    } else {
      setRefreshing(false);
    }
  };

  // Save Shop Profile
  const handleSaveShopProfile = () => {
    if (!shopName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Shop name cannot be blank.',
      });
      return;
    }

    settings.updateSettings({
      shopName: shopName.trim(),
      shopTagline: shopTagline.trim(),
      shopAddress: shopAddress.trim(),
      shopMobile: shopMobile.trim(),
      shopGstin: shopGstin.trim(),
      invoiceFooterNote: invoiceFooterNote.trim(),
    });

    Toast.show({
      type: 'success',
      text1: 'Shop Profile Updated',
      text2: 'Receipt branding and shop details updated.',
    });
  };

  // Save POS Preferences
  const handleSavePosPreferences = () => {
    const taxNum = parseFloat(defaultTaxRate);
    const validTax = isNaN(taxNum) ? 0 : Math.max(0, taxNum);

    settings.updateSettings({
      printerType: selectedPrinter,
      defaultTaxRate: validTax,
      autoPrintInvoice,
    });

    Toast.show({
      type: 'success',
      text1: 'POS Preferences Saved',
      text2: `Printer format set to ${selectedPrinter}.`,
    });
  };

  // Add Staff Member
  const handleAddStaff = async () => {
    setStaffError(null);

    if (!newStaffName.trim() || !newStaffMobile.trim() || !newStaffPassword.trim()) {
      setStaffError('Please enter name, mobile number, and password.');
      return;
    }

    if (newStaffPassword.length < 6) {
      setStaffError('Password must be at least 6 characters.');
      return;
    }

    try {
      setSavingStaff(true);
      await api.post('/users', {
        name: newStaffName.trim(),
        mobile: newStaffMobile.trim(),
        password: newStaffPassword,
        role: newStaffRole,
      });

      Toast.show({
        type: 'success',
        text1: 'Staff Member Added',
        text2: `${newStaffName} was added as ${newStaffRole}.`,
      });

      setAddStaffVisible(false);
      setNewStaffName('');
      setNewStaffMobile('');
      setNewStaffPassword('');
      fetchStaff();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add staff member.';
      setStaffError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSavingStaff(false);
    }
  };

  // Update Staff Role
  const handleUpdateRole = async (targetRole: UserRole) => {
    if (!userToEdit) return;

    try {
      setUpdatingRole(true);
      await api.patch(`/users/${userToEdit.id}/role`, { role: targetRole });

      Toast.show({
        type: 'success',
        text1: 'Role Updated',
        text2: `${userToEdit.name} role changed to ${targetRole}.`,
      });

      setEditRoleVisible(false);
      setUserToEdit(null);
      fetchStaff();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err.response?.data?.message || 'Could not update role.',
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = (staff: StaffUser) => {
    if (staff.id === user?.id) {
      Toast.show({
        type: 'error',
        text1: 'Action Not Allowed',
        text2: 'You cannot remove your own active account.',
      });
      return;
    }

    const confirmDelete = async () => {
      try {
        await api.delete(`/users/${staff.id}`);
        Toast.show({
          type: 'success',
          text1: 'Staff Removed',
          text2: `${staff.name} has been removed.`,
        });
        fetchStaff();
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Cannot Delete Staff',
          text2: err.response?.data?.message || 'Failed to delete staff member.',
        });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to remove staff member ${staff.name}?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Remove Staff Member',
        `Are you sure you want to remove ${staff.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const getRoleVariant = (role: UserRole) => {
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
    <View style={styles.screen}>
      <AppHeader
        title="Settings & Staff"
        subtitle="Shop Profile, POS & Staff Roles"
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
        {/* Navigation Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.tabChip, activeSection === 'shop' && styles.tabChipActive]}
            onPress={() => setActiveSection('shop')}
          >
            <Text
              style={[
                styles.tabChipText,
                activeSection === 'shop' && styles.tabChipTextActive,
              ]}
            >
              🏪 Shop Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeSection === 'pos' && styles.tabChipActive]}
            onPress={() => setActiveSection('pos')}
          >
            <Text
              style={[
                styles.tabChipText,
                activeSection === 'pos' && styles.tabChipTextActive,
              ]}
            >
              🖨️ POS & Printing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeSection === 'staff' && styles.tabChipActive]}
            onPress={() => setActiveSection('staff')}
          >
            <Text
              style={[
                styles.tabChipText,
                activeSection === 'staff' && styles.tabChipTextActive,
              ]}
            >
              👥 Staff & Roles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeSection === 'account' && styles.tabChipActive]}
            onPress={() => setActiveSection('account')}
          >
            <Text
              style={[
                styles.tabChipText,
                activeSection === 'account' && styles.tabChipTextActive,
              ]}
            >
              🔒 Account
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ========================================================= */}
        {/* SECTION 1: SHOP PROFILE & BRANDING                        */}
        {/* ========================================================= */}
        {activeSection === 'shop' && (
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Store Branding & Header</Text>
              <Text style={styles.cardDesc}>
                This information appears on your receipts, printed bills, and WhatsApp invoices.
              </Text>
            </View>

            <Input
              label="Shop / Business Name *"
              value={shopName}
              onChangeText={setShopName}
              placeholder="e.g. ReadyBill Supermarket"
            />

            <Input
              label="Business Tagline / Subtitle"
              value={shopTagline}
              onChangeText={setShopTagline}
              placeholder="e.g. Smart Retail & Groceries"
            />

            <Input
              label="Store Address"
              value={shopAddress}
              onChangeText={setShopAddress}
              placeholder="e.g. Shop 12, Main Street"
            />

            <View style={styles.rowTwoInputs}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Contact Phone / WhatsApp"
                  value={shopMobile}
                  onChangeText={setShopMobile}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="GSTIN / Tax No"
                  value={shopGstin}
                  onChangeText={setShopGstin}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                />
              </View>
            </View>

            <Input
              label="Receipt Footer Note / Return Policy"
              value={invoiceFooterNote}
              onChangeText={setInvoiceFooterNote}
              placeholder="e.g. Goods once sold cannot be returned. Thank you!"
            />

            <Button
              title="Save Shop Profile"
              variant="primary"
              size="md"
              onPress={handleSaveShopProfile}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: POS & PRINTING PREFERENCES                     */}
        {/* ========================================================= */}
        {activeSection === 'pos' && (
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Receipt Printer Configuration</Text>
              <Text style={styles.cardDesc}>
                Select the default layout format optimized for your counter receipt printer.
              </Text>
            </View>

            {PRINTER_OPTIONS.map((opt) => {
              const isSelected = selectedPrinter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.printerChoiceCard,
                    isSelected && styles.printerChoiceCardSelected,
                  ]}
                  onPress={() => setSelectedPrinter(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioCircle}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.printerLabel,
                        isSelected && styles.printerLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.printerDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Tax & Calculation Defaults</Text>
            </View>

            <Input
              label="Default Tax Rate (%)"
              value={defaultTaxRate}
              onChangeText={setDefaultTaxRate}
              placeholder="0"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setAutoPrintInvoice(!autoPrintInvoice)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Auto-Open Receipt</Text>
                <Text style={styles.toggleDesc}>
                  Automatically navigate to receipt slip after checkout
                </Text>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  autoPrintInvoice && styles.toggleSwitchActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleSwitchDot,
                    autoPrintInvoice && styles.toggleSwitchDotActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <Button
              title="Save POS Preferences"
              variant="primary"
              size="md"
              onPress={handleSavePosPreferences}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {/* ========================================================= */}
        {/* SECTION 3: STAFF & USER ROLES                             */}
        {/* ========================================================= */}
        {activeSection === 'staff' && (
          <View style={styles.cardSection}>
            <View style={styles.staffHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Staff Accounts & Permissions</Text>
                <Text style={styles.cardDesc}>
                  Manage store cashiers, floor managers, and system administrators.
                </Text>
              </View>
              <Button
                title="+ Add Staff"
                variant="primary"
                size="sm"
                onPress={() => {
                  setStaffError(null);
                  setAddStaffVisible(true);
                }}
              />
            </View>

            {loadingStaff ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingBoxText}>Loading staff records...</Text>
              </View>
            ) : staffList.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No Staff Accounts Found"
                description="Click '+ Add Staff' to create your first team member login."
                actionTitle="+ Add Staff Member"
                onAction={() => setAddStaffVisible(true)}
              />
            ) : (
              <View style={styles.staffList}>
                {staffList.map((staff) => {
                  const isCurrent = staff.id === user?.id;
                  return (
                    <View key={staff.id} style={styles.staffCard}>
                      <View style={styles.staffLeft}>
                        <View style={styles.staffAvatar}>
                          <Text style={styles.staffInitial}>
                            {staff.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.staffNameRow}>
                            <Text style={styles.staffName}>{staff.name}</Text>
                            {isCurrent && (
                              <Badge label="YOU" variant="neutral" size="sm" />
                            )}
                            <Badge
                              label={staff.role}
                              variant={getRoleVariant(staff.role)}
                              size="sm"
                            />
                          </View>
                          <Text style={styles.staffMobile}>📞 +91 {staff.mobile}</Text>
                          {staff._count ? (
                            <Text style={styles.staffMetrics}>
                              {staff._count.sales} bills • {staff._count.payments} collections
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.staffActions}>
                        <TouchableOpacity
                          style={styles.btnActionSecondary}
                          onPress={() => {
                            setUserToEdit(staff);
                            setEditRoleVisible(true);
                          }}
                        >
                          <Text style={styles.btnActionSecondaryText}>Role</Text>
                        </TouchableOpacity>

                        {!isCurrent && (
                          <TouchableOpacity
                            style={styles.btnActionDanger}
                            onPress={() => handleDeleteStaff(staff)}
                          >
                            <Text style={styles.btnActionDangerText}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Role Permissions Matrix Card */}
            <View style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>Role Capabilities Matrix</Text>
              <View style={styles.permissionRow}>
                <Text style={styles.permissionRole}>👑 OWNER</Text>
                <Text style={styles.permissionDesc}>
                  Full access: Billing, Khata, Inventory, Payments, Reports, Staff & Settings
                </Text>
              </View>
              <View style={styles.permissionRow}>
                <Text style={styles.permissionRole}>💼 MANAGER</Text>
                <Text style={styles.permissionDesc}>
                  Operational access: POS Billing, Customer Khata, Product Inventory & Reports
                </Text>
              </View>
              <View style={styles.permissionRow}>
                <Text style={styles.permissionRole}>🧾 CASHIER</Text>
                <Text style={styles.permissionDesc}>
                  POS Checkout, Cash/UPI Payment collections, and Customer Khata records
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* SECTION 4: ACCOUNT & SESSION                              */}
        {/* ========================================================= */}
        {activeSection === 'account' && (
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>My Active Profile</Text>
            </View>

            <View style={styles.accountProfileBox}>
              <View style={styles.profileAvatarBig}>
                <Text style={styles.profileAvatarText}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileMobile}>+91 {user?.mobile}</Text>
                <View style={{ marginTop: 4 }}>
                  <Badge
                    label={`ROLE: ${user?.role || 'USER'}`}
                    variant={getRoleVariant(user?.role || 'CASHIER')}
                    size="md"
                  />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sessionStatusBox}>
              <View style={styles.activeDot} />
              <Text style={styles.sessionStatusText}>
                Active JWT Session • Connected to ReadyBill Core
              </Text>
            </View>

            <Button
              title="Logout from Account"
              variant="danger"
              size="md"
              fullWidth
              onPress={() => {
                logout();
                Toast.show({
                  type: 'info',
                  text1: 'Signed Out',
                  text2: 'Session closed successfully.',
                });
                router.replace('/auth/login' as any);
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: ADD STAFF MEMBER                                   */}
      {/* ========================================================= */}
      <Modal
        visible={addStaffVisible}
        title="Add Team Member"
        onClose={() => setAddStaffVisible(false)}
      >
        <ScrollView style={{ maxHeight: 440 }}>
          {staffError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{staffError}</Text>
            </View>
          )}

          <Input
            label="Full Name *"
            placeholder="e.g. Ramesh Kumar"
            value={newStaffName}
            onChangeText={setNewStaffName}
          />

          <Input
            label="Mobile Number (Login ID) *"
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            value={newStaffMobile}
            onChangeText={setNewStaffMobile}
          />

          <Input
            label="Initial Password (min 6 chars) *"
            placeholder="Create password"
            secureTextEntry
            value={newStaffPassword}
            onChangeText={setNewStaffPassword}
          />

          <Text style={styles.rolePickerLabel}>Assign Role *</Text>
          <View style={styles.roleChoiceRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChoiceBtn,
                  newStaffRole === r && styles.roleChoiceBtnSelected,
                ]}
                onPress={() => setNewStaffRole(r)}
              >
                <Text
                  style={[
                    styles.roleChoiceText,
                    newStaffRole === r && styles.roleChoiceTextSelected,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalBtnRow}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              style={{ flex: 1 }}
              onPress={() => setAddStaffVisible(false)}
              disabled={savingStaff}
            />
            <Button
              title={savingStaff ? 'Saving...' : 'Add Staff'}
              variant="primary"
              size="md"
              style={{ flex: 1 }}
              onPress={handleAddStaff}
              loading={savingStaff}
              disabled={savingStaff}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: CHANGE STAFF ROLE                                  */}
      {/* ========================================================= */}
      <Modal
        visible={editRoleVisible}
        title="Change Staff Role"
        onClose={() => setEditRoleVisible(false)}
      >
        {userToEdit && (
          <View>
            <Text style={styles.modalSubtitle}>
              Update permissions role for <Text style={{ fontWeight: '800' }}>{userToEdit.name}</Text>:
            </Text>

            <View style={styles.roleEditStack}>
              {ROLES.map((r) => {
                const isSelected = userToEdit.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleEditOption,
                      isSelected && styles.roleEditOptionSelected,
                    ]}
                    onPress={() => handleUpdateRole(r)}
                    disabled={updatingRole}
                  >
                    <View style={styles.radioCircle}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.roleEditTitle,
                          isSelected && styles.roleEditTitleSelected,
                        ]}
                      >
                        {r}
                      </Text>
                      <Text style={styles.roleEditDesc}>
                        {r === 'OWNER'
                          ? 'Full administrative control and business analytics'
                          : r === 'MANAGER'
                          ? 'Inventory, billing, and customer Khata management'
                          : 'POS checkout & payment collection counter'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setEditRoleVisible(false)}
              style={{ marginTop: 12 }}
            />
          </View>
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
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  tabChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabChipTextActive: {
    color: COLORS.info,
  },
  cardSection: {
    backgroundColor: COLORS.bgCard,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  rowTwoInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  printerChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bgDark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 10,
  },
  printerChoiceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  printerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  printerLabelSelected: {
    color: COLORS.info,
  },
  printerDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginTop: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  toggleDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary,
  },
  toggleSwitchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleSwitchDotActive: {
    alignSelf: 'flex-end',
  },
  staffHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingBoxText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  staffList: {
    gap: 10,
    marginBottom: 16,
  },
  staffCard: {
    backgroundColor: COLORS.bgDark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffInitial: {
    color: COLORS.primaryLight,
    fontWeight: '800',
    fontSize: 16,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  staffMobile: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  staffMetrics: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  staffActions: {
    flexDirection: 'row',
    gap: 6,
  },
  btnActionSecondary: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  btnActionSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  btnActionDanger: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnActionDangerText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  permissionCard: {
    backgroundColor: COLORS.bgDark,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  permissionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  permissionRow: {
    marginBottom: 8,
  },
  permissionRole: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  permissionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  accountProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatarBig: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: COLORS.primaryLight,
    fontSize: 22,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileMobile: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sessionStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  sessionStatusText: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
  },
  errorBox: {
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
  rolePickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  roleChoiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  roleChoiceBtnSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  roleChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  roleChoiceTextSelected: {
    color: COLORS.info,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  roleEditStack: {
    gap: 8,
  },
  roleEditOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bgDark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  roleEditOptionSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  roleEditTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roleEditTitleSelected: {
    color: COLORS.info,
  },
  roleEditDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
