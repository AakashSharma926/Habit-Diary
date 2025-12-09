import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { X, Flame, TrendingUp, Target, Calendar, Award } from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import {
  calculateWeeklyStats,
  calculateStreakData,
  getWeekDates,
  formatDate,
  formatDisplayDate,
  getWeekStart,
  getStatusColor,
} from '../lib/utils';
import { subWeeks, subDays, format } from 'date-fns';
import type { Habit } from '../types';

interface HabitDetailModalProps {
  habit: Habit;
  onClose: () => void;
}

export function HabitDetailModal({ habit, onClose }: HabitDetailModalProps) {
  const { entries, allEntries, weekStart } = useHabits();

  const currentStats = calculateWeeklyStats(habit, entries, weekStart);
  const streakData = calculateStreakData(habit.id, allEntries, habit.weeklyGoal);

  // Get daily data for the last 30 days
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = formatDate(date);
    const entry = allEntries.find((e) => e.habitId === habit.id && e.date === dateStr);
    last30Days.push({
      date: format(date, 'MMM d'),
      value: entry?.value || 0,
      goal: habit.weeklyGoal / 7,
    });
  }

  // Get weekly data for the last 12 weeks
  const last12Weeks = [];
  for (let i = 11; i >= 0; i--) {
    const weekDate = subWeeks(new Date(), i);
    const weekStartDate = getWeekStart(weekDate);
    const weekStartStr = formatDate(weekStartDate);
    
    const weekEntries = allEntries.filter((e) => {
      if (e.habitId !== habit.id) return false;
      const entryWeekStart = formatDate(getWeekStart(new Date(e.date)));
      return entryWeekStart === weekStartStr;
    });

    const weekTotal = weekEntries.reduce((sum, e) => sum + e.value, 0);
    const completion = Math.min(100, Math.round((weekTotal / habit.weeklyGoal) * 100));

    last12Weeks.push({
      week: formatDisplayDate(weekStartDate),
      value: weekTotal,
      goal: habit.weeklyGoal,
      completion,
    });
  }

  // Current week daily breakdown
  const weekDates = getWeekDates(weekStart);
  const currentWeekDaily = weekDates.map((date) => {
    const dateStr = formatDate(date);
    const entry = entries.find((e) => e.habitId === habit.id && e.date === dateStr);
    return {
      day: format(date, 'EEE'),
      value: entry?.value || 0,
      goal: habit.weeklyGoal / 7,
    };
  });

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-700/50 sticky top-0 glass z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${habit.color}20` }}
            >
              {habit.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold">{habit.name}</h2>
              <div className="text-sm text-slate-400">
                Goal: {habit.weeklyGoal} {habit.unit}/week • {habit.type}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-slate-400 uppercase">This Week</span>
              </div>
              <div
                className="text-3xl font-bold"
                style={{ color: getStatusColor(currentStats.isOnTrack, currentStats.completionPercentage) }}
              >
                {currentStats.total}
                <span className="text-slate-500 text-lg font-normal">/{currentStats.goal}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {currentStats.completionPercentage}% complete
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-400 uppercase">Daily Streak</span>
              </div>
              <div className="text-3xl font-bold text-orange-400">
                {streakData.currentDailyStreak}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Best: {streakData.longestDailyStreak} days
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400 uppercase">Weekly Streak</span>
              </div>
              <div className="text-3xl font-bold text-cyan-400">
                {streakData.currentWeeklyStreak}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Best: {streakData.longestWeeklyStreak} weeks
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400 uppercase">Remaining</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">
                {currentStats.remaining}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ~{currentStats.avgNeededPerDay}/day needed
              </div>
            </div>
          </div>

          {/* Current Week Breakdown */}
          <div className="glass rounded-xl p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              This Week
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {currentWeekDaily.map((day, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl text-center ${
                    day.value >= day.goal
                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                      : day.value > 0
                      ? 'bg-amber-500/20 border border-amber-500/50'
                      : 'bg-slate-800/50 border border-slate-700/50'
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">{day.day}</div>
                  <div className="text-lg font-bold">{day.value}</div>
                  <div className="text-xs text-slate-500">/{Math.round(day.goal * 10) / 10}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Last 30 Days */}
            <div className="glass rounded-xl p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">Last 30 Days</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last30Days}>
                    <defs>
                      <linearGradient id={`color-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={habit.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={habit.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      interval={6}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1e3f',
                        border: '1px solid #4a4a6a',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={habit.color}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#color-${habit.id})`}
                    />
                    <Line
                      type="monotone"
                      dataKey="goal"
                      stroke="#6b7280"
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Progress */}
            <div className="glass rounded-xl p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">12-Week History</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last12Weeks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1e3f',
                        border: '1px solid #4a4a6a',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'value' ? `${value} ${habit.unit}` : value,
                        name === 'value' ? 'Total' : 'Goal',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={habit.color}
                      strokeWidth={2}
                      dot={{ fill: habit.color, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="goal"
                      stroke="#6b7280"
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="glass rounded-xl p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Achievements
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Achievement
                icon="🎯"
                title="First Entry"
                unlocked={allEntries.some((e) => e.habitId === habit.id)}
                description="Made your first entry"
              />
              <Achievement
                icon="🔥"
                title="7-Day Streak"
                unlocked={streakData.longestDailyStreak >= 7}
                description="Complete 7 days in a row"
              />
              <Achievement
                icon="🌱"
                title="4-Week Streak"
                unlocked={streakData.longestWeeklyStreak >= 4}
                description="Hit goal 4 weeks straight"
              />
              <Achievement
                icon="💯"
                title="Perfectionist"
                unlocked={currentStats.completionPercentage >= 100}
                description="100% this week"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Achievement({
  icon,
  title,
  unlocked,
  description,
}: {
  icon: string;
  title: string;
  unlocked: boolean;
  description: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl text-center transition-all ${
        unlocked
          ? 'bg-amber-500/20 border border-amber-500/50'
          : 'bg-slate-800/50 border border-slate-700/50 opacity-50 grayscale'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-slate-400">{description}</div>
    </div>
  );
}


