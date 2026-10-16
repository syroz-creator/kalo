import { t, getLocale } from '../i18n';
import { Apple, CalendarDays, ChevronLeft, ChevronRight, Droplets, Minus, Moon, Plus, SquarePen, Sun, Sunrise, Utensils } from 'lucide-react';
import type { DailyEnergyNeeds, LoggedItem, MealType } from '../types';
import { addDaysToKey, getTodayKey, parseDateKey } from '../utils/date';
import { MealRow } from './MealRow';

interface TodayTabProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  loggedItems: LoggedItem[];
  energyNeeds: DailyEnergyNeeds;
  cupsDrank: number;
  onUpdateWaterCups: (cups: number) => void;
  onOpenLogModal: (meal: MealType) => void;
  onEditItem: (item: LoggedItem) => void;
  onRepeatItem: (item: LoggedItem) => void;
  onDeleteItem: (id: string) => boolean;
}

const mealIcons = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snacks: Apple };

export function TodayTab(props: TodayTabProps) {
  const { selectedDate, loggedItems, energyNeeds, onSelectDate } = props;
  const items = loggedItems.filter(item => item.date === selectedDate);
  const total = (key: 'calories' | 'protein' | 'carbs' | 'fat') => items.reduce((sum, item) => sum + item[key], 0);
  const calories = total('calories');
  const remaining = energyNeeds.tdee - calories;
  const goal = Math.max(1, energyNeeds.tdee);
  const selected = parseDateKey(selectedDate);
  const today = getTodayKey();
  const macros = [
    { label: 'Protein', value: total('protein'), target: energyNeeds.proteinTargetGrams, color: 'var(--protein)' },
    { label: 'Carbs', value: total('carbs'), target: energyNeeds.carbsTargetGrams, color: 'var(--carbs)' },
    { label: 'Fat', value: total('fat'), target: energyNeeds.fatTargetGrams, color: 'var(--fat)' },
  ];

  return <div className="app-scroll today-page">
    <header className="journal-masthead">
      <h1>{t('Kalo')}</h1>
      <button type="button" className="manual-log" onClick={() => props.onOpenLogModal('lunch')}><SquarePen size={17} /><span>{t('Log manually')}</span></button>
    </header>

    <nav className="journal-date" aria-label={t('Choose date')}>
      <button type="button" className="icon-command" aria-label={t('Previous day')} title={t('Previous day')} onClick={() => onSelectDate(addDaysToKey(selectedDate, -1))}><ChevronLeft size={20} /></button>
      <label className="journal-date__picker">
        <CalendarDays size={17} />
        <span><strong>{selectedDate === today ? t('Today') : selected.toLocaleDateString(getLocale(), { weekday: 'long' })}</strong><small>{selected.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}</small></span>
        <input type="date" aria-label={t('Choose log date')} value={selectedDate} onChange={event => { if (event.target.value) onSelectDate(event.target.value); }} />
      </label>
      <button type="button" className="icon-command" aria-label={t('Next day')} title={t('Next day')} onClick={() => onSelectDate(addDaysToKey(selectedDate, 1))}><ChevronRight size={20} /></button>
    </nav>

    <section className="journal-nutrition" aria-label={t('Daily nutrition')}>
      <div className="journal-intake"><h2>{t('Calories logged')}</h2><p><strong>{Math.round(calories).toLocaleString(getLocale())}</strong><span>{t('kcal')}</span></p></div>
      <div className="journal-energy" role="meter" aria-label={t('Daily nutrition')} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, Math.max(0, calories))} aria-valuetext={t('{calories} of {goal} kcal', { calories: Math.round(calories).toLocaleString(getLocale()), goal: energyNeeds.tdee.toLocaleString(getLocale()) })}>
        <span style={{ width: `${Math.max(0, Math.min(100, calories / goal * 100))}%` }} />
      </div>
      <dl className="journal-balance"><div><dt>{remaining >= 0 ? t('Remaining') : t('Over target')}</dt><dd>{Math.round(Math.abs(remaining)).toLocaleString(getLocale())} <small>{t('kcal')}</small></dd></div><div><dt>{t('Goal')}</dt><dd>{energyNeeds.tdee.toLocaleString(getLocale())} <small>{t('kcal')}</small></dd></div></dl>
      <dl className="journal-macros">{macros.map(macro => <div key={macro.label} style={{ '--macro-color': macro.color } as React.CSSProperties}>
        <dt><i />{t(macro.label)}</dt><dd><span className="journal-macros__track" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, macro.value / Math.max(1, macro.target) * 100))}%` }} /></span><span className="journal-macros__amount" dir="ltr"><strong>{Math.round(macro.value)}</strong><small> / {macro.target} {t('g')}</small></span></dd>
      </div>)}</dl>
    </section>

    <section className="journal-water" aria-label={t('Water')}>
      <Droplets size={22} />
      <div className="journal-water__copy"><h2>{t('Water')}</h2><p><strong>{(props.cupsDrank * .25).toFixed(2)}</strong><span>{t('/ 2.50 L')}</span></p><div className="journal-water__cups" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} data-filled={index < props.cupsDrank} />)}</div></div>
      <button type="button" className="icon-command journal-water__minus" aria-label={t('Remove 1 cup of water')} title={t('Remove 250 ml')} disabled={props.cupsDrank <= 0} onClick={() => props.onUpdateWaterCups(props.cupsDrank - 1)}><Minus size={18} /></button>
      <button type="button" className="icon-command journal-water__plus" aria-label={t('Add 1 cup of water')} title={t('Add 250 ml')} disabled={props.cupsDrank >= 10} onClick={() => props.onUpdateWaterCups(props.cupsDrank + 1)}><Plus size={20} /></button>
    </section>

    <section className="journal-food">
      <header><h2>{t('Food log')}</h2></header>
      {!items.length && <div className="journal-food__empty"><Utensils size={23} strokeWidth={1.4} /><p>{t('No meals logged yet.')}</p></div>}
      {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(meal => {
        const group = items.filter(item => item.meal === meal);
        const MealIcon = mealIcons[meal];
        if (!group.length) return null;
        return <div className="meal-group" key={meal}><div className="meal-group__heading"><h3><MealIcon size={16} />{t(meal.charAt(0).toUpperCase() + meal.slice(1))}</h3><span>{group.reduce((sum, item) => sum + item.calories, 0).toLocaleString(getLocale())} {t('kcal')}</span></div>{group.map(item => <MealRow key={item.id} item={item} onEdit={() => props.onEditItem(item)} onRepeat={() => props.onRepeatItem(item)} onDelete={() => props.onDeleteItem(item.id)} />)}</div>;
      })}
    </section>
  </div>;
}
