import React, { useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { LoggedItem, MealType } from '../types';

interface EditLoggedModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LoggedItem | null;
  onUpdate: (id: string, updates: Partial<LoggedItem>) => void;
  onDelete: (id: string) => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export const EditLoggedModal: React.FC<EditLoggedModalProps> = ({
  isOpen,
  onClose,
  item,
  onUpdate,
  onDelete,
}) => {
  const [meal, setMeal] = useState<MealType>('breakfast');
  const [calories, setCalories] = useState<string>('0');
  const [protein, setProtein] = useState<string>('0');
  const [carbs, setCarbs] = useState<string>('0');
  const [fat, setFat] = useState<string>('0');
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (item) {
      setMeal(item.meal);
      setCalories(String(item.calories));
      setProtein(String(item.protein));
      setCarbs(String(item.carbs));
      setFat(String(item.fat));
      setName(item.name);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(item.id, {
      meal,
      name: name.trim() || item.name,
      calories: Math.round(Number(calories) || 0),
      protein: Math.round((Number(protein) || 0) * 10) / 10,
      carbs: Math.round((Number(carbs) || 0) * 10) / 10,
      fat: Math.round((Number(fat) || 0) * 10) / 10,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-2 text-white">
      <div
        className="w-full max-w-[390px] bg-[#18181B] rounded-3xl border-2 border-yellow-400 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-black text-white">Edit Logged Meal</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {item.imageUrl && (
          <div className="w-full h-32 rounded-2xl overflow-hidden border border-zinc-700">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Meal Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Meal Type</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
              {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeal(m)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    meal === m ? 'bg-yellow-400 text-black shadow-xs font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-0.5">Calories (kcal)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-3 py-2 text-sm font-black bg-zinc-900 border border-zinc-700 rounded-xl text-yellow-400 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-0.5">Protein (g)</label>
              <input
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-0.5">Carbs (g)</label>
              <input
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-0.5">Fat (g)</label>
              <input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full h-11 bg-yellow-400 hover:bg-yellow-300 active:scale-98 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-yellow-500/10"
            >
              <Check className="w-4 h-4 text-black stroke-[3]" />
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full h-10 text-red-400 hover:bg-red-950/40 active:scale-98 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
