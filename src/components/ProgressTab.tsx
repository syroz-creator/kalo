import { useId, useState } from 'react';
import { Check, Clock, Dumbbell, Footprints, HeartPulse, Plus, Trash2, X, Zap } from 'lucide-react';
import { t, getLocale } from '../i18n';
import type { LoggedItem, WorkoutItem, WorkoutType } from '../types';
import { addDaysToKey, getDisplayDateInfo, getTodayKey } from '../utils/date';
import { useDialogFocus } from '../utils/useDialogFocus';
import { BodyProgress } from './BodyProgress';

interface ProgressTabProps {
  selectedDate: string;
  loggedItems: LoggedItem[];
  workouts: WorkoutItem[];
  targetCalories: number;
  onAddWorkout: (workout: Omit<WorkoutItem, 'id' | 'createdAt'>) => void;
  onDeleteWorkout: (id: string) => void;
  onNativeCameraPendingChange?: (pending: boolean) => void;
}

const WORKOUT_TYPES = [
  { type: 'strength', label: 'Strength', Icon: Dumbbell },
  { type: 'cardio', label: 'Cardio', Icon: HeartPulse },
  { type: 'walk', label: 'Walk / Run', Icon: Footprints },
  { type: 'hiit', label: 'HIIT', Icon: Zap },
] as const;

export function ProgressTab({ selectedDate, loggedItems, workouts, targetCalories, onAddWorkout, onDeleteWorkout, onNativeCameraPendingChange }: ProgressTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState<WorkoutType>('strength');
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [caloriesBurned, setCaloriesBurned] = useState('280');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const titleId = useId();
  const dialog = useDialogFocus<HTMLFormElement>(isAddModalOpen, () => setIsAddModalOpen(false));
  const todayKey = getTodayKey();
  const dayWorkouts = workouts.filter(workout => workout.date === selectedDate);
  const totalFoodCalories = loggedItems.filter(item => item.date === selectedDate).reduce((sum, item) => sum + item.calories, 0);
  const totalWorkoutBurn = dayWorkouts.reduce((sum, item) => sum + item.caloriesBurned, 0);
  const netCalories = totalFoodCalories - totalWorkoutBurn;
  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToKey(todayKey, -6 + index);
    const info = getDisplayDateInfo(date);
    return { date, food: loggedItems.filter(item => item.date === date).reduce((sum, item) => sum + item.calories, 0), label: info.isToday ? 'Today' : info.label.split(',')[0] };
  });

  const handleSaveWorkout = (event: React.FormEvent) => {
    event.preventDefault();
    const duration = Math.max(1, Number(durationMinutes) || 30);
    const burn = Math.max(0, Number(caloriesBurned) || 0);
    const title = workoutTitle.trim() || t('{type} Session', { type: t(WORKOUT_TYPES.find(choice => choice.type === workoutType)?.label ?? 'Strength') });
    onAddWorkout({ date: selectedDate, title, type: workoutType, durationMinutes: duration, caloriesBurned: burn, notes: workoutNotes.trim() || undefined });
    setIsAddModalOpen(false);
    setWorkoutTitle('');
    setWorkoutNotes('');
  };

  return <>
    <div className="app-scroll progress-page" inert={isAddModalOpen}>
      <header className="progress-heading">
        <h1>{t('Progress')}</h1>
        <button type="button" className="icon-command" aria-label={t('Log Workout')} title={t('Log Workout')} onClick={() => setIsAddModalOpen(true)}><Plus size={23} /></button>
      </header>
      <BodyProgress onNativeCameraPendingChange={onNativeCameraPendingChange} />
      <section className="energy-summary" aria-label={t('Net Calories ({date})', { date: selectedDate === todayKey ? t('Today') : selectedDate })}>
        <div className="energy-summary__net"><span>{t('Net Calories ({date})', { date: selectedDate === todayKey ? t('Today') : selectedDate })}</span><p><strong>{netCalories.toLocaleString(getLocale())}</strong> {t('kcal net')}</p></div>
        <div className="energy-summary__goal"><span>{t('Goal')}</span><strong>{targetCalories.toLocaleString(getLocale())} {t('kcal')}</strong></div>
        <dl className="energy-summary__breakdown"><div><dt>{t('Food Eaten')}</dt><dd>+{totalFoodCalories.toLocaleString(getLocale())} <small>{t('kcal')}</small></dd></div><div><dt>{t('Workouts Burned')}</dt><dd>-{totalWorkoutBurn.toLocaleString(getLocale())} <small>{t('kcal')}</small></dd></div></dl>
      </section>
      <section className="calorie-trend">
        <header><h2>{t('Last 7 days')}</h2><span>{t('Target:')} {targetCalories.toLocaleString(getLocale())} {t('kcal')}</span></header>
        <div className="calorie-trend__chart">{last7Days.map(day => <div className={day.date === selectedDate ? 'is-selected' : ''} key={day.date}>
          <small>{t(day.label)}</small>
          <div className="calorie-trend__track"><span style={{ width: `${Math.max(0, Math.min(100, day.food / Math.max(1, targetCalories) * 100))}%` }} title={`${day.date}: ${day.food} ${t('kcal')}`} /></div>
          <strong>{day.food.toLocaleString(getLocale())}</strong>
        </div>)}</div>
      </section>
      <section className="workouts-section">
        <header><h2>{t('Workouts Logged ({count})', { count: dayWorkouts.length })}</h2><span>{t('Total Burn:')} {totalWorkoutBurn.toLocaleString(getLocale())} {t('kcal')}</span></header>
        {dayWorkouts.length ? dayWorkouts.map(workout => {
          const choice = WORKOUT_TYPES.find(choice => choice.type === workout.type) ?? WORKOUT_TYPES[0];
          return <article className="workout-row" key={workout.id}>
            <choice.Icon size={22} />
            <div className="workout-row__copy"><h3>{workout.title}</h3><p><Clock size={12} />{workout.durationMinutes} {t('min')}<span>·</span>{t(choice.label)}</p></div>
            <strong>-{workout.caloriesBurned} <small>{t('kcal')}</small></strong>
            <button type="button" className="icon-command" aria-label={t('Delete workout')} title={t('Delete workout')} onClick={() => onDeleteWorkout(workout.id)}><Trash2 size={17} /></button>
          </article>;
        }) : <div className="workouts-empty"><Dumbbell size={28} strokeWidth={1.5} /><p>{t('No workouts logged yet')}</p><button type="button" onClick={() => setIsAddModalOpen(true)}><Plus size={17} />{t('Add Workout')}</button></div>}
      </section>
    </div>
    {isAddModalOpen && <div className="workout-overlay" onClick={event => { if (event.target === event.currentTarget) setIsAddModalOpen(false); }}>
      <form ref={dialog} className="workout-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={handleSaveWorkout}>
        <header><h2 id={titleId}>{t('Log Workout')}</h2><button type="button" className="icon-command" aria-label={t('Close workout')} title={t('Close')} onClick={() => setIsAddModalOpen(false)}><X size={21} /></button></header>
        <fieldset className="workout-types"><legend>{t('Workout Type')}</legend><div>{WORKOUT_TYPES.map(({ type, label, Icon }) => <button key={type} type="button" aria-pressed={workoutType === type} className={workoutType === type ? 'is-selected' : ''} onClick={() => setWorkoutType(type)}><Icon size={19} /><span>{t(label)}</span></button>)}</div></fieldset>
        <label className="app-field">{t('Workout Name')}<input type="text" value={workoutTitle} onChange={event => setWorkoutTitle(event.target.value)} placeholder={t('e.g. Upper Body Push, 5k Outdoor Run')} /></label>
        <div className="workout-dialog__numbers"><label className="app-field">{t('Duration (min)')}<input type="number" inputMode="numeric" min="1" max="600" required value={durationMinutes} onChange={event => setDurationMinutes(event.target.value)} /></label><label className="app-field">{t('Calories Burned')}<input type="number" inputMode="numeric" min="0" max="5000" required value={caloriesBurned} onChange={event => setCaloriesBurned(event.target.value)} /></label></div>
        <label className="app-field">{t('Notes (optional)')}<input type="text" value={workoutNotes} onChange={event => setWorkoutNotes(event.target.value)} placeholder={t('e.g. Felt energetic, bench pressed 80kg')} /></label>
        <button type="submit" className="primary-command"><Check size={19} />{t('Save Workout')}</button>
      </form>
    </div>}
  </>;
}
