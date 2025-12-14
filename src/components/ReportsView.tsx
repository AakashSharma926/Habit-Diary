import { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  Share2, 
  Download,
  ChevronDown,
  Flame,
  Target,
  CheckCircle2,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import { 
  formatDate, 
  calculateOverallStreak,
  calculateHabitStreak,
  isEntryComplete
} from '../lib/utils';
import { StreakIcon } from './StreakIcon';
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore
} from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

interface ReportData {
  period: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  perfectDays: number;
  totalCompletions: number;
  expectedCompletions: number;
  overallCompletionRate: number;
  habitStats: {
    habitId: string;
    habitName: string;
    habitIcon: string;
    habitColor: string;
    completions: number;
    expected: number;
    completionRate: number;
    currentStreak: number;
    maxStreak: number;
  }[];
  bestHabit: string | null;
  worstHabit: string | null;
  overallStreak: number;
  maxStreak: number;
}

// Minimum date: January 1, 2025
const MIN_DATE = new Date(2025, 0, 1);

// Clamp date to not go before MIN_DATE
const clampDate = (date: Date): Date => {
  return isBefore(date, MIN_DATE) ? MIN_DATE : date;
};

const PRESET_RANGES = [
  { label: 'Last 7 Days', getValue: () => ({ from: clampDate(subDays(new Date(), 6)), to: new Date() }) },
  { label: 'This Week', getValue: () => ({ from: clampDate(startOfWeek(new Date(), { weekStartsOn: 1 })), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Last Week', getValue: () => ({ from: clampDate(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) },
  { label: 'Last 30 Days', getValue: () => ({ from: clampDate(subDays(new Date(), 29)), to: new Date() }) },
  { label: 'This Month', getValue: () => ({ from: clampDate(startOfMonth(new Date())), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getValue: () => ({ from: clampDate(startOfMonth(subMonths(new Date(), 1))), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: clampDate(subMonths(new Date(), 3)), to: new Date() }) },
  { label: 'Last 6 Months', getValue: () => ({ from: clampDate(subMonths(new Date(), 6)), to: new Date() }) },
  { label: 'Since 2025', getValue: () => ({ from: MIN_DATE, to: new Date() }) },
];

export function ReportsView() {
  const { habits, allEntries } = useHabits();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Default to last 7 days
    return { from: subDays(new Date(), 6), to: new Date() };
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const reportData = useMemo((): ReportData => {
    const startDate = dateRange.from;
    const endDate = dateRange.to;
    const periodLabel = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = days.length;
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    // Filter entries in period
    const periodEntries = allEntries.filter(e => e.date >= startStr && e.date <= endStr);

    // Calculate per-habit stats using targetAtEntry for historical accuracy
    const habitStats = habits.map(habit => {
      const habitEntries = periodEntries.filter(e => e.habitId === habit.id);
      
      let completions = 0;
      for (const day of days) {
        const dayStr = formatDate(day);
        const entry = habitEntries.find(e => e.date === dayStr);
        
        if (entry && isEntryComplete(entry, habit)) {
          completions++;
        }
      }

      const expected = totalDays;
      const completionRate = expected > 0 ? (completions / expected) * 100 : 0;
      
      // Get streak data
      const streakData = calculateHabitStreak(habit.id, habit, allEntries);

      return {
        habitId: habit.id,
        habitName: habit.name,
        habitIcon: habit.icon,
        habitColor: habit.color,
        completions,
        expected,
        completionRate,
        currentStreak: streakData.currentStreak,
        maxStreak: streakData.maxStreak
      };
    });

    // Calculate overall stats - perfect days using targetAtEntry
    let perfectDays = 0;
    for (const day of days) {
      const dayStr = formatDate(day);
      let allHabitsComplete = true;
      
      for (const habit of habits) {
        const entry = periodEntries.find(e => e.habitId === habit.id && e.date === dayStr);
        
        if (!entry || !isEntryComplete(entry, habit)) {
          allHabitsComplete = false;
          break;
        }
      }
      
      if (allHabitsComplete && habits.length > 0) perfectDays++;
    }

    const totalCompletions = habitStats.reduce((sum, h) => sum + h.completions, 0);
    const expectedCompletions = habitStats.reduce((sum, h) => sum + h.expected, 0);
    const overallCompletionRate = expectedCompletions > 0 
      ? (totalCompletions / expectedCompletions) * 100 
      : 0;

    // Find best and worst habits
    const sortedByRate = [...habitStats].sort((a, b) => b.completionRate - a.completionRate);
    const bestHabit = sortedByRate.length > 0 ? sortedByRate[0].habitName : null;
    const worstHabit = sortedByRate.length > 0 ? sortedByRate[sortedByRate.length - 1].habitName : null;

    // Overall streak
    const overallStreakData = calculateOverallStreak(habits, allEntries);

    return {
      period: periodLabel,
      startDate,
      endDate,
      totalDays,
      perfectDays,
      totalCompletions,
      expectedCompletions,
      overallCompletionRate,
      habitStats,
      bestHabit,
      worstHabit,
      overallStreak: overallStreakData.currentStreak,
      maxStreak: overallStreakData.maxStreak
    };
  }, [habits, allEntries, dateRange]);

  const handleShare = async (platform: 'whatsapp' | 'copy') => {
    const reportText = generateReportText(reportData);
    
    if (platform === 'whatsapp') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      await navigator.clipboard.writeText(reportText);
      alert('Report copied to clipboard!');
    }
  };

  // Get text emoji for reports (for sharing as text)
  const getTextEmoji = (streak: number): string => {
    if (streak >= 365) return '⭐';
    if (streak >= 100) return '💎';
    if (streak >= 60) return '👑';
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '🏆';
    if (streak >= 7) return '⚡';
    if (streak >= 3) return '✨';
    if (streak > 0) return '🌱';
    return '💤';
  };

  const generateReportText = (data: ReportData): string => {
    const emoji = getTextEmoji(data.overallStreak);
    
    let text = `🎯 Habit Diary Report\n`;
    text += `🌱 ${data.period}\n\n`;
    
    text += `📊 Overview\n`;
    text += `• Completion Rate: ${data.overallCompletionRate.toFixed(1)}%\n`;
    text += `• Perfect Days: ${data.perfectDays}/${data.totalDays}\n`;
    text += `• Current Streak: ${emoji} ${data.overallStreak} days\n`;
    text += `• Best Streak: 🏆 ${data.maxStreak} days\n\n`;
    
    text += `📈 Habit Breakdown\n`;
    for (const habit of data.habitStats) {
      text += `${habit.habitIcon} ${habit.habitName}: ${habit.completionRate.toFixed(0)}%\n`;
    }
    
    if (data.bestHabit) {
      text += `\n⭐ Best: ${data.bestHabit}\n`;
    }
    if (data.worstHabit && data.worstHabit !== data.bestHabit) {
      text += `💪 Needs work: ${data.worstHabit}\n`;
    }
    
    text += `\n---\nTracked with Habit Diary 🎯`;
    
    return text;
  };

  const handleDownloadReport = () => {
    const reportText = generateReportText(reportData);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Get display label for current date range
  const getDateRangeLabel = () => {
    const daysDiff = differenceInDays(dateRange.to, dateRange.from) + 1;
    if (daysDiff <= 7) return 'Weekly';
    if (daysDiff <= 31) return 'Monthly';
    if (daysDiff <= 120) return 'Quarterly';
    if (daysDiff <= 180) return 'Half Year';
    return 'Custom';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Progress Reports</h2>
              <p className="text-sm text-slate-400">Track your habit journey over time</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <button
            onClick={() => setShowDatePicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl transition-colors"
          >
            <Calendar className="w-4 h-4 text-violet-400" />
            <span>{getDateRangeLabel()}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-slate-400 mt-4">
          {reportData.period}
        </div>
      </div>

      {/* Date Range Picker Modal */}
      {showDatePicker && (
        <ReportsDateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Target className="w-4 h-4" />
            Completion Rate
          </div>
          <div className={`text-2xl sm:text-3xl font-bold ${
            reportData.overallCompletionRate >= 80 ? 'text-emerald-400' :
            reportData.overallCompletionRate >= 60 ? 'text-amber-400' :
            'text-red-400'
          }`}>
            {reportData.overallCompletionRate.toFixed(0)}%
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" />
            Perfect Days
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-violet-400">
            {reportData.perfectDays}
            <span className="text-lg text-slate-400">/{reportData.totalDays}</span>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Current Streak
          </div>
          <div className="flex items-center gap-2">
            <StreakIcon streak={reportData.overallStreak} size="xl" />
            <span className="text-2xl sm:text-3xl font-bold text-orange-400">
              {reportData.overallStreak}
            </span>
            <span className="text-sm text-slate-400">days</span>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Best Streak
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-400">
              {reportData.maxStreak}
            </span>
            <span className="text-sm text-slate-400">days</span>
          </div>
        </div>
      </div>

      {/* Habit Breakdown */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Habit Performance
        </h3>

        <div className="space-y-3">
          {reportData.habitStats.map((habit) => (
            <div key={habit.habitId} className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${habit.habitColor}20` }}
                  >
                    {habit.habitIcon}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: habit.habitColor }}>
                      {habit.habitName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {habit.completions}/{habit.expected} days completed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${
                    habit.completionRate >= 80 ? 'text-emerald-400' :
                    habit.completionRate >= 60 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {habit.completionRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                    <Flame className="w-3 h-3 text-orange-400" />
                    {habit.currentStreak}d streak
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(habit.completionRate, 100)}%`,
                    backgroundColor: habit.habitColor
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share & Download */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-violet-400" />
          Share Report
        </h3>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Share to WhatsApp
          </button>

          <button
            onClick={() => handleShare('copy')}
            className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy to Clipboard
          </button>

          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

// Reports Date Range Picker Component
function ReportsDateRangePicker({ 
  value, 
  onChange, 
  onClose 
}: { 
  value: DateRange; 
  onChange: (range: DateRange) => void; 
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(value.from);
  const [selecting, setSelecting] = useState<'from' | 'to' | null>(null);
  const [tempRange, setTempRange] = useState<DateRange>(value);

  const getDaysInMonth = (date: Date) => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleDayClick = (day: Date) => {
    if (selecting === 'from' || !selecting) {
      setTempRange({ from: day, to: day });
      setSelecting('to');
    } else {
      if (isBefore(day, tempRange.from)) {
        setTempRange({ from: day, to: tempRange.from });
      } else {
        setTempRange({ ...tempRange, to: day });
      }
      setSelecting(null);
    }
  };

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue();
    setTempRange(range);
    setCurrentMonth(range.from);
    onChange(range);
    onClose();
  };

  const handleApply = () => {
    onChange(tempRange);
    onClose();
  };

  const isInRange = (day: Date) => {
    return (
      (isAfter(day, tempRange.from) || isSameDay(day, tempRange.from)) &&
      (isBefore(day, tempRange.to) || isSameDay(day, tempRange.to))
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-full max-w-[95vw] sm:max-w-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700">
          <h3 className="font-semibold text-base sm:text-lg">Select Report Period</h3>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Preset Ranges */}
          <div className="flex sm:flex-col sm:w-40 bg-slate-900/50 border-b sm:border-b-0 sm:border-r border-slate-700 p-2 overflow-x-auto sm:overflow-x-visible">
            <div className="hidden sm:block text-xs text-slate-500 uppercase font-medium px-3 py-2">
              Quick Select
            </div>
            <div className="flex sm:flex-col gap-1 sm:gap-0">
              {PRESET_RANGES.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="whitespace-nowrap sm:whitespace-normal text-left px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-violet-600/20 hover:text-violet-400 transition-colors flex-shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 p-3 sm:p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const prevMonth = subMonths(currentMonth, 1);
                  if (!isBefore(endOfMonth(prevMonth), MIN_DATE)) {
                    setCurrentMonth(prevMonth);
                  }
                }}
                disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), MIN_DATE)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs text-slate-500 font-medium py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {days.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, tempRange.from) || isSameDay(day, tempRange.to);
                const inRange = isInRange(day);
                const isToday = isSameDay(day, new Date());
                const isStart = isSameDay(day, tempRange.from);
                const isEnd = isSameDay(day, tempRange.to);
                const isBeforeMin = isBefore(day, MIN_DATE);

                return (
                  <button
                    key={idx}
                    onClick={() => !isBeforeMin && handleDayClick(day)}
                    disabled={isBeforeMin}
                    className={`
                      relative h-8 sm:h-9 text-xs sm:text-sm rounded-md sm:rounded-lg transition-all
                      ${isBeforeMin ? 'text-slate-700 cursor-not-allowed' : !isCurrentMonth ? 'text-slate-600' : 'text-slate-300'}
                      ${isToday && !isSelected ? 'ring-1 ring-violet-500' : ''}
                      ${inRange && !isSelected && !isBeforeMin ? 'bg-violet-600/20' : ''}
                      ${isSelected && !isBeforeMin ? 'bg-violet-600 text-white font-medium' : !isBeforeMin ? 'hover:bg-slate-700' : ''}
                      ${isStart && !isSameDay(tempRange.from, tempRange.to) ? 'rounded-r-none' : ''}
                      ${isEnd && !isSameDay(tempRange.from, tempRange.to) ? 'rounded-l-none' : ''}
                      ${inRange && !isStart && !isEnd ? 'rounded-none' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Selected Range Display */}
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-slate-900/50 rounded-lg sm:rounded-xl">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500">From:</span>{' '}
                  <span className="font-medium text-violet-400">
                    {format(tempRange.from, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="text-slate-600 px-1">→</div>
                <div>
                  <span className="text-slate-500">To:</span>{' '}
                  <span className="font-medium text-cyan-400">
                    {format(tempRange.to, 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 sm:mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-3 sm:px-4 bg-slate-700 hover:bg-slate-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2 px-3 sm:px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
