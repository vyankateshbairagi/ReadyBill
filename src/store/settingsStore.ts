import { create } from 'zustand';
import { Platform } from 'react-native';

export type PrinterType = 'THERMAL_58' | 'THERMAL_80' | 'STANDARD_A4';

export interface ShopSettings {
  shopName: string;
  shopTagline: string;
  shopAddress: string;
  shopMobile: string;
  shopGstin: string;
  invoiceFooterNote: string;
  printerType: PrinterType;
  defaultTaxRate: number;
  autoPrintInvoice: boolean;
}

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'ReadyBill Supermarket',
  shopTagline: 'Smart POS & Khata System',
  shopAddress: 'Shop No. 12, Commercial Market Center',
  shopMobile: '9876543210',
  shopGstin: '27AAAAA0000A1Z5',
  invoiceFooterNote: 'Thank you for shopping with us! Please visit again.',
  printerType: 'THERMAL_80',
  defaultTaxRate: 0,
  autoPrintInvoice: true,
};

const STORAGE_KEY_SETTINGS = 'readybill_shop_settings';

function getStoredSettings(): ShopSettings | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function setStoredSettings(settings: ShopSettings): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }
}

interface SettingsState extends ShopSettings {
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  resetDefaults: () => void;
  initializeSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  initializeSettings: () => {
    const saved = getStoredSettings();
    if (saved) {
      set({ ...DEFAULT_SETTINGS, ...saved });
    }
  },

  updateSettings: (newSettings: Partial<ShopSettings>) => {
    const current = get();
    const updated: ShopSettings = {
      shopName: newSettings.shopName ?? current.shopName,
      shopTagline: newSettings.shopTagline ?? current.shopTagline,
      shopAddress: newSettings.shopAddress ?? current.shopAddress,
      shopMobile: newSettings.shopMobile ?? current.shopMobile,
      shopGstin: newSettings.shopGstin ?? current.shopGstin,
      invoiceFooterNote: newSettings.invoiceFooterNote ?? current.invoiceFooterNote,
      printerType: newSettings.printerType ?? current.printerType,
      defaultTaxRate: newSettings.defaultTaxRate ?? current.defaultTaxRate,
      autoPrintInvoice: newSettings.autoPrintInvoice ?? current.autoPrintInvoice,
    };

    setStoredSettings(updated);
    set(updated);
  },

  resetDefaults: () => {
    setStoredSettings(DEFAULT_SETTINGS);
    set(DEFAULT_SETTINGS);
  },
}));
