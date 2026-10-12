import { t } from '../i18n';
import { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Plus, Search, Trash2 } from 'lucide-react';
import type { LoggedItem, MealType } from '../types';

interface Props {
  recipes: LoggedItem[];
  onLogRecipeAsMeal: (recipe: LoggedItem, meal: MealType) => void;
  onRemoveRecipe: (foodId: string) => void;
  onOpenCamera: () => void;
}

export function RecipesTab({ recipes, onLogRecipeAsMeal, onRemoveRecipe, onOpenCamera }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [meal, setMeal] = useState<MealType>('lunch');
  const filtered = recipes.filter(recipe => `${recipe.name} ${recipe.ingredients?.map(item => item.name).join(' ') ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="app-scroll photo-recipes">
    <header className="recipes-heading"><h1>{t("Recipes")}</h1><span>{recipes.length}</span></header>
    {!!recipes.length && <label className="recipe-search"><Search size={17} /><input type="search" aria-label={t("Search photographed meals")} placeholder={t("Search meals or ingredients")} value={query} onChange={event => setQuery(event.target.value)} /></label>}
    {!recipes.length && <div className="recipes-empty"><Camera size={32} strokeWidth={1.4} /><h2>{t("No photographed meals yet")}</h2><button type="button" className="primary-command" onClick={onOpenCamera}><Camera size={18} />{t("Photograph a meal")}</button></div>}
    {!!recipes.length && !filtered.length && <p className="meals-empty">{t("No matching meals.")}</p>}
    <div className="photo-recipes__list">{filtered.map(recipe => {
      const isExpanded = expanded === recipe.foodId;
      return <article className="photo-recipe" key={recipe.foodId}>
        <button type="button" className="photo-recipe__open" aria-expanded={isExpanded} aria-controls={`recipe-${recipe.foodId}`} onClick={() => { setExpanded(isExpanded ? null : recipe.foodId); setMeal(recipe.meal); }}>
          {recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipe.name} loading="lazy" /> : <span className="photo-recipe__missing"><Camera size={24} /></span>}
          <span className="photo-recipe__summary"><strong>{recipe.name}</strong><span>{Math.round(recipe.calories)} {t("kcal")} <small>{Math.round(recipe.protein)}{t("g protein")}</small></span></span>
          {isExpanded ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
        </button>
        {isExpanded && <div className="photo-recipe__details" id={`recipe-${recipe.foodId}`}>
          <div className="recipe-nutrition"><span><i className="protein-dot" />{t("Protein")} <strong>{Number(recipe.protein.toFixed(1))}{t("g")}</strong></span><span><i className="carbs-dot" />{t("Carbs")} <strong>{Number(recipe.carbs.toFixed(1))}{t("g")}</strong></span><span><i className="fat-dot" />{t("Fat")} <strong>{Number(recipe.fat.toFixed(1))}{t("g")}</strong></span></div>
          <h2>{t("Ingredients")}</h2>
          {recipe.ingredients?.length ? <ul className="recipe-ingredients">{recipe.ingredients.map((food, index) => <li key={index}><span><strong>{food.name}</strong><small>{food.portion}</small></span><span>{Math.round(food.calories)} {t("kcal")}</span></li>)}</ul> : <p className="settings-note">{t("Ingredient details unavailable for this older photo.")}</p>}
          <p className="settings-note">{t("Estimated nutrition")}</p>
          <div className="recipe-log"><label className="app-field">{t("Meal")}<select value={meal} onChange={event => setMeal(event.target.value as MealType)}>{(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(value => <option key={value} value={value}>{t(value.charAt(0).toUpperCase() + value.slice(1))}</option>)}</select></label><button type="button" className="primary-command" onClick={() => onLogRecipeAsMeal(recipe, meal)}><Plus size={18} />{t("Log again")}</button></div>
          <button type="button" className="delete-command" onClick={() => { if (window.confirm(t('Remove {name} from Recipes? Your meal history will stay unchanged.', { name: recipe.name }))) onRemoveRecipe(recipe.foodId); }}><Trash2 size={16} />{t("Remove from recipes")}</button>
        </div>}
      </article>;
    })}</div>
  </div>;
}
