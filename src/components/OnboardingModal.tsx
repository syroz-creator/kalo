import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Activity,
  Scale,
  Flame,
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
  kgToLbs,
} from '../utils/calculator';
import { Logo } from './Logo';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserProfile) => void;
  initialProfile: UserProfile;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  initialProfile,
}) => {
  const [step, setStep] = useState<number>(1);
  const [sex, setSex] = useState<BiologicalSex>(initialProfile.sex || 'male');
  const [age, setAge] = useState<number>(initialProfile.age || 24);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile.unitSystem || 'metric');
  const [heightCm, setHeightCm] = useState<number>(initialProfile.heightCm || 175);
  const [weightKg, setWeightKg] = useState<number>(initialProfile.weightKg || 70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile.activityLevel || 'moderate');

  if (!isOpen) return null;

  const currentProfile: UserProfile = {
    age,
    sex,
    heightCm,
    weightKg,
    unitSystem,
    activityLevel,
    customTargetCalories: null,
    hasCompletedOnboarding: true,
  };

  const energyNeeds = calculateEnergyNeeds(currentProfile);
  const { ft, inch } = cmToFtIn(heightCm);
  const lbs = kgToLbs(weightKg);

  const handleFinish = () => {
    onComplete(currentProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 text-white">
      <div className="w-full max-w-[390px] bg-[#0E0E10] rounded-[36px] shadow-2xl border-2 border-yellow-400/40 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header with Glowing Yellow Brand Emblem */}
        <div className="px-6 pt-5 pb-3 border-b border-zinc-800/80 bg-[#121214]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Logo size="sm" showSubtitle={false} />
              <span className="text-[10px] font-black text-yellow-400 tracking-wider uppercase block bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                Setup
              </span>
            </div>
            <div className="text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
              Step {step} of 4
            </div>
          </div>

          {/* Progress bar with electric yellow gradient */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 transition-all duration-300 rounded-full shadow-sm shadow-yellow-400"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 no-scrollbar">
          {/* STEP 1: Sex & Age */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Metabolic Baseline
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Who is tracking?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Used by clinical equations to determine your resting metabolic coefficient.
                </p>
              </div>

              {/* Sex selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Biological Sex
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSex('female')}
                    className={`py-3.5 px-4 rounded-2xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                      sex === 'female'
                        ? 'border-yellow-400 bg-yellow-400/15 text-yellow-400 shadow-md shadow-yellow-400/10 ring-2 ring-yellow-400/30'
                        : 'border-zinc-800 bg-[#18181B] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base font-black">Female</span>
                    <span className="text-[11px] text-zinc-500 font-medium">BMR offset -161</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSex('male')}
                    className={`py-3.5 px-4 rounded-2xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                      sex === 'male'
                        ? 'border-yellow-400 bg-yellow-400/15 text-yellow-400 shadow-md shadow-yellow-400/10 ring-2 ring-yellow-400/30'
                        : 'border-zinc-800 bg-[#18181B] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base font-black">Male</span>
                    <span className="text-[11px] text-zinc-500 font-medium">BMR offset +5</span>
                  </button>
                </div>
              </div>

              {/* Age selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-300">Age</label>
                  <span className="text-sm font-black text-yellow-400 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-700">
                    {age} years old
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAge((prev) => Math.max(10, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-black hover:bg-zinc-800 flex items-center justify-center text-lg active:scale-95 transition-all"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="flex-1 accent-yellow-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setAge((prev) => Math.min(90, prev + 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-black hover:bg-zinc-800 flex items-center justify-center text-lg active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400 mt-2 bg-[#18181B] p-2.5 rounded-xl border border-zinc-800">
                  {age < 18 ? (
                    <span className="text-yellow-400 font-bold">
                      Age &lt; 18: Automatically routed to Schofield Adolescent Standard (FAO/WHO/UNU).
                    </span>
                  ) : (
                    <span>
                      Age 18+: Uses Mifflin-St Jeor gold standard clinical formula.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Height & Weight */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg mb-2">
                    <Scale className="w-3.5 h-3.5" />
                    Body Dimensions
                  </span>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Height & Weight
                  </h3>
                </div>

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

              {/* Height */}
              <div className="bg-[#18181B] p-3.5 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Height</label>
                  <span className="text-sm font-black text-yellow-400">
                    {unitSystem === 'metric' ? `${heightCm} cm` : `${ft} ft ${inch} in`}
                  </span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="220"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Weight */}
              <div className="bg-[#18181B] p-3.5 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Weight</label>
                  <span className="text-sm font-black text-yellow-400">
                    {unitSystem === 'metric' ? `${weightKg} kg` : `${lbs} lbs`}
                  </span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="160"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Activity Level */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg mb-2">
                  <Activity className="w-3.5 h-3.5" />
                  Lifestyle Activity
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  How active are you?
                </h3>
              </div>

              <div className="space-y-2">
                {(
                  [
                    {
                      level: 'sedentary',
                      label: 'Sedentary',
                      desc: 'Desk job, minimal daily walking',
                      badge: '1.20x',
                    },
                    {
                      level: 'light',
                      label: 'Lightly Active',
                      desc: '1–3 days light exercise or walking',
                      badge: '1.38x',
                    },
                    {
                      level: 'moderate',
                      label: 'Moderately Active',
                      desc: '3–5 days active training or active job',
                      badge: '1.55x',
                    },
                    {
                      level: 'very_active',
                      label: 'Very Active',
                      desc: '6–7 days hard training or manual labor',
                      badge: '1.73x',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => setActivityLevel(opt.level)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      activityLevel === opt.level
                        ? 'border-yellow-400 bg-yellow-400/15 shadow-md ring-2 ring-yellow-400/30'
                        : 'border-zinc-800 bg-[#18181B] hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        {opt.label}
                        <span className="text-[10px] font-bold text-black bg-yellow-400 px-1.5 py-0.2 rounded-md">
                          {opt.badge}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">{opt.desc}</div>
                    </div>
                    {activityLevel === opt.level && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 text-black flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Calorie Need Calculation Reveal */}
          {step === 4 && (
            <div className="space-y-4 text-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg mb-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Calibration Complete
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Your Daily Target
                </h3>
              </div>

              {/* Glowing Yellow Circular Ring */}
              <div className="py-2 flex justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="88"
                      cy="88"
                      r="74"
                      stroke="#27272A"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="88"
                      cy="88"
                      r="74"
                      stroke="#FACC15"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray="465"
                      strokeDashoffset="65"
                      strokeLinecap="round"
                      className="shadow-lg shadow-yellow-400/50"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {energyNeeds.tdee}
                    </span>
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                      kcal / day
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#18181B] p-3.5 rounded-2xl border border-zinc-800 text-left space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Method</span>
                  <span className="font-bold text-yellow-400">{energyNeeds.equationName}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Resting BMR</span>
                  <span className="font-bold text-white">{energyNeeds.bmr} kcal</span>
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                  Balanced target: Protein {energyNeeds.proteinTargetGrams}g · Carbs {energyNeeds.carbsTargetGrams}g · Fat {energyNeeds.fatTargetGrams}g.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 bg-[#121214] border-t border-zinc-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="h-12 px-4 rounded-2xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div className="text-[11px] text-zinc-500 font-medium">Quick calibration</div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="h-12 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-yellow-500/20 ml-auto"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="h-12 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-yellow-500/30 ml-auto"
            >
              <span>Start Tracking Foods</span>
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
