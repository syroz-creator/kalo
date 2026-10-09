import React from 'react';
import {
  Plus,
  Flame,
  Target,
  Camera,
  Droplets,
  Minus,
  Check,
} from 'lucide-react';
import { DailyEnergyNeeds, LoggedItem, MealType } from '../types';
import {
  getDisplayDateInfo,
  getTodayKey,
  getWeekDates,
} from '../utils/date';

interface TodayTabProps {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  loggedItems: LoggedItem[];
  energyNeeds: DailyEnergyNeeds;
  cupsDrank?: number;
  onUpdateWaterCups: (cups: number) => void;
  onOpenLogModal: (meal: MealType) => void;
  onEditItem: (item: LoggedItem) => void;
  onQuickSnap?: () => void;
}

const MEALS: { type: MealType; label: string; timeHint: string }[] = [
  { type: 'breakfast', label: 'Breakfast', timeHint: 'Morning' },
  { type: 'lunch', label: 'Lunch', timeHint: 'Midday' },
  { type: 'dinner', label: 'Dinner', timeHint: 'Evening' },
  { type: 'snacks', label: 'Snacks', timeHint: 'Anytime' },
];

export const TodayTab: React.FC<TodayTabProps> = ({
  selectedDate,
  onSelectDate,
  loggedItems,
  energyNeeds,
  cupsDrank = 0,
  onUpdateWaterCups,
  onOpenLogModal,
  onEditItem,
  onQuickSnap,
}) => {
  const dateInfo = getDisplayDateInfo(selectedDate);
  const todayKey = getTodayKey();
  const weekDays = getWeekDates(selectedDate);

  // Filter items for current selected date
  const dayItems = loggedItems.filter((item) => item.date === selectedDate);

  // Calculate day totals
  const totalCalories = dayItems.reduce((acc, curr) => acc + curr.calories, 0);
  const totalProtein = Math.round(dayItems.reduce((acc, curr) => acc + curr.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(dayItems.reduce((acc, curr) => acc + curr.carbs, 0) * 10) / 10;
  const totalFat = Math.round(dayItems.reduce((acc, curr) => acc + curr.fat, 0) * 10) / 10;

  const targetCalories = energyNeeds.tdee;
  const remainingCalories = targetCalories - totalCalories;

  // Bigger circular progress calculations (Radius = 104, Container = 256px / w-64 h-64)
  const radius = 104;
  const circumference = 2 * Math.PI * radius; // ~653.45
  const rawProgress = targetCalories > 0 ? totalCalories / targetCalories : 0;
  const clampedProgress = Math.min(1, Math.max(0, rawProgress));
  const strokeDashoffset = circumference - clampedProgress * circumference;

  // Macro progress percentages
  const proteinPercent = Math.min(100, Math.round((totalProtein / (energyNeeds.proteinTargetGrams || 1)) * 100));
  const carbsPercent = Math.min(100, Math.round((totalCarbs / (energyNeeds.carbsTargetGrams || 1)) * 100));
  const fatPercent = Math.min(100, Math.round((totalFat / (energyNeeds.fatTargetGrams || 1)) * 100));

  // Water calculations (8 cups = 2.0 Liters)
  const maxCups = 8;
  const safeCups = Math.max(0, Math.min(maxCups, cupsDrank));
  const litersDrank = (safeCups * 0.25).toFixed(2);
  const waterPercent = Math.min(100, Math.round((safeCups / maxCups) * 100));

  const handleCupClick = (cupIndex: number) => {
    // If clicking current cup level, decrease by 1, otherwise set to clicked cup
    if (safeCups === cupIndex) {
      onUpdateWaterCups(cupIndex - 1);
    } else {
      onUpdateWaterCups(cupIndex);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar text-white">
      {/* Week Days Little Circles Only (No arrows) */}
      <div className="bg-[#18181B] rounded-3xl border border-[#27272A] p-3 shadow-md">
        <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-800/80 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white">{dateInfo.label}</span>
            <span className="text-[11px] text-zinc-500 font-semibold">· {dateInfo.subLabel}</span>
          </div>

          {selectedDate !== todayKey && (
            <button
              type="button"
              onClick={() => onSelectDate(todayKey)}
              className="text-[10px] font-black uppercase tracking-wider text-yellow-400 hover:text-yellow-300 transition-colors bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20"
            >
              Today
            </button>
          )}
        </div>

        {/* 7 Little Circles for Week Days */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day.dateKey} className="flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-wider mb-1 ${
                day.isSelected ? 'text-yellow-400' : 'text-zinc-500'
              }`}>
                {day.dayLetter}
              </span>
              <button
                type="button"
                onClick={() => onSelectDate(day.dateKey)}
                className={`w-10 h-10 rounded-full flex flex-col items-center justify-center transition-all duration-200 ${
                  day.isSelected
                    ? 'bg-yellow-400 text-black font-black shadow-lg shadow-yellow-400/35 scale-105 ring-2 ring-yellow-300 animate-pop-bounce'
                    : 'bg-[#202024] border border-zinc-800 hover:border-yellow-400/50 text-zinc-300 active:scale-90 hover:scale-105'
                }`}
                aria-label={`Select ${day.dayLetter} ${day.dayNumber}`}
              >
                <span className="text-xs font-black">
                  {day.dayNumber}
                </span>
              </button>
              {day.isToday && !day.isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 shadow-xs shadow-yellow-400/50" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hero Circular Calorie Dashboard - BIGGER CIRCLE (256px x 256px, Radius 104) */}
      <div className="bg-[#18181B] rounded-3xl border border-[#27272A] p-4 shadow-xl relative overflow-hidden transition-all flex flex-col items-center">
        {/* Animated yellow ambient pulse glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

        {/* Bigger Circular Progress Display (256px x 256px, Radius 104) */}
        <div className="relative w-64 h-64 flex items-center justify-center my-1">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="#27272A"
              strokeWidth="14"
              fill="none"
            />
            {/* Dynamic Progress circle with glowing yellow gradient */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="url(#big-dark-calorie-ring)"
              strokeWidth="14"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="big-dark-calorie-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#EAB308" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner Ring Text Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-5xl font-black text-white tracking-tight leading-none">
              {Math.abs(remainingCalories).toLocaleString()}
            </span>
            <span className={`text-xs font-black mt-2 uppercase tracking-wider ${
              remainingCalories >= 0 ? 'text-yellow-400' : 'text-red-400 font-extrabold'
            }`}>
              {remainingCalories >= 0 ? 'kcal remaining' : 'kcal over'}
            </span>
          </div>
        </div>

        {/* Flanking Metrics: Eaten vs Target */}
        <div className="w-full flex items-center justify-around px-2 pt-3 border-t border-zinc-800 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400/10 text-yellow-400 flex items-center justify-center border border-yellow-400/20 shadow-xs">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Eaten
              </span>
              <span className="text-xs font-black text-white">
                {totalCalories.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">kcal</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 text-yellow-400 flex items-center justify-center border border-zinc-700 shadow-xs">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Target
              </span>
              <span className="text-xs font-black text-yellow-400">
                {targetCalories.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">kcal</span>
              </span>
            </div>
          </div>
        </div>

        {/* Macronutrients Micro Bars */}
        <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800 mt-2">
          <div className="p-2.5 rounded-2xl bg-[#202024] border border-zinc-800 text-center">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 mb-1">
              <span>Protein</span>
              <span className="text-yellow-400">{proteinPercent}%</span>
            </div>
            <div className="text-xs font-black text-white">
              {totalProtein}g <span className="text-[10px] text-zinc-500 font-normal">/ {energyNeeds.proteinTargetGrams}g</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#202024] border border-zinc-800 text-center">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 mb-1">
              <span>Carbs</span>
              <span className="text-amber-400">{carbsPercent}%</span>
            </div>
            <div className="text-xs font-black text-white">
              {totalCarbs}g <span className="text-[10px] text-zinc-500 font-normal">/ {energyNeeds.carbsTargetGrams}g</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#202024] border border-zinc-800 text-center">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 mb-1">
              <span>Fat</span>
              <span className="text-zinc-300">{fatPercent}%</span>
            </div>
            <div className="text-xs font-black text-white">
              {totalFat}g <span className="text-[10px] text-zinc-500 font-normal">/ {energyNeeds.fatTargetGrams}g</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-zinc-400 rounded-full transition-all duration-500"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DAILY WATER INTAKE TRACKER (2.0L / 8 CUPS) */}
      <div className="bg-[#18181B] rounded-3xl border border-[#27272A] p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-cyan-400/15 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
              <Droplets className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Water Intake</span>
                {safeCups >= 8 && (
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-400/30 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Goal Met!</span>
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-zinc-400">Target: 2.0 Liters · 8 Cups (250ml each)</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-base font-black text-cyan-400">{litersDrank}L</span>
            <span className="text-xs font-bold text-zinc-400"> / 2.00L</span>
          </div>
        </div>

        {/* 8 Clickable Water Cups */}
        <div className="grid grid-cols-8 gap-1.5 pt-1">
          {Array.from({ length: 8 }, (_, i) => {
            const cupNum = i + 1;
            const isFilled = safeCups >= cupNum;

            return (
              <button
                key={cupNum}
                type="button"
                onClick={() => handleCupClick(cupNum)}
                className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${
                  isFilled
                    ? 'bg-gradient-to-t from-cyan-500 to-cyan-400 text-black font-black shadow-md shadow-cyan-500/30 scale-105 animate-pop-bounce'
                    : 'bg-[#202024] border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:scale-105'
                }`}
                title={`Cup ${cupNum} (250ml)`}
              >
                <Droplets className={`w-3.5 h-3.5 ${isFilled ? 'text-black fill-black' : 'text-zinc-600'}`} />
                <span className={`text-[9px] mt-0.5 font-bold ${isFilled ? 'text-black font-black' : 'text-zinc-500'}`}>
                  {cupNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Water Quick Increment Buttons & Progress */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <div className="text-[11px] text-zinc-400 font-medium">
            {safeCups} of 8 cups ({Math.round(waterPercent)}%)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateWaterCups(Math.max(0, safeCups - 1))}
              disabled={safeCups <= 0}
              className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 flex items-center justify-center transition-transform active:scale-90"
              aria-label="Decrease water by 1 cup"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateWaterCups(Math.min(8, safeCups + 1))}
              disabled={safeCups >= 8}
              className="h-8 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-black font-black text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 hover:scale-105"
              aria-label="Add 1 cup of water"
            >
              <Plus className="w-3.5 h-3.5 text-black stroke-[3]" />
              <span>+1 Cup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Snap Meal Camera Action Shortcut with Shimmer Light Sweep */}
      {onQuickSnap && (
        <button
          type="button"
          onClick={onQuickSnap}
          className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 hover:from-yellow-300 hover:to-amber-300 border-2 border-yellow-400 rounded-2xl flex items-center justify-between text-black font-black text-xs shadow-lg shadow-yellow-500/20 active:scale-[0.98] transition-all relative overflow-hidden group"
        >
          {/* Gleaming light sweep animation */}
          <div className="absolute inset-0 w-1/3 bg-white/25 skew-x-12 animate-shimmer-wave pointer-events-none" />

          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-black text-yellow-400 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110">
              <Camera className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-black font-black">Snap Photo to Count Calories</span>
              <span className="block text-[10px] text-stone-900 font-semibold">Place a fork next to the plate for scale</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-black text-yellow-400 text-[10px] font-black relative z-10 group-hover:bg-zinc-900">
            Snap AI
          </span>
        </button>
      )}

      {/* Meals: Breakfast, Lunch, Dinner, Snacks */}
      <div className="space-y-2.5 pb-2">
        {MEALS.map(({ type, label, timeHint }) => {
          const mealItems = dayItems.filter((item) => item.meal === type);
          const mealCalories = mealItems.reduce((acc, curr) => acc + curr.calories, 0);

          return (
            <div
              key={type}
              className="bg-[#18181B] rounded-2xl border border-[#27272A] overflow-hidden shadow-md transition-all hover:border-zinc-700"
            >
              {/* Meal Card Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800/80 bg-[#202024]/60">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-black text-white">{label}</h3>
                  <span className="text-[10px] text-zinc-500 font-medium">· {timeHint}</span>
                  {mealCalories > 0 && (
                    <span className="text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-md ml-1 shadow-xs">
                      {mealCalories} kcal
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenLogModal(type)}
                  className="w-8 h-8 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black border border-yellow-500 shadow-md shadow-yellow-500/20 active:scale-95 flex items-center justify-center transition-all -mr-1"
                  aria-label={`Add food to ${label}`}
                >
                  <Plus className="w-4 h-4 text-black stroke-[3]" />
                </button>
              </div>

              {/* Logged Foods List */}
              {mealItems.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {mealItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-zinc-800/40 active:bg-zinc-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-yellow-400/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center justify-center flex-shrink-0 text-xs font-black">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {item.quantity} {item.unit} · P {item.protein}g · C {item.carbs}g · F {item.fat}g
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs font-black text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20">
                          {item.calories} kcal
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onOpenLogModal(type)}
                    className="text-xs text-zinc-500 hover:text-yellow-400 py-0.5 transition-colors inline-flex items-center gap-1.5 font-bold"
                  >
                    <Camera className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Snap meal photo or tap + to log</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
