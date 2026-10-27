import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
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
import { useSyncStore } from '../../store/syncStore';

export interface Product {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  price: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  balance: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface RecentSale {
  id: string;
  invoiceNo: string;
  total: number;
  createdAt: string;
  customer?: { name: string; mobile: string } | null;
  user: { name: string };
  _count: { items: number };
}

export default function BillingScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Catalog Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);

  // Mobile View Tab: 'CATALOG' | 'CART'
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'CART'>('CATALOG');

  // Submitting Sale
  const [submitting, setSubmitting] = useState(false);

  // Past Bills History Modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const syncStore = useSyncStore();

  const isWebOrTablet = Platform.OS === 'web';

  const fetchData = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
      ]);
      setProducts(prodRes.data);
      setCustomers(custRes.data);
      syncStore.cacheProducts(prodRes.data);
      syncStore.cacheCustomers(custRes.data);
      syncStore.setIsOnline(true);
    } catch (err: any) {
      syncStore.setIsOnline(false);
      if (syncStore.cachedProducts.length > 0) {
        setProducts(syncStore.cachedProducts as any);
        setCustomers(syncStore.cachedCustomers as any);
        Toast.show({
          type: 'info',
          text1: 'Offline Mode Active',
          text2: `Loaded ${syncStore.cachedProducts.length} products from offline cache.`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to load catalog',
          text2: err.response?.data?.message || 'Check API connectivity.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncStore.initializeSync();
    fetchData();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/sales');
      setRecentSales(res.data);
      setHistoryModalVisible(true);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load bill history',
        text2: err.response?.data?.message || 'Check connection.',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === 'ALL' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Filtered Customers for picker
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)
    );
  }, [customers, customerSearch]);

  // Cart Management
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Out of Stock',
        text2: `${product.name} is currently out of stock.`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Toast.show({
            type: 'info',
            text1: 'Max Stock Reached',
            text2: `Only ${product.stock} units available in stock.`,
          });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > product.stock) {
      Toast.show({
        type: 'info',
        text1: 'Max Stock Reached',
        text2: `Only ${product.stock} units available.`,
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('0');
    setSelectedCustomer(null);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const d = parseFloat(discount);
    if (isNaN(d) || d < 0) return 0;
    return Math.min(d, subtotal);
  }, [discount, subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Complete Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Cart is Empty',
        text2: 'Please add at least one product to the cart.',
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        discount: discountAmount,
      };

      if (selectedCustomer) {
        payload.customerId = selectedCustomer.id;
      }

      const response = await api.post('/sales', payload);
      const saleResult = response.data.sale || response.data;

      Toast.show({
        type: 'success',
        text1: 'Bill Generated Successfully!',
        text2: `Invoice #${saleResult.invoiceNo} — ₹${saleResult.total}`,
      });

      // Clear cart
      clearCart();

      // Navigate to printable invoice receipt
      router.push(`/billing/${saleResult.id}` as any);
    } catch (err: any) {
      // Offline fallback: queue draft bill locally
      if (!err.response || err.message?.includes('Network') || !syncStore.isOnline) {
        const draft = syncStore.enqueueDraftSale({
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          items: cart.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
          })),
          discount: discountAmount,
          subtotal,
          total: grandTotal,
        });

        clearCart();
        Toast.show({
          type: 'success',
          text1: 'Bill Saved Offline',
          text2: `Queued #${draft.tempId}. Will auto-sync when online.`,
        });
        return;
      }

      const msg = err.response?.data?.message || 'Failed to complete sale.';
      Toast.show({
        type: 'error',
        text1: 'Checkout Failed',
        text2: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="POS Billing Terminal"
        subtitle="Quick Product Entry & Invoicing"
        rightAction={
          <Button
            title="📜 Bills History"
            variant="outline"
            size="sm"
            onPress={fetchHistory}
            loading={loadingHistory}
          />
        }
      />

      {/* Offline Sync Banner if pending bills exist */}
      {syncStore.offlineQueue.length > 0 && (
        <View style={styles.offlineBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.offlineBannerTitle}>
              ⚡ {syncStore.offlineQueue.length} Draft Bill(s) Queued Offline
            </Text>
            <Text style={styles.offlineBannerSub}>
              Created without internet. Tap to sync with cloud.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={async () => {
              const result = await syncStore.syncOfflineQueue();
              Toast.show({
                type: result.failCount === 0 ? 'success' : 'info',
                text1: 'Sync Finished',
                text2: `Uploaded ${result.successCount} bill(s). ${result.failCount > 0 ? `${result.failCount} failed.` : ''}`,
              });
              if (result.successCount > 0) {
                fetchData();
              }
            }}
            disabled={syncStore.isSyncing}
          >
            <Text style={styles.syncBtnText}>
              {syncStore.isSyncing ? 'Syncing...' : 'Sync Now ❯'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile Tab Toggle */}
      {!isWebOrTablet && (
        <View style={styles.mobileTabBar}>
          <TouchableOpacity
            style={[styles.mobileTab, activeTab === 'CATALOG' && styles.mobileTabActive]}
            onPress={() => setActiveTab('CATALOG')}
          >
            <Text
              style={[
                styles.mobileTabText,
                activeTab === 'CATALOG' && styles.mobileTabTextActive,
              ]}
            >
              🛍️ Products Catalog
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeTab === 'CART' && styles.mobileTabActive]}
            onPress={() => setActiveTab('CART')}
          >
            <Text
              style={[
                styles.mobileTabText,
                activeTab === 'CART' && styles.mobileTabTextActive,
              ]}
            >
              🛒 Cart ({totalItemsCount}) — ₹{grandTotal.toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Initializing POS Terminal...</Text>
        </View>
      ) : (
        <View style={styles.mainLayout}>
          {/* LEFT: Product Catalog Picker */}
          {(isWebOrTablet || activeTab === 'CATALOG') && (
            <View style={styles.catalogCol}>
              {/* Search */}
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search products or scan barcode..."
                style={styles.searchBar}
              />

              {/* Category Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
                contentContainerStyle={styles.categoriesContent}
              >
                <TouchableOpacity
                  style={[
                    styles.catChip,
                    selectedCategory === 'ALL' && styles.catChipActive,
                  ]}
                  onPress={() => setSelectedCategory('ALL')}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      selectedCategory === 'ALL' && styles.catChipTextActive,
                    ]}
                  >
                    All ({products.length})
                  </Text>
                </TouchableOpacity>

                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      selectedCategory.toLowerCase() === cat.toLowerCase() &&
                        styles.catChipActive,
                    ]}
                    onPress={() =>
                      setSelectedCategory(
                        selectedCategory.toLowerCase() === cat.toLowerCase() ? 'ALL' : cat
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selectedCategory.toLowerCase() === cat.toLowerCase() &&
                          styles.catChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Products List / Grid */}
              <ScrollView
                contentContainerStyle={styles.productsGrid}
                showsVerticalScrollIndicator={false}
              >
                {filteredProducts.length === 0 ? (
                  <EmptyState
                    icon="🔍"
                    title="No Matching Products"
                    description="No items match your search. Add products in the Inventory module."
                  />
                ) : (
                  filteredProducts.map((p) => {
                    const inCart = cart.find((item) => item.product.id === p.id);
                    const isOutOfStock = p.stock <= 0;

                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.productCard,
                          inCart && styles.productCardInCart,
                          isOutOfStock && styles.productCardDisabled,
                        ]}
                        onPress={() => addToCart(p)}
                        disabled={isOutOfStock}
                        activeOpacity={0.7}
                      >
                        <View style={styles.prodTopRow}>
                          <Text style={styles.prodName} numberOfLines={2}>
                            {p.name}
                          </Text>
                          {inCart && (
                            <View style={styles.inCartBadge}>
                              <Text style={styles.inCartBadgeText}>
                                {inCart.quantity} in cart
                              </Text>
                            </View>
                          )}
                        </View>

                        {p.category ? (
                          <Text style={styles.prodCategory}>{p.category}</Text>
                        ) : null}

                        <View style={styles.prodBottomRow}>
                          <Text style={styles.prodPrice}>
                            ₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                          <Text
                            style={[
                              styles.prodStock,
                              p.stock <= 10 ? { color: COLORS.warningLight } : null,
                              isOutOfStock ? { color: COLORS.dangerLight } : null,
                            ]}
                          >
                            {isOutOfStock ? 'Out of stock' : `${p.stock} left`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {/* RIGHT: Cart & Checkout Sheet */}
          {(isWebOrTablet || activeTab === 'CART') && (
            <View style={styles.cartCol}>
              <View style={styles.cartCard}>
                {/* Cart Header */}
                <View style={styles.cartHeader}>
                  <Text style={styles.cartTitle}>Current Cart</Text>
                  {cart.length > 0 && (
                    <TouchableOpacity onPress={clearCart}>
                      <Text style={styles.clearCartText}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Customer Khata Selector */}
                <View style={styles.customerBox}>
                  <Text style={styles.customerBoxLabel}>CUSTOMER (FOR KHATA/CREDIT)</Text>
                  <TouchableOpacity
                    style={styles.customerSelector}
                    onPress={() => setCustomerPickerVisible(true)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerSelectedName}>
                        {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer (Cash)'}
                      </Text>
                      {selectedCustomer ? (
                        <Text style={styles.customerSelectedSub}>
                          📞 {selectedCustomer.mobile} • Balance: ₹
                          {selectedCustomer.balance.toLocaleString('en-IN')}
                        </Text>
                      ) : (
                        <Text style={styles.customerSelectedSub}>
                          Tap to select a registered customer to link to Khata
                        </Text>
                      )}
                    </View>
                    <Text style={styles.customerChangeIcon}>
                      {selectedCustomer ? '✕ Remove' : '👤 Select'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Cart Items List */}
                <ScrollView style={styles.cartItemsScroll}>
                  {cart.length === 0 ? (
                    <EmptyState
                      icon="🛒"
                      title="Cart is Empty"
                      description="Tap products on the left catalog to build your invoice."
                    />
                  ) : (
                    cart.map((item) => (
                      <View key={item.product.id} style={styles.cartItemRow}>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName}>{item.product.name}</Text>
                          <Text style={styles.cartItemRate}>
                            ₹{item.product.price} each
                          </Text>
                        </View>

                        {/* Stepper */}
                        <View style={styles.stepperRow}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>

                          <Text style={styles.stepQtyText}>{item.quantity}</Text>

                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Line Total */}
                        <Text style={styles.cartItemTotal}>
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </Text>

                        {/* Remove */}
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => removeFromCart(item.product.id)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Calculation Footer */}
                <View style={styles.calculationFooter}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Subtotal ({totalItemsCount} items)</Text>
                    <Text style={styles.calcValue}>
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Store Discount (₹)</Text>
                    <View style={styles.discountInputWrap}>
                      <Text style={styles.discountPrefix}>₹</Text>
                      <Input
                        value={discount}
                        onChangeText={setDiscount}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        inputStyle={styles.discountInput}
                        containerStyle={{ marginBottom: 0, width: 90 }}
                      />
                    </View>
                  </View>

                  <View style={styles.calcDivider} />

                  <View style={styles.calcGrandRow}>
                    <Text style={styles.grandLabel}>GRAND TOTAL</Text>
                    <Text style={styles.grandValue}>
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  {/* Complete Button */}
                  <Button
                    title={`Complete Sale • ₹${grandTotal.toLocaleString('en-IN')}`}
                    variant="success"
                    size="lg"
                    fullWidth
                    onPress={handleCheckout}
                    loading={submitting}
                    disabled={cart.length === 0 || submitting}
                    style={{ marginTop: 12 }}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Customer Picker Modal */}
      <Modal
        visible={customerPickerVisible}
        onClose={() => setCustomerPickerVisible(false)}
        title="Select Customer for Khata"
        subtitle="Attach invoice to customer's running balance"
      >
        <SearchBar
          value={customerSearch}
          onChangeText={setCustomerSearch}
          placeholder="Search customer by name or phone..."
          style={{ marginBottom: 12 }}
        />

        <TouchableOpacity
          style={styles.customerOptionWalkin}
          onPress={() => {
            setSelectedCustomer(null);
            setCustomerPickerVisible(false);
          }}
        >
          <Text style={styles.customerOptionTitle}>👤 Walk-in Customer</Text>
          <Text style={styles.customerOptionSub}>Cash or Direct payment (No Khata entry)</Text>
        </TouchableOpacity>

        <ScrollView style={{ maxHeight: 300 }}>
          {filteredCustomers.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.customerOption,
                selectedCustomer?.id === c.id && styles.customerOptionActive,
              ]}
              onPress={() => {
                setSelectedCustomer(c);
                setCustomerPickerVisible(false);
              }}
            >
              <View>
                <Text style={styles.customerOptionName}>{c.name}</Text>
                <Text style={styles.customerOptionPhone}>📞 +91 {c.mobile}</Text>
              </View>
              <Badge
                label={c.balance > 0 ? `DUE: ₹${c.balance}` : 'SETTLED'}
                variant={c.balance > 0 ? 'danger' : 'success'}
                size="sm"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>

      {/* Bills History Modal */}
      <Modal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        title="Recent Invoices"
        subtitle="Latest bills generated on this POS terminal"
        maxWidth={540}
      >
        {recentSales.length === 0 ? (
          <EmptyState icon="📜" title="No Sales Recorded" description="Complete bills to see history." />
        ) : (
          <ScrollView style={{ maxHeight: 420 }}>
            {recentSales.map((sale) => (
              <TouchableOpacity
                key={sale.id}
                style={styles.historyRow}
                onPress={() => {
                  setHistoryModalVisible(false);
                  router.push(`/billing/${sale.id}` as any);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyInvoiceNo}>{sale.invoiceNo}</Text>
                  <Text style={styles.historySub}>
                    {sale.customer ? sale.customer.name : 'Walk-in Customer'} •{' '}
                    {sale._count?.items || 0} items
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyTotal}>
                    ₹{sale.total.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(sale.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
  mobileTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mobileTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primaryLight,
  },
  mobileTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  mobileTabTextActive: {
    color: COLORS.info,
    fontWeight: '700',
  },
  mainLayout: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    padding: 12,
    gap: 12,
  },
  catalogCol: {
    flex: Platform.OS === 'web' ? 3 : 1,
  },
  searchBar: {
    marginBottom: 8,
  },
  categoriesScroll: {
    maxHeight: 40,
    marginBottom: 10,
  },
  categoriesContent: {
    gap: 8,
  },
  catChip: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primaryLight,
  },
  catChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: COLORS.info,
    fontWeight: '700',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 24,
  },
  productCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: Platform.OS === 'web' ? 240 : '48%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    justifyContent: 'space-between',
  },
  productCardInCart: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#1E293B99',
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  prodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  prodName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inCartBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  inCartBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  prodCategory: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  prodBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
    paddingTop: 8,
  },
  prodPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  prodStock: {
    fontSize: 11,
    color: COLORS.successLight,
    fontWeight: '600',
  },
  cartCol: {
    flex: Platform.OS === 'web' ? 2 : 1,
  },
  cartCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    padding: 14,
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clearCartText: {
    fontSize: 12,
    color: COLORS.dangerLight,
    fontWeight: '600',
  },
  customerBox: {
    marginVertical: 10,
    backgroundColor: COLORS.bgDark,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  customerBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerSelectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerSelectedSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerChangeIcon: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: '700',
  },
  cartItemsScroll: {
    flex: 1,
    maxHeight: Platform.OS === 'web' ? 360 : 260,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  cartItemInfo: {
    flex: 2,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cartItemRate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginHorizontal: 8,
  },
  stepBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  stepQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: 6,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 50,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 6,
  },
  deleteBtnText: {
    color: COLORS.dangerLight,
    fontSize: 12,
    fontWeight: '700',
  },
  calculationFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
    paddingTop: 10,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  discountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountPrefix: {
    color: COLORS.textSecondary,
    marginRight: 4,
    fontSize: 12,
  },
  discountInput: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 12,
    height: 32,
    textAlign: 'right',
  },
  calcDivider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 6,
  },
  calcGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  grandValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.successLight,
  },
  customerOptionWalkin: {
    backgroundColor: COLORS.bgDark,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  customerOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customerOptionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  customerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  customerOptionActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  customerOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  customerOptionPhone: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  historyInvoiceNo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  historySub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.successLight,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  offlineBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
  },
  offlineBannerSub: {
    fontSize: 11,
    color: '#FDE68A',
    marginTop: 1,
  },
  syncBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
});
