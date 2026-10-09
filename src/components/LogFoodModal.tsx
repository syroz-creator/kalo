import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ShieldCheck,
  Package,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { FoodItem, FoodSource, LoggedItem, MealType } from '../types';
import { searchFoods } from '../services/foodApi';
import { calculatePortionNutrition } from '../utils/portion';

interface LogFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMeal: MealType;
  targetDate: string; // YYYY-MM-DD
  customFoods: FoodItem[];
  recentFoods: FoodItem[];
  onLogFood: (item: Omit<LoggedItem, 'id' | 'createdAt'>) => void;
  onUpdateLoggedItem?: (id: string, updates: Partial<LoggedItem>) => void;
  onDeleteLoggedItem?: (id: string) => void;
  editingItem?: LoggedItem | null;
  initialFood?: FoodItem | null;
  onOpenCreateCustom: (presetName?: string) => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export const LogFoodModal: React.FC<LogFoodModalProps> = ({
  isOpen,
  onClose,
  targetMeal,
  targetDate,
  customFoods,
  recentFoods,
  onLogFood,
  onUpdateLoggedItem,
  onDeleteLoggedItem,
  editingItem,
  initialFood,
  onOpenCreateCustom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(targetMeal);
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'verified' | 'custom'>('all');

  // Selected food state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portionMode, setPortionMode] = useState<'grams' | 'servings'>('grams');
  const [portionAmount, setPortionAmount] = useState<string>('100');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const portionInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open / editingItem change
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      // Editing mode
      setSelectedMeal(editingItem.meal);
      const isServ = editingItem.unit !== 'g' && editingItem.unit !== 'ml';
      setPortionMode(isServ ? 'servings' : 'grams');
      setPortionAmount(String(editingItem.quantity));

      // Build FoodItem representation
      const reconstructedFood: FoodItem = {
        id: editingItem.foodId,
        name: editingItem.name,
        brand: editingItem.brand,
        servingSize: isServ ? 1 : 100,
        servingUnit: editingItem.unit,
        calories: editingItem.calories,
        protein: editingItem.protein,
        carbs: editingItem.carbs,
        fat: editingItem.fat,
        source: editingItem.source,
      };
      setSelectedFood(reconstructedFood);
    } else if (initialFood) {
      setSelectedMeal(targetMeal);
      setSelectedFood(initialFood);
      if (initialFood.servingUnit === 'g' || initialFood.servingUnit === 'ml') {
        setPortionMode('grams');
        setPortionAmount(initialFood.gramWeight ? String(initialFood.gramWeight) : '100');
      } else {
        setPortionMode('servings');
        setPortionAmount('1');
      }
      setTimeout(() => {
        portionInputRef.current?.select();
      }, 50);
    } else {
      // New log mode
      setSelectedMeal(targetMeal);
      setSelectedFood(null);
      setSearchQuery('');
      setPortionMode('grams');
      setPortionAmount('100');
      setActiveTab('all');

      // Autofocus search on next tick
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, editingItem, initialFood, targetMeal]);

  // Execute search query
  useEffect(() => {
    if (!isOpen || selectedFood) return;

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
  }, [searchQuery, customFoods, isOpen, selectedFood]);

  if (!isOpen) return null;

  // Filter results by active tab
  const getFilteredItems = (): FoodItem[] => {
    if (searchQuery.trim().length > 0) {
      return searchResults;
    }

    if (activeTab === 'recent') {
      return recentFoods;
    }
    if (activeTab === 'custom') {
      return customFoods;
    }
    if (activeTab === 'verified') {
      return searchResults.filter((f) => f.source === 'verified');
    }

    // 'all' tab with empty query: show recents at top, then verified
    const recents = recentFoods.slice(0, 5);
    const others = searchResults.filter((f) => !recents.some((r) => r.id === f.id));
    return [...recents, ...others];
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    const hasPiece = !!food.gramWeight || (food.servingUnit !== 'g' && food.servingUnit !== 'ml');
    if (food.servingUnit === 'g' || food.servingUnit === 'ml') {
      setPortionMode('grams');
      setPortionAmount(food.gramWeight ? String(food.gramWeight) : '100');
    } else {
      setPortionMode('servings');
      setPortionAmount('1');
    }
    setTimeout(() => {
      portionInputRef.current?.select();
    }, 50);
  };

  const currentPortion = Number(portionAmount) || 0;
  const nutrition = selectedFood
    ? calculatePortionNutrition(selectedFood, currentPortion, portionMode)
    : { calories: 0, protein: 0, carbs: 0, fat: 0, displayQuantity: 0, displayUnit: 'g' };

  const handleConfirmLog = () => {
    if (!selectedFood || currentPortion <= 0) return;

    if (editingItem && onUpdateLoggedItem) {
      onUpdateLoggedItem(editingItem.id, {
        meal: selectedMeal,
        quantity: nutrition.displayQuantity,
        unit: nutrition.displayUnit,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      });
    } else {
      onLogFood({
        foodId: selectedFood.id,
        date: targetDate,
        meal: selectedMeal,
        name: selectedFood.name,
        brand: selectedFood.brand,
        quantity: nutrition.displayQuantity,
        unit: nutrition.displayUnit,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        source: selectedFood.source,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (editingItem && onDeleteLoggedItem) {
      onDeleteLoggedItem(editingItem.id);
      onClose();
    }
  };

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
    if (source === 'ai_camera') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-yellow-300 px-1.5 py-0.5 rounded-md">
          <Sparkles className="w-3 h-3 text-stone-900" />
          AI Camera
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

  const displayedList = getFilteredItems();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-[420px] max-h-[92vh] bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-[#EAE5DD] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Handle */}
        <div className="w-10 h-1 bg-[#E0DAD0] rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Modal Top Bar */}
        <div className="px-5 pt-3 pb-3 border-b border-[#EFEBE4] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            {selectedFood && !editingItem ? (
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-gray-700 hover:bg-[#EAE4DB] transition-colors"
                aria-label="Back to food search"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : null}
            <h2 className="text-base font-bold text-gray-900">
              {editingItem
                ? 'Edit Food'
                : selectedFood
                ? 'Set Portion'
                : `Add to ${MEAL_LABELS[targetMeal]}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-[#EAE4DB] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Section */}
        {!selectedFood ? (
          /* Search & Food Discovery View */
          <div className="flex flex-col flex-1 min-h-[380px] overflow-hidden">
            {/* Search Input Bar */}
            <div className="p-4 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search whole foods or packaged products..."
                  className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
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
            </div>

            {/* Quick Filter Tabs (when not actively searching) */}
            {searchQuery.trim().length === 0 && (
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'recent', label: `Recent (${recentFoods.length})` },
                    { key: 'verified', label: 'Verified Foods' },
                    { key: 'custom', label: `Custom (${customFoods.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.key
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Foods List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-gray-100">
              {isLoadingSearch && (
                <div className="py-6 flex items-center justify-center text-xs text-gray-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                  Searching nutrition database...
                </div>
              )}

              {displayedList.length > 0 ? (
                displayedList.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleSelectFood(food)}
                    className="w-full text-left py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-medium text-gray-900 truncate">
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
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-gray-700">
                        P {food.protein}g · C {food.carbs}g · F {food.fat}g
                      </div>
                    </div>
                  </button>
                ))
              ) : !isLoadingSearch ? (
                <div className="py-10 text-center px-4">
                  <p className="text-sm font-medium text-gray-700">No matching food found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[260px] mx-auto">
                    You can enter verified nutrition directly from any product package.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCreateCustom(searchQuery);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Custom Food
                  </button>
                </div>
              ) : null}
            </div>

            {/* Bottom bar to quickly add custom */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Can't find an item?</span>
              <button
                type="button"
                onClick={() => onOpenCreateCustom(searchQuery)}
                className="text-xs font-medium text-green-700 hover:text-green-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add from Packaging
              </button>
            </div>
          </div>
        ) : (
          /* Portion & Logging Configuration View */
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Selected Food Header */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-snug">
                    {selectedFood.name}
                  </h3>
                  {selectedFood.brand && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedFood.brand}</p>
                  )}
                </div>
                {renderSourceBadge(selectedFood.source)}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Reference: {selectedFood.calories} kcal per{' '}
                {selectedFood.servingUnit === 'g'
                  ? '100g'
                  : `${selectedFood.servingSize} ${selectedFood.servingUnit}`}
              </p>
            </div>

            {/* Meal Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Target Meal
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
                {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((meal) => (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => setSelectedMeal(meal)}
                    className={`py-2 text-xs font-medium rounded-lg transition-all ${
                      selectedMeal === meal
                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {MEAL_LABELS[meal]}
                  </button>
                ))}
              </div>
            </div>

            {/* Portion Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Portion</label>
                {/* Unit Switch if piece weight or serving exists */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPortionMode('grams')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      portionMode === 'grams'
                        ? 'bg-white text-gray-900 font-semibold shadow-xs'
                        : 'text-gray-500'
                    }`}
                  >
                    Grams (g)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortionMode('servings')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      portionMode === 'servings'
                        ? 'bg-white text-gray-900 font-semibold shadow-xs'
                        : 'text-gray-500'
                    }`}
                  >
                    Servings
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    ref={portionInputRef}
                    type="number"
                    step="any"
                    min="0"
                    value={portionAmount}
                    onChange={(e) => setPortionAmount(e.target.value)}
                    className="w-full h-13 px-4 text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                    {portionMode === 'grams' ? 'g' : selectedFood.servingUnit || 'serving'}
                  </span>
                </div>
              </div>

              {/* Quick adjustment buttons */}
              <div className="flex items-center gap-2 mt-2.5">
                {portionMode === 'grams' ? (
                  <>
                    {[50, 100, 150, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPortionAmount(String(amt))}
                        className={`flex-1 py-1.5 text-xs rounded-lg border border-gray-200 font-medium hover:bg-gray-50 transition-colors ${
                          currentPortion === amt ? 'bg-gray-100 font-semibold' : 'text-gray-600'
                        }`}
                      >
                        {amt}g
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[0.5, 1, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPortionAmount(String(s))}
                        className={`flex-1 py-1.5 text-xs rounded-lg border border-gray-200 font-medium hover:bg-gray-50 transition-colors ${
                          currentPortion === s ? 'bg-gray-100 font-semibold' : 'text-gray-600'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Instant Calculated Nutrition Summary */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="flex items-baseline justify-between border-b border-gray-200/60 pb-3 mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Energy
                </span>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    {nutrition.calories}
                  </span>
                  <span className="text-xs font-medium text-gray-500 ml-1">kcal</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-gray-100">
                  <span className="block text-[11px] text-gray-400 font-medium">Protein</span>
                  <span className="text-sm font-bold text-gray-900">{nutrition.protein}g</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-gray-100">
                  <span className="block text-[11px] text-gray-400 font-medium">Carbs</span>
                  <span className="text-sm font-bold text-gray-900">{nutrition.carbs}g</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-gray-100">
                  <span className="block text-[11px] text-gray-400 font-medium">Fat</span>
                  <span className="text-sm font-bold text-gray-900">{nutrition.fat}g</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleConfirmLog}
                disabled={currentPortion <= 0}
                className="w-full h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" />
                {editingItem ? 'Update Logged Food' : `Log to ${MEAL_LABELS[selectedMeal]}`}
              </button>

              {editingItem && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full h-11 text-red-600 hover:bg-red-50 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete from {MEAL_LABELS[editingItem.meal]}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
