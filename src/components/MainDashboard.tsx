import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Flame,
  CheckCircle2,
  ChevronDown,
  Calendar,
  Trophy,
  Zap,
} from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import {
  formatDate,
  calculateHabitStreak,
  calculateOverallStreak,
  getStreakLevel,
  getStreakEmoji,
} from '../lib/utils';
import { 
  format, 
  eachDayOfInterval,
  differenceInDays,
  isWithinInterval,
  parseISO,
  subDays,
  subWeeks,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
  isAfter,
} from 'date-fns';
import { DateRangePicker } from './DateRangePicker';

interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const PRESET_RANGES: { label: string; getValue: () => { from: Date; to: Date } }[] = [
  { label: 'Last 7 Days', getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'This Week', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Last Week', getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) },
  { label: 'Last 14 Days', getValue: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: 'Last 6 Months', getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: 'Last Year', getValue: () => ({ from: subYears(new Date(), 1), to: new Date() }) },
];

export function MainDashboard() {
  const { habits, allEntries } = useHabits();
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const thisWeek = PRESET_RANGES[1].getValue(); // This Week is now at index 1
    return { ...thisWeek, label: 'This Week' };
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [showHabitDropdown, setShowHabitDropdown] = useState(false);

  // Filter habits based on selection
  const filteredHabits = selectedHabitId === 'all' 
    ? habits 
    : habits.filter(h => h.id === selectedHabitId);

  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  // Calculate stats for the selected date range
  const rangeStats = useMemo(() => {
    const daysInRange = differenceInDays(dateRange.to, dateRange.from) + 1;
    const weeksInRange = Math.ceil(daysInRange / 7);
    
    // Get entries within the date range
    const rangeEntries = allEntries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
    });

    // Calculate per-habit stats
    const habitStats = filteredHabits.map(habit => {
      const habitEntries = rangeEntries.filter(e => e.habitId === habit.id);
      const totalValue = habitEntries.reduce((sum, e) => sum + e.value, 0);
      
      // Expected value based on range
      const dailyGoal = habit.weeklyGoal / 7;
      const expectedTotal = dailyGoal * daysInRange;
      const completionPercentage = expectedTotal > 0 ? Math.min(100, Math.round((totalValue / expectedTotal) * 100)) : 0;
      
      // Is on track?
      const isOnTrack = totalValue >= expectedTotal * 0.8; // 80% threshold
      
      return {
        habit,
        totalValue,
        expectedTotal,
        completionPercentage,
        isOnTrack,
        dailyAverage: daysInRange > 0 ? Math.round((totalValue / daysInRange) * 10) / 10 : 0,
      };
    });

    // Overall completion
    const overallCompletion = habitStats.length > 0
      ? Math.round(habitStats.reduce((sum, h) => sum + h.completionPercentage, 0) / habitStats.length)
      : 0;

    // Habits on track
    const habitsOnTrack = habitStats.filter(h => h.isOnTrack).length;

    // Days with all habits completed (perfect days)
    const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    let perfectDays = 0;
    
    daysInInterval.forEach(day => {
      const dayStr = formatDate(day);
      let allHabitsHit = true;
      
      filteredHabits.forEach(habit => {
        const dailyGoal = habit.weeklyGoal / 7;
        const entry = rangeEntries.find(e => e.habitId === habit.id && e.date === dayStr);
        const value = entry?.value || 0;
        
        if (habit.type === 'binary') {
          if (value < 1) allHabitsHit = false;
        } else {
          if (value < dailyGoal * 0.8) allHabitsHit = false; // 80% of daily goal
        }
      });
      
      if (allHabitsHit && filteredHabits.length > 0) perfectDays++;
    });

    return {
      daysInRange,
      weeksInRange,
      habitStats,
      overallCompletion,
      habitsOnTrack,
      perfectDays,
      totalDays: daysInInterval.length,
    };
  }, [dateRange, allEntries, filteredHabits]);

  // Trend data - daily breakdown within the range
  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map(day => {
      const dayStr = formatDate(day);
      
      // Calculate completion for this day
      const dayStats = filteredHabits.map(habit => {
        const entry = allEntries.find(e => e.habitId === habit.id && e.date === dayStr);
        const value = entry?.value || 0;
        const dailyGoal = habit.weeklyGoal / 7;
        
        // For binary habits, 1 = 100%, 0 = 0%
        // For numeric habits, calculate percentage based on daily goal
        const completionPercentage = habit.type === 'binary'
          ? (value >= 1 ? 100 : 0)
          : (dailyGoal > 0 ? Math.min(100, Math.round((value / dailyGoal) * 100)) : 0);
        
        return completionPercentage;
      });

      const avgCompletion = dayStats.length > 0
        ? Math.round(dayStats.reduce((sum, c) => sum + c, 0) / dayStats.length)
        : 0;

      return {
        date: format(day, 'MMM d'),
        completion: avgCompletion,
      };
    });
  }, [dateRange, allEntries, filteredHabits]);

  // Per-habit breakdown data
  const habitBreakdownData = useMemo(() => {
    return rangeStats.habitStats.map(stat => ({
      name: stat.habit.name,
      icon: stat.habit.icon,
      completion: stat.completionPercentage,
      total: stat.totalValue,
      expected: Math.round(stat.expectedTotal),
      color: stat.habit.color,
    }));
  }, [rangeStats]);

  // Donut chart data
  const donutData = [
    { name: 'Completed', value: rangeStats.overallCompletion, fill: '#8b5cf6' },
    { name: 'Remaining', value: 100 - rangeStats.overallCompletion, fill: '#1e293b' },
  ];

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    // Find matching preset label or create custom label
    const matchingPreset = PRESET_RANGES.find(preset => {
      const presetRange = preset.getValue();
      return formatDate(presetRange.from) === formatDate(range.from) && 
             formatDate(presetRange.to) === formatDate(range.to);
    });
    
    const label = matchingPreset?.label || `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`;
    setDateRange({ ...range, label });
  };

  // Get habit label
  const getHabitLabel = () => {
    if (selectedHabitId === 'all') return 'All Habits';
    return selectedHabit ? `${selectedHabit.icon} ${selectedHabit.name}` : 'All Habits';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-300">Dashboard</h2>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Date Range Picker */}
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => {
                setShowDatePicker(!showDatePicker);
                setShowHabitDropdown(false);
              }}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <span className="truncate">{dateRange.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>
            
            {showDatePicker && (
              <DateRangePicker
                value={{ from: dateRange.from, to: dateRange.to }}
                onChange={handleDateRangeChange}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </div>

          {/* Habit Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => {
                setShowHabitDropdown(!showHabitDropdown);
                setShowDatePicker(false);
              }}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors"
            >
              <span className="truncate">{getHabitLabel()}</span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${showHabitDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showHabitDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px] sm:min-w-[200px] max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedHabitId('all');
                    setShowHabitDropdown(false);
                  }}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm hover:bg-slate-700 transition-colors ${
                    selectedHabitId === 'all' ? 'bg-violet-600/20 text-violet-400' : ''
                  }`}
                >
                  📊 All Habits
                </button>
                <div className="border-t border-slate-700" />
                {habits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => {
                      setSelectedHabitId(habit.id);
                      setShowHabitDropdown(false);
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                      selectedHabitId === habit.id ? 'bg-violet-600/20 text-violet-400' : ''
                    }`}
                  >
                    <span>{habit.icon}</span>
                    <span className="truncate">{habit.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Range Info */}
      <div className="text-xs sm:text-sm text-slate-400">
        Showing data for <span className="text-white font-medium">{rangeStats.daysInRange} days</span> ({rangeStats.weeksInRange} week{rangeStats.weeksInRange !== 1 ? 's' : ''})
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Overall Progress Donut */}
        <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
            <span className="text-xs sm:text-sm text-slate-400">Overall Progress</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={30}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-violet-400">{rangeStats.overallCompletion}%</div>
              <div className="text-[10px] sm:text-xs text-slate-500">avg completion</div>
            </div>
          </div>
        </div>

        {/* Days in Range */}
        <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
            <span className="text-xs sm:text-sm text-slate-400">Period</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-400">{rangeStats.daysInRange}</div>
          <div className="text-[10px] sm:text-xs text-slate-500">days tracked</div>
        </div>

        {/* Habits On Track */}
        <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm text-slate-400">On Track</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{rangeStats.habitsOnTrack}</div>
          <div className="text-[10px] sm:text-xs text-slate-500">of {filteredHabits.length} habits</div>
        </div>

        {/* Perfect Days */}
        <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span className="text-xs sm:text-sm text-slate-400">Perfect Days</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-cyan-400">{rangeStats.perfectDays}</div>
          <div className="text-[10px] sm:text-xs text-slate-500">of {rangeStats.totalDays} days</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Daily Progress Trend Chart */}
        <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3">
            Daily Progress Trend
            {selectedHabitId !== 'all' && selectedHabit && (
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs">• {selectedHabit.icon}</span>
            )}
          </h3>
          <div className="h-36 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#64748b', fontSize: 8 }} 
                  interval={rangeStats.daysInRange > 7 ? Math.floor(rangeStats.daysInRange / 4) : 0}
                  angle={rangeStats.daysInRange > 7 ? -45 : 0}
                  textAnchor={rangeStats.daysInRange > 7 ? "end" : "middle"}
                  height={rangeStats.daysInRange > 7 ? 40 : 25}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 8 }} domain={[0, 100]} width={25} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e3f',
                    border: '1px solid #4a4a6a',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Daily Completion']}
                />
                <Area
                  type="monotone"
                  dataKey="completion"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-Habit Breakdown */}
        <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3">Habit Breakdown</h3>
          <div className="h-36 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitBreakdownData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 8 }} />
                <YAxis 
                  type="category" 
                  dataKey="icon" 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e3f',
                    border: '1px solid #4a4a6a',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props.payload.total}/${props.payload.expected})`,
                    props.payload.name
                  ]}
                />
                <Bar 
                  dataKey="completion" 
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Habit Details - Mobile Cards */}
      {selectedHabitId === 'all' && (
        <>
          {/* Mobile Cards */}
          <div className="block sm:hidden space-y-2">
            <h3 className="text-xs font-medium text-slate-400 mb-2">Habit Details</h3>
            {rangeStats.habitStats.map(stat => (
              <div key={stat.habit.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stat.habit.icon}</span>
                    <span className="font-medium text-sm">{stat.habit.name}</span>
                  </div>
                  <span className={`font-bold text-sm ${stat.isOnTrack ? 'text-emerald-400' : stat.completionPercentage > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {stat.completionPercentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${stat.completionPercentage}%`,
                      backgroundColor: stat.isOnTrack ? '#10b981' : stat.completionPercentage > 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                  <div>
                    <div className="text-white font-medium">{stat.totalValue}</div>
                    <div>Total</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">{Math.round(stat.expectedTotal)}</div>
                    <div>Expected</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">{stat.dailyAverage}/day</div>
                    <div>Average</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block glass rounded-2xl p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Habit Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-3">Habit</th>
                    <th className="text-right py-2 px-3">Total</th>
                    <th className="text-right py-2 px-3">Expected</th>
                    <th className="text-right py-2 px-3">Daily Avg</th>
                    <th className="text-right py-2 px-3">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeStats.habitStats.map(stat => (
                    <tr key={stat.habit.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{stat.habit.icon}</span>
                          <span>{stat.habit.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 font-medium">
                        {stat.totalValue} {stat.habit.unit}
                      </td>
                      <td className="text-right py-3 px-3 text-slate-400">
                        {Math.round(stat.expectedTotal)} {stat.habit.unit}
                      </td>
                      <td className="text-right py-3 px-3 text-slate-400">
                        {stat.dailyAverage} /day
                      </td>
                      <td className="text-right py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${stat.completionPercentage}%`,
                                backgroundColor: stat.isOnTrack ? '#10b981' : stat.completionPercentage > 50 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className={`font-medium ${stat.isOnTrack ? 'text-emerald-400' : stat.completionPercentage > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {stat.completionPercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Yearly Activity Chart */}
      <YearlyActivityChart habits={filteredHabits} allEntries={allEntries} />

      {/* Streaks Section */}
      <StreaksSection habits={habits} allEntries={allEntries} />
    </div>
  );
}

// Yearly Activity Chart Component (GitHub/LeetCode style)
function YearlyActivityChart({ habits, allEntries }: { habits: any[]; allEntries: any[] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Generate years from 2025 to current year
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let year = 2025; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }, [currentYear]);
  
  // Calculate daily completion data for the selected year
  const yearData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    const today = new Date();
    
    // Get all days of the year
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
    
    // Calculate daily goals for each habit
    const dailyGoals = new Map<string, number>();
    for (const habit of habits) {
      if (habit.type === 'binary') {
        dailyGoals.set(habit.id, 1);
      } else {
        dailyGoals.set(habit.id, habit.weeklyGoal / 7);
      }
    }
    
    // Group entries by date
    const entriesByDate = new Map<string, Map<string, number>>();
    for (const entry of allEntries) {
      if (!entriesByDate.has(entry.date)) {
        entriesByDate.set(entry.date, new Map());
      }
      const dayEntries = entriesByDate.get(entry.date)!;
      dayEntries.set(entry.habitId, (dayEntries.get(entry.habitId) || 0) + entry.value);
    }
    
    // Calculate completion for each day
    return allDays.map(day => {
      const dateStr = formatDate(day);
      const dayEntries = entriesByDate.get(dateStr);
      const isFuture = isAfter(day, today);
      
      if (!dayEntries || habits.length === 0 || isFuture) {
        return {
          date: day,
          dateStr,
          completionLevel: isFuture ? -1 : 0, // -1 for future, 0 for no data
          completionPercent: 0,
        };
      }
      
      // Calculate average completion across all habits
      let totalCompletion = 0;
      for (const habit of habits) {
        const value = dayEntries.get(habit.id) || 0;
        const goal = dailyGoals.get(habit.id) || 1;
        const completion = Math.min(value / goal, 1);
        totalCompletion += completion;
      }
      const avgCompletion = totalCompletion / habits.length;
      
      // Convert to level (0-4)
      let level = 0;
      if (avgCompletion >= 1) level = 4;
      else if (avgCompletion >= 0.75) level = 3;
      else if (avgCompletion >= 0.5) level = 2;
      else if (avgCompletion > 0) level = 1;
      
      return {
        date: day,
        dateStr,
        completionLevel: level,
        completionPercent: Math.round(avgCompletion * 100),
      };
    });
  }, [selectedYear, habits, allEntries]);
  
  // Group year data by month, each month has its own week structure
  const monthsData = useMemo(() => {
    const months: { name: string; weeks: typeof yearData[] }[] = [];
    
    // Create 12 months
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthStart = new Date(selectedYear, monthIndex, 1);
      const monthName = format(monthStart, 'MMM');
      
      // Get days for this month from yearData
      const monthDays = yearData.filter(d => getMonth(d.date) === monthIndex);
      
      // Organize into weeks
      const weeks: typeof yearData[] = [];
      let currentWeek: typeof yearData = [];
      
      // Get the day of week for the first day (0=Sun, 1=Mon, etc.)
      // Convert to Monday-start (Mon=0, Sun=6)
      const firstDayOfWeek = getDay(monthStart);
      const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
      
      // Pad the beginning with empty cells
      for (let i = 0; i < adjustedFirstDay; i++) {
        currentWeek.push({
          date: new Date(0),
          dateStr: '',
          completionLevel: -2,
          completionPercent: 0,
        });
      }
      
      // Add all days of the month
      for (const day of monthDays) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      
      // Pad the end with empty cells
      while (currentWeek.length > 0 && currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(0),
          dateStr: '',
          completionLevel: -2,
          completionPercent: 0,
        });
      }
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      
      months.push({ name: monthName, weeks });
    }
    
    return months;
  }, [yearData, selectedYear]);
  
  const getLevelColor = (level: number) => {
    switch (level) {
      case -2: return 'transparent'; // Empty
      case -1: return 'rgba(30, 41, 59, 0.3)'; // Future (faded)
      case 0: return 'rgba(30, 41, 59, 0.8)'; // No activity
      case 1: return 'rgba(34, 197, 94, 0.3)'; // Low
      case 2: return 'rgba(34, 197, 94, 0.5)'; // Medium
      case 3: return 'rgba(34, 197, 94, 0.7)'; // High
      case 4: return 'rgba(34, 197, 94, 1)'; // Full
      default: return 'rgba(30, 41, 59, 0.8)';
    }
  };
  
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  return (
    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          <h3 className="text-sm sm:text-base font-semibold text-slate-300">Activity</h3>
        </div>
        
        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-slate-300 cursor-pointer hover:border-slate-600 transition-colors"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Activity Heatmap - Months Layout */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 sm:gap-4 justify-center">
          {/* Day Labels Column */}
          <div className="flex flex-col flex-shrink-0">
            <div className="h-4 sm:h-5" /> {/* Spacer for month label */}
            <div className="flex flex-col gap-[1px]">
              {dayLabels.map((label, i) => (
                <div 
                  key={i} 
                  className="h-[13px] sm:h-[15px] flex items-center justify-end pr-1"
                >
                  <span className="text-[7px] sm:text-[8px] text-slate-500 font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Months */}
          {monthsData.map((month, monthIndex) => (
            <div key={monthIndex} className="flex flex-col">
              {/* Month Label */}
              <div className="h-4 sm:h-5 flex items-center">
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                  {month.name}
                </span>
              </div>
              
              {/* Weeks Grid for this month */}
              <div className="flex gap-[1px]">
                {month.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[1px]">
                    {week.map((day, dayIndex) => {
                      const isToday = day.dateStr === formatDate(new Date());
                      return (
                        <div
                          key={dayIndex}
                          className={`w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] rounded-[2px] transition-all cursor-default hover:ring-1 hover:ring-white/40 hover:scale-110 ${
                            isToday ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900' : ''
                          }`}
                          style={{ backgroundColor: getLevelColor(day.completionLevel) }}
                          title={day.dateStr ? `${format(day.date, 'EEE, MMM d, yyyy')}: ${day.completionPercent}% complete` : ''}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
        <div className="text-[9px] sm:text-[10px] text-slate-500">
          {selectedYear} Activity
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-slate-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className="w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] rounded-[2px]"
              style={{ backgroundColor: getLevelColor(level) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// Streaks Section Component
function StreaksSection({ habits, allEntries }: { habits: any[]; allEntries: any[] }) {
  // Calculate overall streak (weekly-based)
  const overallStreak = useMemo(() => {
    return calculateOverallStreak(habits, allEntries);
  }, [habits, allEntries]);

  // Calculate per-habit streaks
  const habitStreaks = useMemo(() => {
    return habits.map(habit => ({
      habit,
      ...calculateHabitStreak(habit.id, habit, allEntries)
    })).sort((a, b) => b.currentStreak - a.currentStreak);
  }, [habits, allEntries]);

  const getStreakClass = (streak: number) => {
    const level = getStreakLevel(streak);
    switch (level) {
      case 'immortal': return 'streak-immortal text-white';
      case 'mythic': return 'streak-mythic text-white';
      case 'legendary': return 'streak-legendary text-white';
      case 'fire': return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      case 'gold': return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white';
      case 'silver': return 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white';
      case 'bronze': return 'bg-gradient-to-r from-emerald-400 to-green-500 text-white';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const getIconClass = (streak: number) => {
    const level = getStreakLevel(streak);
    if (level === 'immortal' || level === 'mythic') return 'streak-icon';
    if (level === 'fire') return 'flame-animate';
    return '';
  };

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
        <h3 className="text-sm sm:text-base font-semibold text-slate-300">Streaks</h3>
      </div>

      {/* Overall Streak Card */}
      <div className={`rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border ${
        !overallStreak.isCurrentWeekOnTrack && overallStreak.currentStreak > 0
          ? 'bg-gradient-to-r from-amber-900/30 to-red-900/30 border-amber-500/50'
          : 'bg-slate-800/50 border-slate-700/50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs sm:text-sm text-slate-400 mb-1">Overall Streak</div>
            <div className="text-slate-500 text-[10px] sm:text-xs">Weekly goals completed</div>
            {!overallStreak.isCurrentWeekOnTrack && overallStreak.currentStreak > 0 && (
              <div className="text-amber-400 text-[10px] sm:text-xs mt-1 flex items-center gap-1">
                <span className="animate-pulse">⚠️</span> Behind this week!
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-center">
              <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold ${getStreakClass(overallStreak.currentStreak)}`}>
                <span className={`text-lg sm:text-xl ${getIconClass(overallStreak.currentStreak)}`}>
                  {getStreakEmoji(overallStreak.currentStreak)}
                </span>
                <span className="text-xl sm:text-2xl">{overallStreak.currentStreak}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1">Current</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-700/50 border border-amber-500/30">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <span className="text-lg sm:text-xl font-bold text-amber-400">{overallStreak.maxStreak}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1">Best</div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Habit Streaks */}
      <div className="text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3">Per-Habit Streaks</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {habitStreaks.map(({ habit, currentStreak, maxStreak }) => {
          return (
            <div 
              key={habit.id} 
              className="bg-slate-800/30 rounded-lg p-2.5 sm:p-3 flex items-center justify-between border border-slate-700/30 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-base sm:text-lg flex-shrink-0"
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  {habit.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm truncate" style={{ color: habit.color }}>
                    {habit.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs sm:text-sm font-bold ${getStreakClass(currentStreak)}`}>
                  <span className={getIconClass(currentStreak)}>{getStreakEmoji(currentStreak)}</span>
                  <span>{currentStreak}</span>
                </div>
                {maxStreak > 0 && (
                  <div className="flex items-center gap-0.5 text-amber-400" title={`Best: ${maxStreak} days`}>
                    <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium">{maxStreak}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Streak Legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>🌟</span> <span>365+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>💎</span> <span>100+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>👑</span> <span>60+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>🔥</span> <span>30+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>⭐</span> <span>14+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>💫</span> <span>7+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>✨</span> <span>3+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>🌱</span> <span>1+</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
          <span>💤</span> <span>0</span>
        </div>
      </div>
    </div>
  );
}
