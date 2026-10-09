import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Info,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  ActivityLevel,
  BiologicalSex,
  UnitSystem,
  UserProfile,
} from '../types';
import {
  calculateEnergyNeeds,
  cmToFtIn,
  ftInToCm,
  kgToLbs,
  lbsToKg,
} from '../utils/calculator';

interface SettingsTabProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onOpenOnboarding: () => void;
  onClearAllData: () => void;
}

const ACTIVITY_OPTIONS: {
  level: ActivityLevel;
  label: string;
  desc: string;
}[] = [
  {
    level: 'sedentary',
    label: 'Sedentary',
    desc: 'Desk job, minimal daily movement, little exercise',
  },
  {
    level: 'light',
    label: 'Lightly Active',
    desc: 'Light daily walking, training 1–3 days per week',
  },
  {
    level: 'moderate',
    label: 'Moderately Active',
    desc: 'Regular exercise 3–5 days per week or active job',
  },
  {
    level: 'very_active',
    label: 'Very Active',
    desc: 'Hard daily workouts or heavy manual labor',
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  onSaveProfile,
  onOpenOnboarding,
  onClearAllData,
}) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(profile.unitSystem);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [age, setAge] = useState<number>(profile.age);
  const [heightCm, setHeightCm] = useState<number>(profile.heightCm);
  const [weightKg, setWeightKg] = useState<number>(profile.weightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);

  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(
    profile.customTargetCalories !== null && profile.customTargetCalories !== undefined
  );
  const [customCalories, setCustomCalories] = useState<string>(
    profile.customTargetCalories ? String(profile.customTargetCalories) : ''
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const { ft: currentFt, inch: currentInch } = cmToFtIn(heightCm);
  const currentLbs = kgToLbs(weightKg);

  const currentProfile: UserProfile = {
    age,
    sex,
    heightCm,
    weightKg,
    unitSystem,
    activityLevel,
    customTargetCalories: isCustomTarget && Number(customCalories) > 0 ? Number(customCalories) : null,
  };

  const energyNeeds = calculateEnergyNeeds(currentProfile);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      age,
      sex,
      heightCm,
      weightKg,
      unitSystem,
      activityLevel,
      customTargetCalories: isCustomTarget && Number(customCalories) > 0 ? Math.round(Number(customCalories)) : null,
    };
    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar text-white">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Settings & Needs</span>
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Calibrate your metabolic profile and formula parameters
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="h-8 px-3 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Wizard</span>
        </button>
      </div>

      {/* Energy Calculation Result Card */}
      <div className="bg-[#18181B] rounded-3xl border border-[#27272A] p-4 shadow-lg space-y-3">
        <div className="flex items-baseline justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Estimated Daily Needs
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black tracking-tight text-white">
                {energyNeeds.tdee.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-yellow-400">kcal / day</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Basal BMR
            </span>
            <span className="text-sm font-black text-zinc-300">
              {energyNeeds.bmr.toLocaleString()} kcal
            </span>
          </div>
        </div>

        {/* Formula Badge & Explanation */}
        <div className="space-y-1.5 text-xs text-zinc-300 bg-[#202024] rounded-2xl p-3 border border-zinc-800">
          <div className="flex items-center gap-1.5 font-black text-yellow-400">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Formula: {energyNeeds.equationName}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {energyNeeds.explanation}
          </p>
        </div>

        {/* Target Macro Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 bg-[#202024] rounded-2xl border border-zinc-800">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase">Protein</span>
            <span className="text-sm font-black text-white">{energyNeeds.proteinTargetGrams}g</span>
          </div>
          <div className="p-2.5 bg-[#202024] rounded-2xl border border-zinc-800">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase">Carbs</span>
            <span className="text-sm font-black text-white">{energyNeeds.carbsTargetGrams}g</span>
          </div>
          <div className="p-2.5 bg-[#202024] rounded-2xl border border-zinc-800">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase">Fat</span>
            <span className="text-sm font-black text-white">{energyNeeds.fatTargetGrams}g</span>
          </div>
        </div>
      </div>

      {/* Editable Parameters Form */}
      <form onSubmit={handleSave} className="bg-[#18181B] rounded-3xl border border-[#27272A] p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <h3 className="text-sm font-black text-white">Body Parameters</h3>

          <div className="flex bg-zinc-900 p-0.5 rounded-xl text-xs font-bold border border-zinc-800">
            <button
              type="button"
              onClick={() => setUnitSystem('metric')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                unitSystem === 'metric' ? 'bg-yellow-400 text-black shadow-xs' : 'text-zinc-400'
              }`}
            >
              Metric
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem('imperial')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                unitSystem === 'imperial' ? 'bg-yellow-400 text-black shadow-xs' : 'text-zinc-400'
              }`}
            >
              Imperial
            </button>
          </div>
        </div>

        {/* Sex */}
        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">
            Biological Sex (Equation Factor)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSex('female')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                sex === 'female'
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-sm'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              Female (-161)
            </button>
            <button
              type="button"
              onClick={() => setSex('male')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                sex === 'male'
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-sm'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              Male (+5)
            </button>
          </div>
        </div>

        {/* Age */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-zinc-300">Age</label>
            <span className="text-[11px] font-bold text-yellow-400">
              {age < 18 ? 'Schofield Youth Standard' : 'Mifflin-St Jeor Standard'}
            </span>
          </div>
          <input
            type="number"
            min="10"
            max="100"
            value={age}
            onChange={(e) => setAge(Math.max(10, Math.min(100, Number(e.target.value) || 20)))}
            className="w-full px-3.5 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
          />
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-3">
          {unitSystem === 'metric' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Height (cm)</label>
                <input
                  type="number"
                  min="80"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
                  className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="300"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value) || 70)}
                  className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Height (ft & in)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min="3"
                    max="7"
                    value={currentFt}
                    onChange={(e) => {
                      const newFt = Number(e.target.value) || 5;
                      setHeightCm(ftInToCm(newFt, currentInch));
                    }}
                    placeholder="ft"
                    className="w-full px-2 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={currentInch}
                    onChange={(e) => {
                      const newIn = Number(e.target.value) || 0;
                      setHeightCm(ftInToCm(currentFt, newIn));
                    }}
                    placeholder="in"
                    className="w-full px-2 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.5"
                  min="60"
                  max="600"
                  value={currentLbs}
                  onChange={(e) => {
                    const newLbs = Number(e.target.value) || 150;
                    setWeightKg(lbsToKg(newLbs));
                  }}
                  className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </>
          )}
        </div>

        {/* Activity Level */}
        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-2">
            Everyday Physical Activity
          </label>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map((item) => (
              <label
                key={item.level}
                onClick={() => setActivityLevel(item.level)}
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  activityLevel === item.level
                    ? 'border-yellow-400 bg-yellow-400/10 text-white'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="activityLevel"
                  checked={activityLevel === item.level}
                  onChange={() => setActivityLevel(item.level)}
                  className="mt-0.5 text-yellow-400 focus:ring-yellow-400"
                />
                <div className="text-xs">
                  <div className="font-bold text-white">{item.label}</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Goal Mode */}
        <div className="pt-2 border-t border-zinc-800">
          <label className="block text-xs font-bold text-zinc-300 mb-2">
            Target Calorie Goal
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsCustomTarget(false)}
              className={`w-full text-left p-3 rounded-2xl border text-xs transition-all ${
                !isCustomTarget
                  ? 'border-yellow-400 bg-yellow-400/10 text-white font-bold'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400'
              }`}
            >
              <div>Use Calculated Estimate ({energyNeeds.tdee} kcal)</div>
              <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                Automatically adjusts with changes in body weight or activity.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomTarget(true)}
              className={`w-full text-left p-3 rounded-2xl border text-xs transition-all ${
                isCustomTarget
                  ? 'border-yellow-400 bg-yellow-400/10 text-white font-bold'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400'
              }`}
            >
              <div>Custom Calorie Target</div>
              <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                Specify a fixed daily target.
              </div>
            </button>

            {isCustomTarget && (
              <div className="pt-1">
                <input
                  type="number"
                  min="800"
                  max="8000"
                  value={customCalories}
                  onChange={(e) => setCustomCalories(e.target.value)}
                  placeholder="e.g. 2100"
                  className="w-full px-3 py-2 text-sm font-bold bg-zinc-900 border border-zinc-700 rounded-xl text-yellow-400 focus:outline-none focus:border-yellow-400"
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full h-12 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-black" />
              <span>Settings Saved!</span>
            </>
          ) : (
            <span>Save Calorie Settings</span>
          )}
        </button>
      </form>

      {/* Danger Zone: Clear Data */}
      <div className="bg-[#18181B] rounded-3xl border border-red-950/60 p-4 space-y-2">
        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset App Data</span>
        </h4>
        <p className="text-[11px] text-zinc-500">
          Clear all logged meals, workouts, and recalibrate from scratch.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all logged meals and workouts?')) {
              onClearAllData();
            }
          }}
          className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline"
        >
          Reset All Logs
        </button>
      </div>
    </div>
  );
};
