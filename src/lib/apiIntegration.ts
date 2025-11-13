/**
 * API Integration Layer
 * Handles automatic updates of nutritional tables and pricing data
 * Connects to external databases (manufacturers, distributors, institutional)
 */

export interface NutritionalData {
  productId: string;
  productName: string;
  manufacturer: string;
  composition: {
    caloriesPer100ml: number;
    proteinPer100ml: number;
    carbohydratesPer100ml: number;
    fatPer100ml: number;
    fiberPer100ml?: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    phosphorus?: number;
  };
  lastUpdated: Date;
  source: string;
}

export interface PricingData {
  productId: string;
  productName: string;
  presentations: Array<{
    size: number; // ml
    unitPrice: number;
    currency: string;
    supplier: string;
    internalCode?: string;
  }>;
  expirationDate?: Date;
  lastUpdated: Date;
  source: string;
}

export interface APIConfig {
  endpoint: string;
  apiKey?: string;
  refreshInterval: number; // minutes
  enabled: boolean;
}

export interface SyncResult {
  success: boolean;
  itemsUpdated: number;
  itemsAdded: number;
  itemsFailed: number;
  errors: string[];
  lastSync: Date;
}

/**
 * Mock API endpoints (in production, these would be real external APIs)
 */
const API_ENDPOINTS = {
  nutritionalData: 'https://api.nutrition-database.com/v1/formulas',
  pricingData: 'https://api.hospital-suppliers.com/v1/pricing',
  manufacturerData: 'https://api.manufacturers.com/v1/products',
  institutionalData: 'https://api.hospital-internal.com/v1/inventory',
};

/**
 * In-memory cache for API data
 */
let nutritionalCache: Map<string, NutritionalData> = new Map();
let pricingCache: Map<string, PricingData> = new Map();
let lastSyncTime: Date | null = null;

/**
 * Fetch nutritional data from external API
 */
export async function fetchNutritionalData(productIds?: string[]): Promise<NutritionalData[]> {
  try {
    // In production, this would be a real API call
    // For now, return mock data
    const mockData: NutritionalData[] = [
      {
        productId: 'f1',
        productName: 'Nutrison Advanced Diason',
        manufacturer: 'Danone Nutricia',
        composition: {
          caloriesPer100ml: 100,
          proteinPer100ml: 4.0,
          carbohydratesPer100ml: 10.6,
          fatPer100ml: 3.9,
          fiberPer100ml: 1.5,
          sodium: 100,
          potassium: 140,
          calcium: 80,
          phosphorus: 80,
        },
        lastUpdated: new Date(),
        source: 'manufacturer_api',
      },
      {
        productId: 'f2',
        productName: 'Fresubin Original',
        manufacturer: 'Fresenius Kabi',
        composition: {
          caloriesPer100ml: 100,
          proteinPer100ml: 3.8,
          carbohydratesPer100ml: 13.8,
          fatPer100ml: 3.4,
          sodium: 120,
          potassium: 150,
          calcium: 100,
          phosphorus: 90,
        },
        lastUpdated: new Date(),
        source: 'manufacturer_api',
      },
      {
        productId: 'f3',
        productName: 'Peptamen',
        manufacturer: 'Nestlé Health Science',
        composition: {
          caloriesPer100ml: 100,
          proteinPer100ml: 4.0,
          carbohydratesPer100ml: 12.7,
          fatPer100ml: 3.9,
          sodium: 110,
          potassium: 130,
          calcium: 85,
          phosphorus: 85,
        },
        lastUpdated: new Date(),
        source: 'manufacturer_api',
      },
      {
        productId: 'f4',
        productName: 'Nutridrink HP',
        manufacturer: 'Danone Nutricia',
        composition: {
          caloriesPer100ml: 150,
          proteinPer100ml: 6.0,
          carbohydratesPer100ml: 18.4,
          fatPer100ml: 4.9,
          sodium: 130,
          potassium: 180,
          calcium: 120,
          phosphorus: 110,
        },
        lastUpdated: new Date(),
        source: 'manufacturer_api',
      },
      {
        productId: 'f7',
        productName: 'Glucerna',
        manufacturer: 'Abbott',
        composition: {
          caloriesPer100ml: 100,
          proteinPer100ml: 4.2,
          carbohydratesPer100ml: 9.4,
          fatPer100ml: 5.4,
          fiberPer100ml: 1.5,
          sodium: 105,
          potassium: 145,
          calcium: 95,
          phosphorus: 95,
        },
        lastUpdated: new Date(),
        source: 'manufacturer_api',
      },
    ];
    
    // Filter by productIds if provided
    if (productIds && productIds.length > 0) {
      return mockData.filter(item => productIds.includes(item.productId));
    }
    
    return mockData;
  } catch (error) {
    console.error('Error fetching nutritional data:', error);
    throw new Error('Failed to fetch nutritional data from API');
  }
}

/**
 * Fetch pricing data from external API
 */
export async function fetchPricingData(productIds?: string[]): Promise<PricingData[]> {
  try {
    // Mock pricing data
    const mockData: PricingData[] = [
      {
        productId: 'f1',
        productName: 'Nutrison Advanced Diason',
        presentations: [
          { size: 500, unitPrice: 12.50, currency: 'BRL', supplier: 'Distribuidora ABC', internalCode: 'NUT-001' },
          { size: 1000, unitPrice: 22.00, currency: 'BRL', supplier: 'Distribuidora ABC', internalCode: 'NUT-002' },
        ],
        lastUpdated: new Date(),
        source: 'supplier_api',
      },
      {
        productId: 'f2',
        productName: 'Fresubin Original',
        presentations: [
          { size: 500, unitPrice: 11.00, currency: 'BRL', supplier: 'Distribuidora XYZ', internalCode: 'FRE-001' },
          { size: 1000, unitPrice: 20.00, currency: 'BRL', supplier: 'Distribuidora XYZ', internalCode: 'FRE-002' },
        ],
        lastUpdated: new Date(),
        source: 'supplier_api',
      },
      {
        productId: 'f3',
        productName: 'Peptamen',
        presentations: [
          { size: 500, unitPrice: 15.00, currency: 'BRL', supplier: 'Distribuidora ABC', internalCode: 'PEP-001' },
        ],
        lastUpdated: new Date(),
        source: 'supplier_api',
      },
      {
        productId: 'f4',
        productName: 'Nutridrink HP',
        presentations: [
          { size: 200, unitPrice: 6.50, currency: 'BRL', supplier: 'Distribuidora ABC', internalCode: 'NDR-001' },
          { size: 500, unitPrice: 14.00, currency: 'BRL', supplier: 'Distribuidora ABC', internalCode: 'NDR-002' },
        ],
        lastUpdated: new Date(),
        source: 'supplier_api',
      },
      {
        productId: 'f7',
        productName: 'Glucerna',
        presentations: [
          { size: 237, unitPrice: 7.00, currency: 'BRL', supplier: 'Distribuidora XYZ', internalCode: 'GLU-001' },
          { size: 500, unitPrice: 13.50, currency: 'BRL', supplier: 'Distribuidora XYZ', internalCode: 'GLU-002' },
        ],
        lastUpdated: new Date(),
        source: 'supplier_api',
      },
    ];
    
    if (productIds && productIds.length > 0) {
      return mockData.filter(item => productIds.includes(item.productId));
    }
    
    return mockData;
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    throw new Error('Failed to fetch pricing data from API');
  }
}

/**
 * Sync all data from external APIs
 */
export async function syncAllData(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    itemsUpdated: 0,
    itemsAdded: 0,
    itemsFailed: 0,
    errors: [],
    lastSync: new Date(),
  };
  
  try {
    // Fetch nutritional data
    const nutritionalData = await fetchNutritionalData();
    nutritionalData.forEach(item => {
      const existing = nutritionalCache.has(item.productId);
      nutritionalCache.set(item.productId, item);
      if (existing) {
        result.itemsUpdated++;
      } else {
        result.itemsAdded++;
      }
    });
    
    // Fetch pricing data
    const pricingData = await fetchPricingData();
    pricingData.forEach(item => {
      const existing = pricingCache.has(item.productId);
      pricingCache.set(item.productId, item);
      if (existing) {
        result.itemsUpdated++;
      } else {
        result.itemsAdded++;
      }
    });
    
    lastSyncTime = new Date();
    result.success = true;
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error during sync');
    result.itemsFailed++;
  }
  
  return result;
}

/**
 * Get nutritional data from cache or fetch if not available
 */
export async function getNutritionalData(productId: string): Promise<NutritionalData | null> {
  // Check cache first
  if (nutritionalCache.has(productId)) {
    return nutritionalCache.get(productId)!;
  }
  
  // Fetch from API
  try {
    const data = await fetchNutritionalData([productId]);
    if (data.length > 0) {
      nutritionalCache.set(productId, data[0]);
      return data[0];
    }
  } catch (error) {
    console.error('Error getting nutritional data:', error);
  }
  
  return null;
}

/**
 * Get pricing data from cache or fetch if not available
 */
export async function getPricingData(productId: string): Promise<PricingData | null> {
  // Check cache first
  if (pricingCache.has(productId)) {
    return pricingCache.get(productId)!;
  }
  
  // Fetch from API
  try {
    const data = await fetchPricingData([productId]);
    if (data.length > 0) {
      pricingCache.set(productId, data[0]);
      return data[0];
    }
  } catch (error) {
    console.error('Error getting pricing data:', error);
  }
  
  return null;
}

/**
 * Calculate cost per ml for a product
 */
export async function calculateCostPerMl(productId: string, preferredSize?: number): Promise<number> {
  const pricingData = await getPricingData(productId);
  
  if (!pricingData || pricingData.presentations.length === 0) {
    return 0.02; // Default fallback cost
  }
  
  // Find the presentation closest to preferred size or use the most economical
  let selectedPresentation = pricingData.presentations[0];
  
  if (preferredSize) {
    selectedPresentation = pricingData.presentations.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.size - preferredSize);
      const currDiff = Math.abs(curr.size - preferredSize);
      return currDiff < prevDiff ? curr : prev;
    });
  } else {
    // Find most economical (lowest cost per ml)
    selectedPresentation = pricingData.presentations.reduce((prev, curr) => {
      const prevCostPerMl = prev.unitPrice / prev.size;
      const currCostPerMl = curr.unitPrice / curr.size;
      return currCostPerMl < prevCostPerMl ? curr : prev;
    });
  }
  
  return selectedPresentation.unitPrice / selectedPresentation.size;
}

/**
 * Get last sync time
 */
export function getLastSyncTime(): Date | null {
  return lastSyncTime;
}

/**
 * Check if data needs refresh
 */
export function needsRefresh(maxAgeMinutes: number = 60): boolean {
  if (!lastSyncTime) return true;
  
  const now = new Date();
  const ageMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
  
  return ageMinutes >= maxAgeMinutes;
}

/**
 * Auto-sync with configurable interval
 */
export function setupAutoSync(intervalMinutes: number = 60): () => void {
  // Initial sync
  syncAllData().then(result => {
    console.log('Initial sync completed:', result);
  });
  
  // Set up periodic sync
  const intervalId = setInterval(() => {
    syncAllData().then(result => {
      console.log('Auto-sync completed:', result);
    });
  }, intervalMinutes * 60 * 1000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Validate API connection
 */
export async function validateAPIConnection(endpoint: string): Promise<boolean> {
  try {
    // In production, this would make a real API call to test connectivity
    // For now, simulate a successful connection
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  } catch (error) {
    console.error('API connection validation failed:', error);
    return false;
  }
}

/**
 * Export data for backup or analysis
 */
export function exportCachedData(): {
  nutritional: NutritionalData[];
  pricing: PricingData[];
  exportDate: Date;
} {
  return {
    nutritional: Array.from(nutritionalCache.values()),
    pricing: Array.from(pricingCache.values()),
    exportDate: new Date(),
  };
}

/**
 * Import data from backup
 */
export function importCachedData(data: {
  nutritional: NutritionalData[];
  pricing: PricingData[];
}): void {
  nutritionalCache.clear();
  pricingCache.clear();
  
  data.nutritional.forEach(item => {
    nutritionalCache.set(item.productId, item);
  });
  
  data.pricing.forEach(item => {
    pricingCache.set(item.productId, item);
  });
  
  lastSyncTime = new Date();
}
