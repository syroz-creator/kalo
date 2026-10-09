import React, { useState } from 'react';
import {
  UserProfile,
  ActivityLevel,
  BiologicalSex,
  UnitSystem,
} from '../types';
import {
  calculateEnergyNeeds,
  cmToFtIn,
  ftInToCm,
  kgToLbs,
  lbsToKg,
} from '../utils/calculator';
import { Check, Info } from 'lucide-react';

interface MyNeedsTabProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onOpenOnboarding?: () => void;
}

const ACTIVITY_OPTIONS: {
  level: ActivityLevel;
  label: string;
  desc: string;
}[] = [
  {
    level: 'sedentary',
    label: 'Sedentary',
    desc: 'Desk job, minimal daily movement, little or no exercise',
  },
  {
    level: 'light',
    label: 'Lightly Active',
    desc: 'Light daily walking, light training 1–3 days per week',
  },
  {
    level: 'moderate',
    label: 'Moderately Active',
    desc: 'Regular exercise 3–5 days per week or active standing job',
  },
  {
    level: 'very_active',
    label: 'Very Active',
    desc: 'Hard exercise 6–7 days per week or heavy physical labor',
  },
];

export const MyNeedsTab: React.FC<MyNeedsTabProps> = ({ profile, onSaveProfile, onOpenOnboarding }) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(profile.unitSystem);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [age, setAge] = useState<number>(profile.age);
  const [heightCm, setHeightCm] = useState<number>(profile.heightCm);
  const [weightKg, setWeightKg] = useState<number>(profile.weightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);

  // Custom target override
  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(
    profile.customTargetCalories !== null && profile.customTargetCalories !== undefined
  );
  const [customCalories, setCustomCalories] = useState<string>(
    profile.customTargetCalories ? String(profile.customTargetCalories) : ''
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Imperial helper values
  const { ft: currentFt, inch: currentInch } = cmToFtIn(heightCm);
  const currentLbs = kgToLbs(weightKg);

  // Current calculated needs
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
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Title & Wizard Recalibrate Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Energy Needs</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Published clinical metabolic expenditure formulas.
          </p>
        </div>
        {onOpenOnboarding && (
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200/90 border border-amber-300/60 px-3 py-1.5 rounded-xl transition-all shadow-xs"
          >
            Guided Setup
          </button>
        )}
      </div>

      {/* Energy Calculation Result Card */}
      <div className="bg-gradient-to-b from-yellow-50/90 to-amber-50/60 rounded-3xl border-2 border-yellow-300 p-4 shadow-sm space-y-3">
        <div className="flex items-baseline justify-between border-b border-yellow-200/80 pb-3">
          <div>
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Estimated Daily Needs
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black tracking-tight text-stone-950">
                {energyNeeds.tdee.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-stone-600">kcal / day</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-500 font-bold block">Basal BMR</span>
            <span className="text-sm font-black text-stone-800">
              {energyNeeds.bmr.toLocaleString()} kcal
            </span>
          </div>
        </div>

        {/* Scientific Equation badge & note */}
        <div className="space-y-1.5 text-xs text-stone-700 bg-white/80 rounded-2xl p-3 border border-yellow-200">
          <div className="flex items-center gap-1.5 font-bold text-stone-950">
            <Info className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
            <span>Method: {energyNeeds.equationName}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600">
            {energyNeeds.explanation}
          </p>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Note: All formula results are estimates of Total Daily Energy Expenditure (TDEE).
          </p>
        </div>

        {/* Recommended Balanced Macronutrients */}
        <div className="pt-1">
          <div className="text-[11px] font-bold text-stone-700 mb-2">
            Target Macronutrient Distribution ({isCustomTarget ? 'Custom Goal' : 'Estimated TDEE'})
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-xl border border-yellow-200">
              <span className="block text-[11px] text-stone-500 font-bold">Protein (25%)</span>
              <span className="text-sm font-black text-stone-950">
                {energyNeeds.proteinTargetGrams}g
              </span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-yellow-200">
              <span className="block text-[11px] text-stone-500 font-bold">Carbs (50%)</span>
              <span className="text-sm font-black text-stone-950">
                {energyNeeds.carbsTargetGrams}g
              </span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-yellow-200">
              <span className="block text-[11px] text-stone-500 font-bold">Fat (25%)</span>
              <span className="text-sm font-black text-stone-950">
                {energyNeeds.fatTargetGrams}g
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Profile Form */}
      <form onSubmit={handleSave} className="bg-white/90 rounded-3xl border-2 border-yellow-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Personal Parameters</h3>

          {/* Unit Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setUnitSystem('metric')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                unitSystem === 'metric' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              Metric
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem('imperial')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                unitSystem === 'imperial' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              Imperial
            </button>
          </div>
        </div>

        {/* Biological Sex for equation */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Biological Sex (used for BMR equation constants)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSex('female')}
              className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                sex === 'female'
                  ? 'border-green-600 bg-green-50/50 text-gray-900 font-semibold'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Female
            </button>
            <button
              type="button"
              onClick={() => setSex('male')}
              className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                sex === 'male'
                  ? 'border-green-600 bg-green-50/50 text-gray-900 font-semibold'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Male
            </button>
          </div>
        </div>

        {/* Age */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Age</label>
            {age < 18 ? (
              <span className="text-[11px] text-green-700 font-medium">
                Schofield Youth Standard (Ages 10–17)
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 font-normal">
                Mifflin-St Jeor Adult Standard
              </span>
            )}
          </div>
          <input
            type="number"
            min="10"
            max="110"
            value={age}
            onChange={(e) => setAge(Math.max(10, Math.min(110, Number(e.target.value) || 18)))}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-3">
          {unitSystem === 'metric' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="80"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value) || 70)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Height (ft & in)
                </label>
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
                    className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
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
                    className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Weight (lbs)
                </label>
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
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </>
          )}
        </div>

        {/* Everyday Activity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Everyday Activity Level
          </label>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map((item) => (
              <label
                key={item.level}
                onClick={() => setActivityLevel(item.level)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  activityLevel === item.level
                    ? 'border-green-600 bg-green-50/40 text-gray-900'
                    : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="activityLevel"
                  checked={activityLevel === item.level}
                  onChange={() => setActivityLevel(item.level)}
                  className="mt-0.5 text-green-600 focus:ring-green-600"
                />
                <div className="text-xs">
                  <div className="font-semibold text-gray-900">{item.label}</div>
                  <div className="text-gray-500 mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Target Mode: Use calculated estimate vs Custom calorie target */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Daily Goal Setting
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsCustomTarget(false)}
              className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                !isCustomTarget
                  ? 'border-green-600 bg-green-50/40 text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <div className="font-semibold">Use Calculated Estimate ({energyNeeds.tdee} kcal)</div>
              <div className="text-gray-500 text-[11px] mt-0.5">
                Automatically adapts if your age, weight, or activity level changes.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomTarget(true)}
              className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                isCustomTarget
                  ? 'border-green-600 bg-green-50/40 text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <div className="font-semibold">Set Custom Calorie Goal</div>
              <div className="text-gray-500 text-[11px] mt-0.5">
                Specify a fixed daily target according to personal preference.
              </div>
            </button>

            {isCustomTarget && (
              <div className="pt-2">
                <input
                  type="number"
                  min="800"
                  max="10000"
                  value={customCalories}
                  onChange={(e) => setCustomCalories(e.target.value)}
                  placeholder="e.g. 2100"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 active:scale-[0.98] text-stone-950 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm border border-yellow-500"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-stone-950" />
                <span>Profile Saved!</span>
              </>
            ) : (
              <span>Save & Apply Energy Needs</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
