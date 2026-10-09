import { FoodItem } from '../types';
import { VERIFIED_FOODS } from '../data/verifiedFoods';

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal_value'?: number;
    'energy-kcal'?: number;
    'energy_100g'?: number; // kJ
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    'energy-kcal_serving'?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    fat_serving?: number;
  };
}

let activeAbortController: AbortController | null = null;

export async function searchFoods(
  query: string,
  customFoods: FoodItem[] = []
): Promise<{
  results: FoodItem[];
  hasRemoteResults: boolean;
  isLoadingRemote: boolean;
}> {
  const cleanQuery = query.trim().toLowerCase();

  // Search local custom foods first
  const matchedCustom = customFoods.filter(
    (item) =>
      item.name.toLowerCase().includes(cleanQuery) ||
      (item.brand && item.brand.toLowerCase().includes(cleanQuery))
  );

  // Search local verified baseline foods
  const matchedVerified = VERIFIED_FOODS.filter((item) =>
    item.name.toLowerCase().includes(cleanQuery)
  );

  const localResults = [...matchedCustom, ...matchedVerified];

  // If query is short, return local matches immediately
  if (cleanQuery.length < 2) {
    return {
      results: localResults,
      hasRemoteResults: false,
      isLoadingRemote: false,
    };
  }

  // Cancel prior in-flight fetch
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      cleanQuery
    )}&search_simple=1&action=process&json=1&page_size=12&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`;

    const response = await fetch(url, {
      signal: activeAbortController.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        results: localResults,
        hasRemoteResults: false,
        isLoadingRemote: false,
      };
    }

    const data = await response.json();
    const products: OpenFoodFactsProduct[] = data.products || [];

    const remoteResults: FoodItem[] = [];

    for (const p of products) {
      if (!p.product_name || !p.nutriments) continue;

      // Calories per 100g
      let cals100 = p.nutriments['energy-kcal_100g'] ?? p.nutriments['energy-kcal_value'] ?? p.nutriments['energy-kcal'];
      if (cals100 === undefined && p.nutriments.energy_100g) {
        // convert kJ to kcal: 1 kcal ~ 4.184 kJ
        cals100 = Math.round(p.nutriments.energy_100g / 4.184);
      }

      if (cals100 === undefined || isNaN(cals100)) continue;

      const protein100 = p.nutriments.proteins_100g ?? 0;
      const carbs100 = p.nutriments.carbohydrates_100g ?? 0;
      const fat100 = p.nutriments.fat_100g ?? 0;

      // Extract serving info if present
      let gramWeight: number | undefined;
      if (p.serving_quantity && !isNaN(Number(p.serving_quantity))) {
        gramWeight = Number(p.serving_quantity);
      } else if (p.serving_size) {
        const match = p.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
        if (match) {
          gramWeight = parseFloat(match[1]);
        }
      }

      remoteResults.push({
        id: `off-${p.code || Math.random().toString(36).substring(2, 9)}`,
        name: p.product_name.trim(),
        brand: p.brands ? p.brands.split(',')[0].trim() : undefined,
        servingSize: 100,
        servingUnit: 'g',
        calories: Math.round(cals100),
        protein: Math.round(protein100 * 10) / 10,
        carbs: Math.round(carbs100 * 10) / 10,
        fat: Math.round(fat100 * 10) / 10,
        source: 'openfoodfacts',
        barcode: p.code,
        gramWeight: gramWeight && gramWeight > 0 ? gramWeight : undefined,
      });
    }

    // Deduplicate against local matches
    const combined = [...localResults];
    for (const rem of remoteResults) {
      const exists = combined.some(
        (c) =>
          c.name.toLowerCase() === rem.name.toLowerCase() &&
          c.brand?.toLowerCase() === rem.brand?.toLowerCase()
      );
      if (!exists) {
        combined.push(rem);
      }
    }

    return {
      results: combined,
      hasRemoteResults: remoteResults.length > 0,
      isLoadingRemote: false,
    };
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      return {
        results: localResults,
        hasRemoteResults: false,
        isLoadingRemote: true,
      };
    }
    return {
      results: localResults,
      hasRemoteResults: false,
      isLoadingRemote: false,
    };
  }
}
