import { ActivityLevel, BiologicalSex, DailyEnergyNeeds, UserProfile } from '../types';

export function calculateEnergyNeeds(profile: UserProfile): DailyEnergyNeeds {
  const { age, sex, heightCm, weightKg, activityLevel } = profile;

  let bmr: number;
  let equationName: string;
  let isTeenEquation = false;
  let explanation: string;
  let activityMultiplier = 1.2;

  if (age < 18) {
    isTeenEquation = true;
    equationName = 'Schofield Equation (FAO/WHO/UNU)';
    explanation =
      'Calculated using the FAO/WHO/UNU Schofield standard, validated for children and teenagers. Calorie needs reflect an estimate of baseline growth and daily activity expenditure.';

    if (age >= 10) {
      if (sex === 'male') {
        bmr = 17.686 * weightKg + 658.2;
      } else {
        bmr = 13.384 * weightKg + 692.6;
      }
    } else {
      if (sex === 'male') {
        bmr = 22.706 * weightKg + 504.3;
      } else {
        bmr = 20.315 * weightKg + 485.9;
      }
    }

    const youthMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.35,
      light: 1.5,
      moderate: 1.65,
      very_active: 1.85,
    };
    activityMultiplier = youthMultipliers[activityLevel] || 1.5;
  } else {
    isTeenEquation = false;
    equationName = 'Mifflin-St Jeor Equation';
    explanation =
      'Calculated using the Mifflin-St Jeor formula, the recognized clinical standard for adult resting energy expenditure, multiplied by physical activity level.';

    const sexOffset = sex === 'male' ? 5 : -161;
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;

    const adultMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
    };
    activityMultiplier = adultMultipliers[activityLevel] || 1.2;
  }

  const rawTdee = bmr * activityMultiplier;
  const roundedTdee = Math.round(rawTdee / 10) * 10;
  const roundedBmr = Math.round(bmr);

  // Target calories can be custom override or calculated TDEE
  const effectiveCalories = profile.customTargetCalories ?? roundedTdee;

  // Balanced macronutrient distribution:
  // Protein: ~25% of energy (4 kcal/g)
  // Fat: ~25% of energy (9 kcal/g)
  // Carbs: ~50% of energy (4 kcal/g)
  const proteinTargetGrams = Math.round((effectiveCalories * 0.25) / 4);
  const fatTargetGrams = Math.round((effectiveCalories * 0.25) / 9);
  const carbsTargetGrams = Math.round((effectiveCalories * 0.5) / 4);

  return {
    bmr: roundedBmr,
    tdee: roundedTdee,
    equationName,
    isTeenEquation,
    explanation,
    proteinTargetGrams,
    carbsTargetGrams,
    fatTargetGrams,
  };
}

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches % 12);
  return { ft, inch };
}

export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}
