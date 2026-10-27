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
  Alert,
} from 'react-native';
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

export interface Product {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: err.response?.data?.message || 'Check API connectivity.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Low stock count
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= 10).length;
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      // Category filter
      const matchCategory =
        selectedCategory === 'ALL' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      // Low stock filter
      const matchLowStock = !showLowStockOnly || p.stock <= 10;

      return matchSearch && matchCategory && matchLowStock;
    });
  }, [products, searchQuery, selectedCategory, showLowStockOnly]);

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCode('');
    setFormCategory('');
    setFormPrice('');
    setFormStock('');
    setFormError(null);
    setModalVisible(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCode(product.code || '');
    setFormCategory(product.category || '');
    setFormPrice(String(product.price));
    setFormStock(String(product.stock));
    setFormError(null);
    setModalVisible(true);
  };

  // Save product (POST or PATCH)
  const handleSaveProduct = async () => {
    setFormError(null);

    const name = formName.trim();
    const code = formCode.trim();
    const category = formCategory.trim();
    const priceNum = parseFloat(formPrice);
    const stockNum = parseInt(formStock, 10);

    if (!name) {
      setFormError('Product name is required.');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Please enter a valid price (≥ 0).');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError('Please enter a valid stock quantity (≥ 0).');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name,
        price: priceNum,
        stock: stockNum,
      };
      if (code) payload.code = code;
      if (category) payload.category = category;

      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload);
        Toast.show({
          type: 'success',
          text1: 'Product Updated',
          text2: `${name} has been updated.`,
        });
      } else {
        await api.post('/products', payload);
        Toast.show({
          type: 'success',
          text1: 'Product Added',
          text2: `${name} added to inventory.`,
        });
      }

      setModalVisible(false);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save product.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete product
  const confirmDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalVisible(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/products/${productToDelete.id}`);
      Toast.show({
        type: 'success',
        text1: 'Product Deleted',
        text2: `${productToDelete.name} was removed.`,
      });
      setDeleteModalVisible(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Cannot delete product because it has recorded sale invoices.';
      Toast.show({
        type: 'error',
        text1: 'Cannot Delete Product',
        text2: msg,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return <Badge label="OUT OF STOCK" variant="danger" size="sm" dot />;
    }
    if (stock <= 10) {
      return <Badge label={`LOW STOCK (${stock})`} variant="warning" size="sm" dot />;
    }
    return <Badge label={`IN STOCK (${stock})`} variant="success" size="sm" dot />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Products & Inventory"
        subtitle={`${products.length} items cataloged`}
        rightAction={
          <Button
            title="+ Add Product"
            variant="primary"
            size="sm"
            onPress={handleOpenAddModal}
          />
        }
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, code or category..."
          style={styles.searchBar}
        />

        {/* Filter Chips Bar */}
        <View style={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === 'ALL' && !showLowStockOnly && styles.filterChipActive,
            ]}
            onPress={() => {
              setSelectedCategory('ALL');
              setShowLowStockOnly(false);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'ALL' && !showLowStockOnly && styles.filterChipTextActive,
              ]}
            >
              All ({products.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, showLowStockOnly && styles.filterChipActiveDanger]}
            onPress={() => setShowLowStockOnly(!showLowStockOnly)}
          >
            <Text
              style={[
                styles.filterChipText,
                showLowStockOnly && styles.filterChipTextActiveDanger,
              ]}
            >
              ⚠️ Low Stock ({lowStockCount})
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                selectedCategory.toLowerCase() === cat.toLowerCase() && styles.filterChipActive,
              ]}
              onPress={() => {
                setShowLowStockOnly(false);
                setSelectedCategory(
                  selectedCategory.toLowerCase() === cat.toLowerCase() ? 'ALL' : cat
                );
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory.toLowerCase() === cat.toLowerCase() &&
                    styles.filterChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Product List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Loading Product Catalog...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchProducts();
                }}
                tintColor="#38BDF8"
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="📦"
                title="No Products Found"
                description={
                  searchQuery || selectedCategory !== 'ALL' || showLowStockOnly
                    ? 'No products match the selected filters.'
                    : 'Start by creating your first product in the inventory.'
                }
                actionTitle="+ Add New Product"
                onAction={handleOpenAddModal}
              />
            }
            renderItem={({ item }) => (
              <Card style={styles.productCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <View style={styles.metaRow}>
                      {item.code ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeText}>{item.code}</Text>
                        </View>
                      ) : null}
                      {item.category ? (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{item.category}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View>{getStockBadge(item.stock)}</View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooterRow}>
                  <View>
                    <Text style={styles.priceLabel}>SELLING PRICE</Text>
                    <Text style={styles.priceValue}>
                      ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={
          editingProduct
            ? `Updating inventory record for ${editingProduct.name}`
            : 'Enter product details to add to catalog'
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
              title={editingProduct ? 'Update Product' : 'Create Product'}
              variant="primary"
              size="md"
              onPress={handleSaveProduct}
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
          label="Product Name"
          placeholder="e.g. Basmati Rice 1kg"
          value={formName}
          onChangeText={setFormName}
          required
        />

        <Input
          label="SKU or Barcode"
          placeholder="e.g. 8901030382910"
          value={formCode}
          onChangeText={setFormCode}
          helperText="Unique identifier for fast billing scanner lookup"
        />

        <Input
          label="Category"
          placeholder="e.g. Grains, Dairy, Beverages, Snacks"
          value={formCategory}
          onChangeText={setFormCategory}
        />

        <Input
          label="Selling Price (₹)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={formPrice}
          onChangeText={setFormPrice}
          prefix={<Text style={styles.currencyPrefix}>₹</Text>}
          required
        />

        <Input
          label="Available Stock Quantity"
          placeholder="0"
          keyboardType="number-pad"
          value={formStock}
          onChangeText={setFormStock}
          helperText="Current count available in store shelf/godown"
          required
        />
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
              title="Delete Product"
              variant="danger"
              size="md"
              onPress={handleDeleteProduct}
              loading={deleting}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <Text style={styles.deleteConfirmText}>
          Are you sure you want to permanently delete{' '}
          <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
            "{productToDelete?.name}"
          </Text>
          ?
        </Text>
        <Text style={styles.deleteWarningText}>
          Note: If this item is recorded in existing invoices, deletion will be blocked to maintain tax & sales history.
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
  searchBar: {
    marginBottom: 10,
  },
  filterScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
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
    color: COLORS.warningLight,
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
  productCard: {
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
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  codeBadge: {
    backgroundColor: '#33415560',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  codeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F630',
  },
  categoryText: {
    fontSize: 11,
    color: COLORS.infoLight,
    fontWeight: '600',
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
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
