import { CalendarDays, Flame, Minus, Plus, SquarePen, UtensilsCrossed } from 'lucide-react';
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
  onDeleteItem: (id: string) => void;
}

export function TodayTab(props: TodayTabProps) {
  const { selectedDate, loggedItems, energyNeeds, onSelectDate } = props;
  const items = loggedItems.filter(item => item.date === selectedDate);
  const total = (key: 'calories' | 'protein' | 'carbs' | 'fat') => items.reduce((sum, item) => sum + item[key], 0);
  const calories = total('calories');
  const remaining = energyNeeds.tdee - calories;
  const progress = Math.max(0, Math.min(1, calories / Math.max(1, energyNeeds.tdee)));
  const circumference = 2 * Math.PI * 102;
  const angle = progress * 2 * Math.PI;
  const selected = parseDateKey(selectedDate);
  const start = addDaysToKey(selectedDate, -((selected.getDay() + 1) % 7));
  const today = getTodayKey();
  const loggedDates = new Set(loggedItems.map(item => item.date));
  let streak = 0;
  let cursor = loggedDates.has(today) ? today : addDaysToKey(today, -1);
  while (loggedDates.has(cursor)) { streak++; cursor = addDaysToKey(cursor, -1); }
  const macros = [
    { label: 'Protein', value: total('protein'), target: energyNeeds.proteinTargetGrams, color: 'var(--protein)' },
    { label: 'Carbs', value: total('carbs'), target: energyNeeds.carbsTargetGrams, color: 'var(--gold)' },
    { label: 'Fat', value: total('fat'), target: energyNeeds.fatTargetGrams, color: 'var(--fat)' },
  ];

  return (
    <div className="app-scroll today-page">
      <header className="today-heading"><div><p>{selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>{selectedDate === today ? 'Today' : selected.toLocaleDateString('en-US', { weekday: 'long' })}</h1></div><span className="day-streak" title={`${streak} day logging streak`}><Flame size={17} />{streak}</span></header>
      <div className="week-strip">{Array.from({ length: 7 }, (_, index) => {
        const date = addDaysToKey(start, index);
        const parsed = parseDateKey(date);
        return <button type="button" key={date} onClick={() => onSelectDate(date)} aria-label={parsed.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} aria-pressed={date === selectedDate} className={date === selectedDate ? 'is-selected' : ''}><span>{parsed.toLocaleDateString('en-US', { weekday: 'short' })}</span><strong>{parsed.getDate()}</strong></button>;
      })}</div>
      <section className="calorie-panel" aria-label="Daily nutrition">
        <div className="calorie-panel__top">
          <div className="water-gauge"><span>Water</span><div className="water-gauge__track"><i style={{ height: `${Math.min(100, props.cupsDrank / 10 * 100)}%` }} /></div><strong>{(props.cupsDrank * 0.25).toFixed(2)}<small>/ 2.50 L</small></strong><button type="button" aria-label="Add 1 cup of water" title="Add 250 ml" disabled={props.cupsDrank >= 10} onClick={() => props.onUpdateWaterCups(props.cupsDrank + 1)}><Plus size={20} /></button>{props.cupsDrank > 0 && <button type="button" className="water-gauge__minus" aria-label="Remove 1 cup of water" title="Remove 250 ml" onClick={() => props.onUpdateWaterCups(props.cupsDrank - 1)}><Minus size={15} /></button>}</div>
          <div className="calorie-ring">
            <svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="102" fill="none" stroke="var(--track)" strokeWidth="14" /><circle cx="120" cy="120" r="102" fill="none" stroke="var(--orange)" strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 120 120)" className="calorie-ring__arc" /></svg>
            <div className="calorie-ring__number"><strong style={{ fontSize: Math.abs(remaining) > 9999 ? 30 : undefined }}>{Math.abs(remaining).toLocaleString('en-US')}</strong><span>{remaining >= 0 ? 'remaining · kcal' : 'over target · kcal'}</span></div>
            {calories > 0 && <span className="calorie-ring__eaten" style={{ left: `${50 + 49 * Math.sin(angle)}%`, top: `${50 - 49 * Math.cos(angle)}%` }}>{calories.toLocaleString('en-US')}<Flame size={12} /></span>}
          </div>
        </div>
        <div className="macro-bars">{macros.map(macro => <div key={macro.label} style={{ '--macro-color': macro.color } as React.CSSProperties}><div><span>{macro.label}</span><strong>{Math.round(macro.value)}<small>/{macro.target}g</small></strong></div><span className="macro-bars__track"><i style={{ width: `${Math.min(100, macro.value / Math.max(1, macro.target) * 100)}%` }} /></span></div>)}</div>
      </section>
      <section className="meals-section"><header><h2>Today's meals</h2><label className="date-control" title="Choose date"><CalendarDays size={17} /><input type="date" aria-label="Choose log date" value={selectedDate} onChange={event => { if (event.target.value) onSelectDate(event.target.value); }} /></label></header>
        {!items.length && <p className="meals-empty">No meals logged yet.</p>}
        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(meal => {
          const group = items.filter(item => item.meal === meal);
          if (!group.length) return null;
          return <div className="meal-group" key={meal}><div className="meal-group__heading"><h3><UtensilsCrossed size={16} />{meal.charAt(0).toUpperCase() + meal.slice(1)}</h3><span>{group.reduce((sum, item) => sum + item.calories, 0).toLocaleString('en-US')} kcal</span></div>{group.map(item => <MealRow key={item.id} item={item} onEdit={() => props.onEditItem(item)} onRepeat={() => props.onRepeatItem(item)} onDelete={() => props.onDeleteItem(item.id)} />)}</div>;
        })}
        <button type="button" className="manual-log" onClick={() => props.onOpenLogModal('lunch')}><SquarePen size={21} />Log manually</button>
      </section>
    </div>
  );
}
