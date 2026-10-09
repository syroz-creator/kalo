import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Clock,
  Flame,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  BookmarkCheck,
} from 'lucide-react';
import { MealType, RecipeItem } from '../types';

interface RecipesTabProps {
  recipes: RecipeItem[];
  onLogRecipeAsMeal: (recipe: RecipeItem, targetMeal: MealType) => void;
}

export const RecipesTab: React.FC<RecipesTabProps> = ({
  recipes,
  onLogRecipeAsMeal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [selectedTargetMeal, setSelectedTargetMeal] = useState<MealType>('dinner');

  const filtered = recipes.filter((r) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'high_protein') return r.protein >= 30;
    return r.category === activeCategory;
  });

  const toggleExpand = (id: string) => {
    setExpandedRecipeId(expandedRecipeId === id ? null : id);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Clean Recipes</span>
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Macro-calculated meals you can cook and log with 1 tap
          </p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: 'All Recipes' },
          { key: 'high_protein', label: '⚡ High Protein' },
          { key: 'breakfast', label: 'Breakfast' },
          { key: 'dinner', label: 'Dinner Bowls' },
          { key: 'snack', label: 'Snacks' },
        ].map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                : 'bg-[#18181B] text-zinc-400 border border-zinc-800 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Recipes List */}
      <div className="space-y-3">
        {filtered.map((recipe) => {
          const isExpanded = expandedRecipeId === recipe.id;

          return (
            <div
              key={recipe.id}
              className="bg-[#18181B] border border-[#27272A] rounded-3xl overflow-hidden shadow-lg hover:border-zinc-700 transition-all"
            >
              {/* Recipe Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(recipe.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {recipe.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.prepTime}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white leading-snug">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {recipe.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center flex-shrink-0 mt-1"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Macro Pills */}
                <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-zinc-800 text-center">
                  <div className="bg-[#202024] p-1.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] font-bold text-zinc-500 block uppercase">Calories</span>
                    <span className="text-xs font-black text-yellow-400">{recipe.calories} kcal</span>
                  </div>
                  <div className="bg-[#202024] p-1.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] font-bold text-zinc-500 block uppercase">Protein</span>
                    <span className="text-xs font-black text-white">{recipe.protein}g</span>
                  </div>
                  <div className="bg-[#202024] p-1.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] font-bold text-zinc-500 block uppercase">Carbs</span>
                    <span className="text-xs font-black text-white">{recipe.carbs}g</span>
                  </div>
                  <div className="bg-[#202024] p-1.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] font-bold text-zinc-500 block uppercase">Fat</span>
                    <span className="text-xs font-black text-white">{recipe.fat}g</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details: Ingredients & Instructions */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-zinc-800 space-y-3 bg-[#141416]/70 animate-in fade-in duration-150">
                  {/* Ingredients */}
                  <div>
                    <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                      Ingredients
                    </h4>
                    <ul className="space-y-1">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="text-xs text-zinc-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Steps */}
                  <div>
                    <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                      Preparation
                    </h4>
                    <ol className="space-y-1.5">
                      {recipe.instructions.map((step, idx) => (
                        <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                          <span className="text-yellow-400 font-bold text-[11px] flex-shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Quick Log Action */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                    <select
                      value={selectedTargetMeal}
                      onChange={(e) => setSelectedTargetMeal(e.target.value as MealType)}
                      className="h-11 px-3 bg-zinc-800 border border-zinc-700 text-xs font-bold text-white rounded-xl focus:outline-none focus:border-yellow-400"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snacks">Snacks</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onLogRecipeAsMeal(recipe, selectedTargetMeal)}
                      className="flex-1 h-11 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-yellow-500/10"
                    >
                      <Check className="w-4 h-4 text-black" />
                      <span>Log this Meal ({recipe.calories} kcal)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
