import React, { useState } from 'react';
import {
  Dumbbell,
  Flame,
  Plus,
  Trash2,
  TrendingUp,
  Clock,
  Calendar,
  X,
  Check,
  Footprints,
  HeartPulse,
  Zap,
} from 'lucide-react';
import { LoggedItem, WorkoutItem, WorkoutType } from '../types';
import { addDaysToKey, getDisplayDateInfo, getTodayKey } from '../utils/date';

interface ProgressTabProps {
  selectedDate: string;
  loggedItems: LoggedItem[];
  workouts: WorkoutItem[];
  targetCalories: number;
  onAddWorkout: (workout: Omit<WorkoutItem, 'id' | 'createdAt'>) => void;
  onDeleteWorkout: (id: string) => void;
}

const WORKOUT_TYPES: { type: WorkoutType; label: string; icon: React.ReactNode }[] = [
  { type: 'strength', label: 'Strength', icon: <Dumbbell className="w-4 h-4" /> },
  { type: 'cardio', label: 'Cardio', icon: <HeartPulse className="w-4 h-4" /> },
  { type: 'walk', label: 'Walk / Run', icon: <Footprints className="w-4 h-4" /> },
  { type: 'hiit', label: 'HIIT', icon: <Zap className="w-4 h-4" /> },
];

export const ProgressTab: React.FC<ProgressTabProps> = ({
  selectedDate,
  loggedItems,
  workouts,
  targetCalories,
  onAddWorkout,
  onDeleteWorkout,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState<WorkoutType>('strength');
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [caloriesBurned, setCaloriesBurned] = useState('280');
  const [workoutNotes, setWorkoutNotes] = useState('');

  const todayKey = getTodayKey();

  // Filter workouts for selectedDate
  const dayWorkouts = workouts.filter((w) => w.date === selectedDate);
  const dayLogged = loggedItems.filter((item) => item.date === selectedDate);

  const totalFoodCalories = dayLogged.reduce((sum, item) => sum + item.calories, 0);
  const totalWorkoutBurn = dayWorkouts.reduce((sum, item) => sum + item.caloriesBurned, 0);
  const netCalories = totalFoodCalories - totalWorkoutBurn;

  // 7-day mini trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysToKey(todayKey, -6 + i);
    const dayFood = loggedItems.filter((item) => item.date === d).reduce((s, c) => s + c.calories, 0);
    const dayBurn = workouts.filter((item) => item.date === d).reduce((s, c) => s + c.caloriesBurned, 0);
    const info = getDisplayDateInfo(d);
    return {
      date: d,
      food: dayFood,
      burn: dayBurn,
      label: info.isToday ? 'Today' : info.label.split(',')[0],
    };
  });

  const handleSaveWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = Math.max(1, Number(durationMinutes) || 30);
    const burn = Math.max(0, Number(caloriesBurned) || 200);
    const title = workoutTitle.trim() || `${WORKOUT_TYPES.find((t) => t.type === workoutType)?.label} Session`;

    onAddWorkout({
      date: selectedDate,
      title,
      type: workoutType,
      durationMinutes: duration,
      caloriesBurned: burn,
      notes: workoutNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setWorkoutTitle('');
    setWorkoutNotes('');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Progress & Activity</span>
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Workouts, daily energy burn, and net calorie balance
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="h-9 px-3.5 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-xs rounded-2xl flex items-center gap-1.5 transition-all shadow-md shadow-yellow-500/10"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Log Workout</span>
        </button>
      </div>

      {/* Energy Balance Summary Card */}
      <div className="bg-[#18181B] rounded-3xl border border-[#27272A] p-4 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-baseline justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Net Calories ({selectedDate === todayKey ? 'Today' : selectedDate})
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black text-white tracking-tight">
                {netCalories.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-zinc-400">kcal net</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Goal
            </span>
            <span className="text-sm font-black text-yellow-400">
              {targetCalories.toLocaleString()} kcal
            </span>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="bg-[#202024] p-3 rounded-2xl border border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-400 block uppercase">Food Eaten</span>
            <span className="text-base font-black text-white mt-0.5 block">
              +{totalFoodCalories} <span className="text-[11px] font-medium text-zinc-500">kcal</span>
            </span>
          </div>
          <div className="bg-[#202024] p-3 rounded-2xl border border-zinc-800">
            <span className="text-[10px] font-bold text-yellow-400 block uppercase">Workouts Burned</span>
            <span className="text-base font-black text-yellow-400 mt-0.5 block">
              -{totalWorkoutBurn} <span className="text-[11px] font-medium text-yellow-400/60">kcal</span>
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Activity & Intake Mini Bars */}
      <div className="bg-[#18181B] rounded-3xl border border-[#27272A] p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
            7-Day Calorie Flow
          </span>
          <span className="text-[10px] font-bold text-zinc-400">Target: {targetCalories} kcal</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 items-end h-24 pt-2">
          {last7Days.map((d) => {
            const heightPercent = Math.min(100, Math.round((d.food / (targetCalories || 1)) * 100));
            const isSelected = d.date === selectedDate;
            return (
              <div key={d.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-3.5 rounded-t-md transition-all ${
                      isSelected
                        ? 'bg-yellow-400 shadow-md shadow-yellow-400/30'
                        : d.food > 0
                        ? 'bg-zinc-600'
                        : 'bg-zinc-800'
                    }`}
                    style={{ height: `${Math.max(8, heightPercent)}%` }}
                    title={`${d.date}: ${d.food} kcal`}
                  />
                </div>
                <span className={`text-[9px] font-bold truncate ${isSelected ? 'text-yellow-400' : 'text-zinc-500'}`}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logged Workouts List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Workouts Logged ({dayWorkouts.length})
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">
            Total Burn: {totalWorkoutBurn} kcal
          </span>
        </div>

        {dayWorkouts.length > 0 ? (
          <div className="space-y-2">
            {dayWorkouts.map((w) => (
              <div
                key={w.id}
                className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3.5 flex items-center justify-between hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
                    {w.type === 'strength' && <Dumbbell className="w-5 h-5" />}
                    {w.type === 'cardio' && <HeartPulse className="w-5 h-5" />}
                    {w.type === 'walk' && <Footprints className="w-5 h-5" />}
                    {w.type === 'hiit' && <Zap className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white truncate">{w.title}</div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {w.durationMinutes} min
                      </span>
                      <span>·</span>
                      <span className="capitalize">{w.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black text-yellow-400 block">
                      -{w.caloriesBurned} kcal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteWorkout(w.id)}
                    className="w-8 h-8 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 flex items-center justify-center transition-colors"
                    aria-label="Delete workout"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#18181B] border border-dashed border-zinc-800 rounded-3xl p-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-400 mx-auto flex items-center justify-center border border-yellow-400/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No workouts logged yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Record strength, running, walking, or sports to track active calorie burn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 px-4 py-2 bg-yellow-400 text-black font-black text-xs rounded-xl hover:bg-yellow-300 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Workout
            </button>
          </div>
        )}
      </div>

      {/* Add Workout Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-2">
          <div
            className="w-full max-w-[390px] bg-[#18181B] rounded-3xl border-2 border-yellow-400 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-yellow-400" />
                <span>Log Workout</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkout} className="space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Workout Type</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
                  {WORKOUT_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setWorkoutType(t.type)}
                      className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center gap-1 ${
                        workoutType === t.type
                          ? 'bg-yellow-400 text-black shadow-md font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Workout Name</label>
                <input
                  type="text"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  placeholder="e.g. Upper Body Push, 5k Outdoor Run"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Calories Burned</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={caloriesBurned}
                    onChange={(e) => setCaloriesBurned(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-yellow-400 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="e.g. Felt energetic, bench pressed 80kg"
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-yellow-500/10 mt-2"
              >
                <Check className="w-4 h-4 text-black" />
                <span>Save Workout</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
