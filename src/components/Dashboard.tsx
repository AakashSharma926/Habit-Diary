import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Flame,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import {
  calculateWeeklyStats,
  calculateOverallStats,
  calculateStreakData,
  getWeekDates,
  formatDate,
  formatDisplayDate,
  getStatusColor,
  getRemainingDaysInWeek,
  getWeekStart,
} from '../lib/utils';
import { subWeeks } from 'date-fns';
import type { Habit } from '../types';

interface DashboardProps {
  selectedHabit?: Habit | null;
  onSelectHabit: (habit: Habit | null) => void;
}

export function Dashboard({ onSelectHabit }: DashboardProps) {
  const { habits, entries, allEntries, weekStart } = useHabits();

  if (habits.length === 0) {
    return null;
  }

  // Calculate stats for all habits
  const habitStats = habits.map((habit) => ({
    habit,
    stats: calculateWeeklyStats(habit, entries, weekStart),
    streak: calculateStreakData(habit.id, allEntries, habit.weeklyGoal),
  }));

  const overallStats = calculateOverallStats(habits, entries, weekStart);
  const remainingDays = getRemainingDaysInWeek(weekStart);

  // Prepare chart data
  const donutData = habitStats.map(({ habit, stats }) => ({
    name: habit.name,
    value: stats.completionPercentage,
    fill: habit.color,
  }));

  // Historical data for trend chart (last 8 weeks)
  const trendData = [];
  for (let i = 7; i >= 0; i--) {
    const weekDate = subWeeks(weekStart, i);
    const weekStartStr = formatDate(getWeekStart(weekDate));
    const weekEntries = allEntries.filter((e) => {
      const entryWeekStart = formatDate(getWeekStart(new Date(e.date)));
      return entryWeekStart === weekStartStr;
    });

    const weekStats = habits.map((habit) => 
      calculateWeeklyStats(habit, weekEntries, weekDate)
    );
    const avgCompletion = weekStats.length > 0
      ? Math.round(weekStats.reduce((sum, s) => sum + s.completionPercentage, 0) / weekStats.length)
      : 0;

    trendData.push({
      week: formatDisplayDate(weekDate),
      completion: avgCompletion,
    });
  }

  // Daily progress for bar chart
  const weekDates = getWeekDates(weekStart);
  const dailyData = weekDates.map((date) => {
    const dateStr = formatDate(date);
    const dayData: Record<string, unknown> = { day: formatDisplayDate(date) };
    
    habits.forEach((habit) => {
      const entry = entries.find((e) => e.habitId === habit.id && e.date === dateStr);
      dayData[habit.name] = entry?.value || 0;
    });

    return dayData;
  });

  // Leaderboard - sorted by streak
  const leaderboard = [...habitStats]
    .sort((a, b) => b.streak.currentWeeklyStreak - a.streak.currentWeeklyStreak)
    .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Overall Progress"
          value={`${overallStats.overallCompletionPercentage}%`}
          sublabel={`${overallStats.habitsOnTrack}/${overallStats.totalHabits} on track`}
          color={overallStats.overallCompletionPercentage >= 70 ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Days Remaining"
          value={remainingDays.toString()}
          sublabel="in this week"
          color="#8b5cf6"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Perfect Days"
          value={overallStats.weeklyPerfectDays.toString()}
          sublabel="all habits hit"
          color="#ef4444"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Best Habit"
          value={
            habits.find((h) => h.id === overallStats.bestPerformingHabit)?.icon || '-'
          }
          sublabel={
            habits.find((h) => h.id === overallStats.bestPerformingHabit)?.name || 'None'
          }
          color="#06b6d4"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Completion Donut */}
        <div className="glass rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Weekly Completion
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e3f',
                    border: '1px solid #4a4a6a',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Progress']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80"
                onClick={() => onSelectHabit(habit)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
                <span className="text-slate-400">{habit.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Trend */}
        <div className="glass rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            8-Week Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e3f',
                    border: '1px solid #4a4a6a',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Completion']}
                />
                <Area
                  type="monotone"
                  dataKey="completion"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompletion)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Streak Leaders
          </h3>
          <div className="space-y-3">
            {leaderboard.map(({ habit, stats, streak }, index) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => onSelectHabit(habit)}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : index === 1
                      ? 'bg-slate-400/20 text-slate-300'
                      : index === 2
                      ? 'bg-orange-600/20 text-orange-400'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  {habit.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{habit.name}</div>
                  <div className="text-xs text-slate-400">
                    {streak.currentWeeklyStreak} week streak
                  </div>
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: getStatusColor(stats.isOnTrack, stats.completionPercentage) }}
                >
                  {stats.completionPercentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Breakdown Chart */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Daily Progress
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e3f',
                  border: '1px solid #4a4a6a',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {habits.map((habit) => (
                <Bar
                  key={habit.id}
                  dataKey={habit.name}
                  fill={habit.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Habits Needing Attention */}
      {habitStats.filter(({ stats }) => !stats.isOnTrack).length > 0 && (
        <div className="glass rounded-2xl p-4 md:p-6 border border-amber-500/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Needs Attention
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {habitStats
              .filter(({ stats }) => !stats.isOnTrack)
              .map(({ habit, stats }) => (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
                  onClick={() => onSelectHabit(habit)}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${habit.color}20` }}
                  >
                    {habit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{habit.name}</div>
                    <div className="text-xs text-amber-400">
                      {stats.remaining} {habit.unit} left • ~{stats.avgNeededPerDay}/day
                    </div>
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    {stats.completionPercentage}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl md:text-3xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{sublabel}</div>
    </div>
  );
}


