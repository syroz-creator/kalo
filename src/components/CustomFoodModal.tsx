import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { FoodItem } from '../types';

interface CustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (food: FoodItem) => void;
  initialName?: string;
}

export const CustomFoodModal: React.FC<CustomFoodModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
}) => {
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState('');
  const [basis, setBasis] = useState<'per100g' | 'perServing'>('per100g');
  const [servingDescription, setServingDescription] = useState('1 serving');
  const [servingWeightGrams, setServingWeightGrams] = useState<string>('100');

  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Food name is required';
    }
    if (calories.trim() === '' || isNaN(Number(calories)) || Number(calories) < 0) {
      newErrors.calories = 'Enter a valid calorie amount';
    }
    if (protein.trim() !== '' && (isNaN(Number(protein)) || Number(protein) < 0)) {
      newErrors.protein = 'Invalid protein value';
    }
    if (carbs.trim() !== '' && (isNaN(Number(carbs)) || Number(carbs) < 0)) {
      newErrors.carbs = 'Invalid carbs value';
    }
    if (fat.trim() !== '' && (isNaN(Number(fat)) || Number(fat) < 0)) {
      newErrors.fat = 'Invalid fat value';
    }
    if (basis === 'perServing' && (!servingDescription.trim())) {
      newErrors.servingDescription = 'Specify serving name (e.g. 1 slice)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const calNum = Math.round(Number(calories));
    const pNum = Math.round((Number(protein) || 0) * 10) / 10;
    const cNum = Math.round((Number(carbs) || 0) * 10) / 10;
    const fNum = Math.round((Number(fat) || 0) * 10) / 10;

    let newFood: FoodItem;

    if (basis === 'per100g') {
      newFood = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        brand: brand.trim() || undefined,
        servingSize: 100,
        servingUnit: 'g',
        calories: calNum,
        protein: pNum,
        carbs: cNum,
        fat: fNum,
        source: 'custom',
        gramWeight: servingWeightGrams && Number(servingWeightGrams) > 0 ? Number(servingWeightGrams) : undefined,
      };
    } else {
      const weight = servingWeightGrams && Number(servingWeightGrams) > 0 ? Number(servingWeightGrams) : undefined;
      newFood = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        brand: brand.trim() || undefined,
        servingSize: 1,
        servingUnit: servingDescription.trim() || 'serving',
        calories: calNum,
        protein: pNum,
        carbs: cNum,
        fat: fNum,
        source: 'custom',
        gramWeight: weight,
      };
    }

    onSave(newFood);
    onClose();
  };

  // Helper macro sum check
  const pVal = Number(protein) || 0;
  const cVal = Number(carbs) || 0;
  const fVal = Number(fat) || 0;
  const macroCals = pVal * 4 + cVal * 4 + fVal * 9;
  const calVal = Number(calories) || 0;
  const hasMacroMismatch =
    calVal > 20 &&
    macroCals > 0 &&
    Math.abs(macroCals - calVal) > Math.max(30, calVal * 0.35);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-[420px] max-h-[92vh] bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-[#EAE5DD] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#EFEBE4] flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <h2 className="text-base font-bold text-gray-900">New Custom Food</h2>
            <p className="text-xs text-gray-500">Enter verified values directly from packaging</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-[#EAE4DB] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Food Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sourdough Loaf, Oat Milk"
              className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Brand or Source (optional)
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Local Bakery, Kirkland"
              className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Basis selector: per 100g vs per serving */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nutrition values basis
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setBasis('per100g')}
                className={`py-2 text-xs font-medium rounded-lg transition-all ${
                  basis === 'per100g'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Per 100 grams
              </button>
              <button
                type="button"
                onClick={() => setBasis('perServing')}
                className={`py-2 text-xs font-medium rounded-lg transition-all ${
                  basis === 'perServing'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Per Serving / Unit
              </button>
            </div>
          </div>

          {basis === 'perServing' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Serving Unit Name *
                </label>
                <input
                  type="text"
                  value={servingDescription}
                  onChange={(e) => setServingDescription(e.target.value)}
                  placeholder="e.g. slice, bar, bottle"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                {errors.servingDescription && (
                  <p className="text-xs text-red-600 mt-1">{errors.servingDescription}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Serving Weight (grams)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={servingWeightGrams}
                  onChange={(e) => setServingWeightGrams(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>
          )}

          {basis === 'per100g' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Typical piece weight in grams (optional)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={servingWeightGrams}
                onChange={(e) => setServingWeightGrams(e.target.value)}
                placeholder="e.g. 50 (allows piece logging)"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          )}

          {/* Nutrition numbers */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">
              Nutrition Values {basis === 'per100g' ? '(per 100g)' : `(per ${servingDescription || 'serving'})`}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Calories (kcal) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                {errors.calories && <p className="text-xs text-red-600 mt-1">{errors.calories}</p>}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Carbohydrates (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>

            {hasMacroMismatch && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-2 leading-relaxed">
                Note: Entered macronutrients total ~{Math.round(macroCals)} kcal, while calories is {calVal} kcal. Double-check packaging values if unsure.
              </p>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Save Custom Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
