import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Dumbbell, Equal, Mars, TrendingDown, Venus } from 'lucide-react';
import { ActivityLevel, BiologicalSex, UnitSystem, UserProfile, WeightGoal } from '../types';
import { calculateEnergyNeeds, kgToLbs, lbsToKg } from '../utils/calculator';
import { NumberPicker } from './NumberPicker';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserProfile) => void;
  initialProfile: UserProfile;
}

const goals = [
  { value: 'lose', label: 'Lose weight', description: 'Lose fat while keeping your muscle', Icon: TrendingDown },
  { value: 'maintain', label: 'Maintain weight', description: 'Stay steady and build better eating habits', Icon: Equal },
  { value: 'gain', label: 'Build muscle', description: 'Fuel your training and make room to grow', Icon: Dumbbell },
] as const;
const activities: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Desk work and very little movement' },
  { value: 'light', label: 'Lightly active', description: 'Walking and light everyday movement' },
  { value: 'moderate', label: 'Active', description: 'Training 3 to 5 days a week' },
  { value: 'very_active', label: 'Athletic', description: 'Hard training almost every day' },
];
const titles = ["What's your goal?", "Let's get to know you", 'Your height and weight', 'How active are you?', 'What pace suits you?', 'Your plan, ready to go'];
const descriptions = [
  "We'll use this to set your calories and macros.",
  'A few details to estimate your daily needs.',
  'Find your measurements on the ruler.',
  'Choose what best describes your usual week.',
  'A steady pace is easier to keep up with.',
  'A starting point you can adjust as you go.',
];

function SelectionMark({ selected }: { selected: boolean }) {
  return <span className={`setup-choice__mark ${selected ? 'is-selected' : ''}`} aria-hidden="true">{selected && <Check size={14} />}</span>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete, initialProfile }) => {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<WeightGoal>(initialProfile.goal ?? 'maintain');
  const [sex, setSex] = useState<BiologicalSex>(initialProfile.sex);
  const [age, setAge] = useState(initialProfile.age);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile.unitSystem);
  const [heightCm, setHeightCm] = useState(initialProfile.heightCm);
  const [weightKg, setWeightKg] = useState(initialProfile.weightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile.activityLevel);
  const [weeklyWeightChangeKg, setWeeklyWeightChangeKg] = useState(initialProfile.weeklyWeightChangeKg ?? 0.25);
  const dialogRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setGoal(initialProfile.goal ?? 'maintain');
    setSex(initialProfile.sex);
    setAge(initialProfile.age);
    setUnitSystem(initialProfile.unitSystem);
    setHeightCm(initialProfile.heightCm);
    setWeightKg(initialProfile.weightKg);
    setActivityLevel(initialProfile.activityLevel);
    setWeeklyWeightChangeKg(initialProfile.weeklyWeightChangeKg ?? 0.25);
    const previousFocus = document.activeElement as HTMLElement | null;
    return () => previousFocus?.focus();
  }, [isOpen, initialProfile]);

  useEffect(() => {
    if (!isOpen) return;
    headingRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollTo(0, 0);
  }, [step, isOpen]);

  if (!isOpen) return null;
  const profile: UserProfile = {
    ...initialProfile,
    age, sex, heightCm, weightKg, unitSystem, activityLevel, goal, weeklyWeightChangeKg,
    customTargetCalories: null,
    hasCompletedOnboarding: true,
  };
  const needs = calculateEnergyNeeds(profile);
  const valid = age >= 10 && age <= 90 && Number.isInteger(age) && heightCm >= 120 && heightCm <= 220 && weightKg >= 35 && weightKg <= 160;
  const metric = unitSystem === 'metric';
  const inches = Math.round(heightCm / 2.54);
  const weight = metric ? weightKg : kgToLbs(weightKg);
  const weightUnit = metric ? 'kg' : 'lb';
  const paceEnabled = goal !== 'maintain' && age >= 18;
  const pace = paceEnabled ? weeklyWeightChangeKg : 0;
  const paceDisplay = (metric ? pace : kgToLbs(pace)).toFixed(2);

  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  return (
    <form ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="setup-title" onKeyDown={trapFocus} className="setup"
      onSubmit={event => {
        event.preventDefault();
        if (!valid) return;
        if (step < 6) setStep(step + 1);
        else onComplete(profile);
      }}>
      <header className="setup-header">
        <span className="setup-step" aria-label={`Step ${step} of 6`}>{step} / 6</span>
        <div className="setup-progress" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={step}>
          <span style={{ width: `${step / 6 * 100}%` }} />
        </div>
        <button type="button" aria-label="Previous step" title="Back" disabled={step === 1} onClick={() => setStep(step - 1)} className="setup-back"><ChevronLeft size={22} /></button>
      </header>

      <div ref={contentRef} className="setup-content">
        <h2 id="setup-title" ref={headingRef} tabIndex={-1} className="setup-title">{titles[step - 1]}</h2>
        <p className="setup-description">{descriptions[step - 1]}</p>

        {step === 1 && (
          <fieldset className="setup-options">
            <legend className="sr-only">Your goal</legend>
            {goals.map(option => (
              <label key={option.value} className={`setup-choice ${goal === option.value ? 'is-selected' : ''}`}>
                <input type="radio" name="goal" checked={goal === option.value} onChange={() => setGoal(option.value)} className="sr-only" />
                <span className="setup-choice__icon"><option.Icon size={23} strokeWidth={1.75} /></span>
                <span className="setup-choice__copy"><strong>{option.label}</strong><span>{option.description}</span></span>
                <SelectionMark selected={goal === option.value} />
              </label>
            ))}
          </fieldset>
        )}

        {step === 2 && (
          <div className="setup-fields">
            <fieldset className="setup-sex">
              <legend className="sr-only">Biological sex</legend>
              {([{ value: 'female', label: 'Female', Icon: Venus }, { value: 'male', label: 'Male', Icon: Mars }] as const).map(option => (
                <label key={option.value} className={`setup-sex__option ${sex === option.value ? 'is-selected' : ''}`}>
                  <input type="radio" name="sex" checked={sex === option.value} onChange={() => setSex(option.value)} className="sr-only" />
                  <option.Icon size={32} strokeWidth={1.75} aria-hidden="true" />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="setup-age">
              <span className="setup-field-label">Your age</span>
              <div className="setup-age__wheel"><NumberPicker label="Age" min={10} max={90} value={age} onChange={setAge} vertical /></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="setup-measurements">
            <fieldset className="setup-units">
              <legend className="sr-only">Measurement units</legend>
              {(['metric', 'imperial'] as const).map(value => <label key={value} className={unitSystem === value ? 'is-selected' : ''}>
                <input type="radio" name="units" checked={unitSystem === value} onChange={() => setUnitSystem(value)} className="sr-only" />
                {value === 'metric' ? 'kg · cm' : 'lb · ft'}
              </label>)}
            </fieldset>
            <div className="setup-measurement">
              <span className="setup-field-label">Height</span>
              <p className="setup-measurement__value">{metric ? Math.round(heightCm) : `${Math.floor(inches / 12)}′ ${inches % 12}″`}<span>{metric ? 'cm' : 'ft / in'}</span></p>
              <NumberPicker key={`height-${unitSystem}`} label={metric ? 'Height in centimeters' : 'Height in inches'} min={metric ? 120 : 48} max={metric ? 220 : 86} value={metric ? heightCm : inches} onChange={value => setHeightCm(metric ? value : Math.round(value * 2.54))} />
            </div>
            <div className="setup-measurement">
              <span className="setup-field-label">Weight</span>
              <p className="setup-measurement__value">{Number(weight.toFixed(1))}<span>{weightUnit}</span></p>
              <NumberPicker key={`weight-${unitSystem}`} label={metric ? 'Weight in kilograms' : 'Weight in pounds'} min={metric ? 35 : 77.5} max={metric ? 160 : 352.5} step={0.5} value={weight} onChange={value => setWeightKg(metric ? value : lbsToKg(value))} />
            </div>
          </div>
        )}

        {step === 4 && (
          <fieldset className="setup-options">
            <legend className="sr-only">Activity level</legend>
            {activities.map((option, index) => (
              <label key={option.value} className={`setup-choice ${activityLevel === option.value ? 'is-selected' : ''}`}>
                <input type="radio" name="activity" checked={activityLevel === option.value} onChange={() => setActivityLevel(option.value)} className="sr-only" />
                <span className="setup-choice__icon setup-activity-bars" aria-hidden="true">{[0, 1, 2, 3].map(bar => <i key={bar} style={{ height: 8 + bar * 5, opacity: bar <= index ? 1 : 0.22 }} />)}</span>
                <span className="setup-choice__copy"><strong>{option.label}</strong><span>{option.description}</span></span>
                <SelectionMark selected={activityLevel === option.value} />
              </label>
            ))}
          </fieldset>
        )}

        {step === 5 && (
          <div className="setup-pace">
            <p className="setup-pace__value">{paceEnabled ? `${goal === 'lose' ? '−' : '+'}${paceDisplay}` : '0.00'}<span>{weightUnit} / week</span></p>
            <input type="range" aria-label="Weekly weight change in kilograms" min={0.1} max={0.75} step={0.05} value={weeklyWeightChangeKg} disabled={!paceEnabled} onChange={event => setWeeklyWeightChangeKg(Number(event.target.value))} className="setup-pace__slider" style={{ '--pace-progress': `${paceEnabled ? (weeklyWeightChangeKg - 0.1) / 0.65 * 100 : 0}%` } as React.CSSProperties} />
            <div className="setup-pace__ends"><span>Steady</span><span>Faster</span></div>
            {!paceEnabled && <p className="setup-pace__note">{age < 18 ? 'Your plan supports your daily energy needs while you grow. Weight-change targets are for adults.' : 'Your plan will keep your weight steady. No weekly change needed.'}</p>}
          </div>
        )}

        {step === 6 && (
          <div className="setup-plan">
            <span className="setup-plan__goal">{goals.find(option => option.value === goal)?.label}</span>
            <p className="setup-plan__calories">{needs.tdee.toLocaleString('en-US')}</p>
            <p className="setup-plan__unit">calories / day</p>
            <dl className="setup-plan__macros">
              {[['Protein', needs.proteinTargetGrams], ['Carbs', needs.carbsTargetGrams], ['Fat', needs.fatTargetGrams]].map(([label, grams]) => <div key={label}><dt>{label}</dt><dd>{grams}<span> g</span></dd></div>)}
            </dl>
            <p className="setup-plan__note">{age < 18 ? 'An energy estimate for your growing years, without a weight-change adjustment.' : 'Calorie needs and weekly changes are estimates. Adjust your target in Settings as you learn what works for you.'}</p>
          </div>
        )}
      </div>

      <footer className="setup-footer">
        <button type="submit" disabled={!valid} className="setup-next">{step === 5 ? 'Show my plan' : step === 6 ? 'Start my day' : 'Next'}</button>
      </footer>
    </form>
  );
};
