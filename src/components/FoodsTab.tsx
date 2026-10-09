import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  Package,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { FoodItem, FoodSource } from '../types';
import { searchFoods } from '../services/foodApi';

interface FoodsTabProps {
  customFoods: FoodItem[];
  recentFoods: FoodItem[];
  onOpenCreateCustom: () => void;
  onSelectFoodToLog: (food: FoodItem) => void;
  onDeleteCustomFood: (foodId: string) => void;
}

export const FoodsTab: React.FC<FoodsTabProps> = ({
  customFoods,
  recentFoods,
  onOpenCreateCustom,
  onSelectFoodToLog,
  onDeleteCustomFood,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'custom' | 'verified'>('all');

  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingSearch(true);

    const timer = setTimeout(async () => {
      try {
        const { results } = await searchFoods(searchQuery, customFoods);
        if (isSubscribed) {
          setSearchResults(results);
          setIsLoadingSearch(false);
        }
      } catch {
        if (isSubscribed) {
          setIsLoadingSearch(false);
        }
      }
    }, 180);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [searchQuery, customFoods]);

  const renderSourceBadge = (source: FoodSource) => {
    if (source === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
          <ShieldCheck className="w-3 h-3" />
          Verified
        </span>
      );
    }
    if (source === 'openfoodfacts') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
          <Package className="w-3 h-3" />
          Packaged
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
        <Sparkles className="w-3 h-3" />
        Custom
      </span>
    );
  };

  const getFilteredList = () => {
    if (searchQuery.trim().length > 0) {
      return searchResults;
    }
    if (activeFilter === 'recent') {
      return recentFoods;
    }
    if (activeFilter === 'custom') {
      return customFoods;
    }
    if (activeFilter === 'verified') {
      return searchResults.filter((f) => f.source === 'verified');
    }
    // 'all' without query
    const recents = recentFoods.slice(0, 6);
    const others = searchResults.filter((f) => !recents.some((r) => r.id === f.id));
    return [...recents, ...others];
  };

  const displayedFoods = getFilteredList();

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Header & New Custom Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Food Directory</h2>
          <p className="text-xs text-gray-500 mt-0.5">Verified whole foods & packaged database</p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateCustom}
          className="h-9 px-3.5 bg-amber-300 hover:bg-amber-400 active:scale-95 text-stone-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs border border-amber-400/50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Custom
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search whole foods or packaging barcodes..."
          className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-[#ECE7E0] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters (When not actively searching) */}
      {searchQuery.trim().length === 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(
            [
              { key: 'all', label: 'All Items' },
              { key: 'recent', label: `Recent (${recentFoods.length})` },
              { key: 'custom', label: `My Custom (${customFoods.length})` },
              { key: 'verified', label: 'Verified Whole Foods' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                activeFilter === tab.key
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white/80 border border-[#EAE5DD] text-gray-600 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Food Items List */}
      <div className="bg-white rounded-2xl border border-[#ECE7E0] overflow-hidden divide-y divide-[#F5F2EC] shadow-xs">
        {isLoadingSearch && (
          <div className="p-4 flex items-center justify-center text-xs text-gray-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            Searching food database...
          </div>
        )}

        {displayedFoods.length > 0 ? (
          displayedFoods.map((food) => (
            <div
              key={food.id}
              className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors group"
            >
              <button
                type="button"
                onClick={() => onSelectFoodToLog(food)}
                className="flex-1 text-left min-w-0 pr-3"
              >
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {food.name}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  {food.brand && <span>{food.brand} · </span>}
                  <span>
                    {food.calories} kcal /{' '}
                    {food.servingUnit === 'g' ? '100g' : `1 ${food.servingUnit}`}
                  </span>
                  <span>·</span>
                  {renderSourceBadge(food.source)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  P {food.protein}g · C {food.carbs}g · F {food.fat}g
                </div>
              </button>

              <div className="flex items-center gap-2 flex-shrink-0">
                {food.source === 'custom' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomFood(food.id);
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete custom food"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelectFoodToLog(food)}
                  className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  Log
                </button>
              </div>
            </div>
          ))
        ) : !isLoadingSearch ? (
          <div className="py-12 px-4 text-center">
            <p className="text-sm font-medium text-gray-700">No foods found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[260px] mx-auto">
              Create a custom entry with exact nutrition values from packaging.
            </p>
            <button
              type="button"
              onClick={onOpenCreateCustom}
              className="mt-4 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-xl hover:bg-green-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Food
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
