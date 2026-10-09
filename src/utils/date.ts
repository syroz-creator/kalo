export function getTodayKey(): string {
  const now = new Date();
  return formatDateKey(now);
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid daylight saving edge shifts
}

export function addDaysToKey(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

export function getDisplayDateInfo(dateKey: string): {
  isToday: boolean;
  isYesterday: boolean;
  isTomorrow: boolean;
  label: string;
  subLabel: string;
} {
  const todayKey = getTodayKey();
  const yesterdayKey = addDaysToKey(todayKey, -1);
  const tomorrowKey = addDaysToKey(todayKey, 1);

  const dateObj = parseDateKey(dateKey);
  const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (dateKey === todayKey) {
    return {
      isToday: true,
      isYesterday: false,
      isTomorrow: false,
      label: 'Today',
      subLabel: `${weekday}, ${monthDay}`,
    };
  }

  if (dateKey === yesterdayKey) {
    return {
      isToday: false,
      isYesterday: true,
      isTomorrow: false,
      label: 'Yesterday',
      subLabel: `${weekday}, ${monthDay}`,
    };
  }

  if (dateKey === tomorrowKey) {
    return {
      isToday: false,
      isYesterday: false,
      isTomorrow: true,
      label: 'Tomorrow',
      subLabel: `${weekday}, ${monthDay}`,
    };
  }

  return {
    isToday: false,
    isYesterday: false,
    isTomorrow: false,
    label: `${weekday}, ${monthDay}`,
    subLabel: dateKey,
  };
}

export interface WeekDayItem {
  dateKey: string;
  dayLetter: string;
  dayNumber: number;
  monthShort: string;
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Returns the 7 days of the week containing the reference date (Monday to Sunday)
 */
export function getWeekDates(selectedKey: string): WeekDayItem[] {
  const selectedDate = parseDateKey(selectedKey);
  const todayKey = getTodayKey();

  // Day of week: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayOfWeek = selectedDate.getDay();
  // Monday is index 0:
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDate = new Date(selectedDate);
  mondayDate.setDate(selectedDate.getDate() + mondayOffset);

  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekDays: WeekDayItem[] = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(mondayDate);
    current.setDate(mondayDate.getDate() + i);
    const key = formatDateKey(current);
    weekDays.push({
      dateKey: key,
      dayLetter: letters[i],
      dayNumber: current.getDate(),
      monthShort: current.toLocaleDateString(undefined, { month: 'short' }),
      isToday: key === todayKey,
      isSelected: key === selectedKey,
    });
  }

  return weekDays;
}
