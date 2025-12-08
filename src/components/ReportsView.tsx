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
  Trophy
} from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import { 
  formatDate, 
  getWeekStart, 
  getWeekEnd,
  calculateOverallStreak,
  calculateHabitStreak,
  getStreakLevel,
  getStreakEmoji
} from '../lib/utils';
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
  parseISO,
  differenceInDays
} from 'date-fns';

type ReportPeriod = 'weekly' | 'monthly' | '4months' | '6months' | 'yearly';

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

const PERIOD_OPTIONS: { value: ReportPeriod; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Last 7 days' },
  { value: 'monthly', label: 'Monthly', description: 'Last 30 days' },
  { value: '4months', label: 'Quarterly', description: 'Last 4 months' },
  { value: '6months', label: 'Half Yearly', description: 'Last 6 months' },
  { value: 'yearly', label: 'Yearly', description: 'Last 12 months' },
];

export function ReportsView() {
  const { habits, allEntries } = useHabits();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('weekly');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const reportData = useMemo((): ReportData => {
    const today = new Date();
    let startDate: Date;
    let endDate = today;
    let periodLabel: string;

    switch (selectedPeriod) {
      case 'weekly':
        startDate = subDays(today, 6);
        periodLabel = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
        break;
      case 'monthly':
        startDate = subDays(today, 29);
        periodLabel = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
        break;
      case '4months':
        startDate = subMonths(today, 4);
        periodLabel = `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
        break;
      case '6months':
        startDate = subMonths(today, 6);
        periodLabel = `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
        break;
      case 'yearly':
        startDate = subMonths(today, 12);
        periodLabel = `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
        break;
      default:
        startDate = subDays(today, 6);
        periodLabel = 'Last 7 days';
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = days.length;
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    // Filter entries in period
    const periodEntries = allEntries.filter(e => e.date >= startStr && e.date <= endStr);

    // Calculate per-habit stats
    const habitStats = habits.map(habit => {
      const habitEntries = periodEntries.filter(e => e.habitId === habit.id);
      const dailyGoal = habit.weeklyGoal / 7;
      
      let completions = 0;
      for (const day of days) {
        const dayStr = formatDate(day);
        const entry = habitEntries.find(e => e.date === dayStr);
        const value = entry?.value || 0;
        
        if (habit.type === 'binary') {
          if (value >= 1) completions++;
        } else {
          if (value >= dailyGoal * 0.8) completions++;
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

    // Calculate overall stats
    let perfectDays = 0;
    for (const day of days) {
      const dayStr = formatDate(day);
      let allHabitsComplete = true;
      
      for (const habit of habits) {
        const entry = periodEntries.find(e => e.habitId === habit.id && e.date === dayStr);
        const value = entry?.value || 0;
        const dailyGoal = habit.weeklyGoal / 7;
        
        if (habit.type === 'binary') {
          if (value < 1) allHabitsComplete = false;
        } else {
          if (value < dailyGoal * 0.8) allHabitsComplete = false;
        }
        
        if (!allHabitsComplete) break;
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
  }, [habits, allEntries, selectedPeriod]);

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

  const generateReportText = (data: ReportData): string => {
    const streakEmoji = getStreakEmoji(data.overallStreak);
    
    let text = `🎯 Habit Diary Report\n`;
    text += `📅 ${data.period}\n\n`;
    
    text += `📊 Overview\n`;
    text += `• Completion Rate: ${data.overallCompletionRate.toFixed(1)}%\n`;
    text += `• Perfect Days: ${data.perfectDays}/${data.totalDays}\n`;
    text += `• Current Streak: ${streakEmoji} ${data.overallStreak} days\n`;
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
    a.download = `habit-report-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPeriodOption = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)!;
  const streakLevel = getStreakLevel(reportData.overallStreak);
  const streakEmoji = getStreakEmoji(reportData.overallStreak);

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

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl transition-colors min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>{currentPeriodOption.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPeriodDropdown && (
              <div className="absolute top-full mt-2 right-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedPeriod(option.value);
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors ${
                      selectedPeriod === option.value ? 'bg-violet-500/20 text-violet-300' : ''
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-slate-400">{option.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-slate-400 mt-4">
          {reportData.period}
        </div>
      </div>

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
            <span className="text-xl">{streakEmoji}</span>
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

