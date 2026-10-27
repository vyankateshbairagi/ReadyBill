import { create } from 'zustand';
import { Platform } from 'react-native';
import { api } from '../services/api';

export interface DraftSaleItem {
  productId: string;
  name?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface DraftSale {
  tempId: string;
  customerId?: string;
  customerName?: string;
  items: DraftSaleItem[];
  discount: number;
  subtotal: number;
  total: number;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED';
  errorMessage?: string;
}

export interface CachedProduct {
  id: string;
  name: string;
  code?: string;
  price: number;
  stock: number;
  category?: string;
}

export interface CachedCustomer {
  id: string;
  name: string;
  mobile: string;
  balance: number;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  offlineQueue: DraftSale[];
  cachedProducts: CachedProduct[];
  cachedCustomers: CachedCustomer[];

  setIsOnline: (status: boolean) => void;
  enqueueDraftSale: (draft: Omit<DraftSale, 'tempId' | 'createdAt' | 'syncStatus'>) => DraftSale;
  removeDraftSale: (tempId: string) => void;
  clearQueue: () => void;
  cacheProducts: (products: CachedProduct[]) => void;
  cacheCustomers: (customers: CachedCustomer[]) => void;
  syncOfflineQueue: () => Promise<{ successCount: number; failCount: number }>;
  initializeSync: () => void;
}

const STORAGE_KEY_QUEUE = 'readybill_offline_queue';
const STORAGE_KEY_PRODUCTS = 'readybill_cached_products';
const STORAGE_KEY_CUSTOMERS = 'readybill_cached_customers';

function getStoredJson<T>(key: string): T | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function setStoredJson<T>(key: string, data: T): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  offlineQueue: [],
  cachedProducts: [],
  cachedCustomers: [],

  setIsOnline: (status: boolean) => set({ isOnline: status }),

  initializeSync: () => {
    const savedQueue = getStoredJson<DraftSale[]>(STORAGE_KEY_QUEUE) || [];
    const savedProducts = getStoredJson<CachedProduct[]>(STORAGE_KEY_PRODUCTS) || [];
    const savedCustomers = getStoredJson<CachedCustomer[]>(STORAGE_KEY_CUSTOMERS) || [];

    set({
      offlineQueue: savedQueue,
      cachedProducts: savedProducts,
      cachedCustomers: savedCustomers,
    });
  },

  enqueueDraftSale: (draft) => {
    const tempId = `DRAFT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const newDraft: DraftSale = {
      ...draft,
      tempId,
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };

    const currentQueue = get().offlineQueue;
    const updatedQueue = [newDraft, ...currentQueue];

    setStoredJson(STORAGE_KEY_QUEUE, updatedQueue);
    set({ offlineQueue: updatedQueue });

    return newDraft;
  },

  removeDraftSale: (tempId: string) => {
    const updated = get().offlineQueue.filter((d) => d.tempId !== tempId);
    setStoredJson(STORAGE_KEY_QUEUE, updated);
    set({ offlineQueue: updated });
  },

  clearQueue: () => {
    setStoredJson(STORAGE_KEY_QUEUE, []);
    set({ offlineQueue: [] });
  },

  cacheProducts: (products) => {
    setStoredJson(STORAGE_KEY_PRODUCTS, products);
    set({ cachedProducts: products });
  },

  cacheCustomers: (customers) => {
    setStoredJson(STORAGE_KEY_CUSTOMERS, customers);
    set({ cachedCustomers: customers });
  },

  syncOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return { successCount: 0, failCount: 0 };

    set({ isSyncing: true });
    let successCount = 0;
    let failCount = 0;
    const remainingQueue: DraftSale[] = [];

    for (const draft of queue) {
      try {
        await api.post('/sales', {
          customerId: draft.customerId || undefined,
          discount: draft.discount,
          items: draft.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        remainingQueue.push({
          ...draft,
          syncStatus: 'FAILED',
          errorMessage: err.response?.data?.message || 'Sync network error',
        });
      }
    }

    setStoredJson(STORAGE_KEY_QUEUE, remainingQueue);
    set({
      offlineQueue: remainingQueue,
      isSyncing: false,
      isOnline: failCount === 0,
    });

    return { successCount, failCount };
  },
}));
