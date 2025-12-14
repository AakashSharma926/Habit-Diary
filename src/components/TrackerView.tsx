import React, { useState, useMemo } from 'react';
import { useHabits } from '../context/HabitContext';
import { formatDate, getDaysOfWeek, getWeekStart, formatWeekRange, isCurrentWeek, calculateHabitStreak, getStreakLevel, isDateEditable } from '../lib/utils';
import { Check, Minus, ChevronLeft, ChevronRight, Calendar, Lock, Flame } from 'lucide-react';
import { SimpleCalendarPicker } from './SimpleCalendarPicker';
import { StreakIcon } from './StreakIcon';
import type { Habit } from '../types';

interface TrackerViewProps {
  onEditHabit?: (habit: Habit) => void;
}

export function TrackerView({ onEditHabit }: TrackerViewProps) {
  const { habits, weekStart, updateEntry, getEntryValue, goToPreviousWeek, goToNextWeek, goToCurrentWeek, goToWeek, allEntries } = useHabits();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calculate streaks for all habits
  const habitStreaks = useMemo(() => {
    const streaks: Record<string, { currentStreak: number; maxStreak: number }> = {};
    habits.forEach(habit => {
      streaks[habit.id] = calculateHabitStreak(habit.id, habit, allEntries);
    });
    return streaks;
  }, [habits, allEntries]);
  
  const daysOfWeek = getDaysOfWeek(weekStart);
  const today = formatDate(new Date());
  const currentWeekStart = formatDate(getWeekStart(new Date()));
  const isCurrentWeekView = formatDate(weekStart) === currentWeekStart;

  // Calculate which day of the week today is (1-7, Monday=1)
  const todayIndex = isCurrentWeekView
    ? daysOfWeek.findIndex((d) => d.date === today) + 1
    : 7; // If viewing past week, consider all 7 days

  // Track pending values for numeric inputs (allows empty field during editing)
  const [pendingValues, setPendingValues] = useState<Record<string, string>>({});
  
  // Handle numeric input change - allows empty field during editing
  const handleNumericInputChange = (habitId: string, date: string, inputValue: string) => {
    const key = `${habitId}_${date}`;
    setPendingValues(prev => ({ ...prev, [key]: inputValue }));
  };
  
  // Handle blur - commit the value
  const handleNumericInputBlur = async (habitId: string, date: string) => {
    const key = `${habitId}_${date}`;
    const pendingValue = pendingValues[key];
    
    if (pendingValue !== undefined) {
      const numValue = parseFloat(pendingValue) || 0;
      await updateEntry(habitId, date, numValue);
      // Clear pending value
      setPendingValues(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };
  
  // Get display value for numeric input
  const getNumericDisplayValue = (habitId: string, date: string): string => {
    const key = `${habitId}_${date}`;
    if (pendingValues[key] !== undefined) {
      return pendingValues[key];
    }
    const value = getEntryValue(habitId, date);
    return value ? String(value) : '';
  };

  const toggleBinary = async (habitId: string, date: string) => {
    const currentValue = getEntryValue(habitId, date);
    await updateEntry(habitId, date, currentValue === 1 ? 0 : 1);
  };

  const getWeeklyTotal = (habitId: string): number => {
    return daysOfWeek.reduce((total, day) => {
      return total + getEntryValue(habitId, day.date);
    }, 0);
  };

  // Get display text for habit goal
  const getGoalDisplay = (habit: Habit): string => {
    if (habit.type === 'binary') {
      return `${habit.weeklyGoal} ${habit.unit}/week`;
    } else {
      const dailyGoal = Math.round((habit.weeklyGoal / 7) * 10) / 10;
      return `${dailyGoal} ${habit.unit}/day`;
    }
  };

  // Get status color based on weekly pacing
  const getPacingStatus = (habit: Habit): { color: string; status: string } => {
    const current = getWeeklyTotal(habit.id);
    const weeklyGoal = habit.weeklyGoal;
    
    if (current >= weeklyGoal) {
      return { color: '#10b981', status: 'complete' };
    }

    if (habit.type === 'binary') {
      const expectedByToday = (weeklyGoal / 7) * todayIndex;
      const difference = current - expectedByToday;
      
      if (difference >= 0) {
        return { color: '#10b981', status: 'on-track' };
      } else if (difference >= -1) {
        return { color: '#f59e0b', status: 'warning' };
      } else {
        return { color: '#ef4444', status: 'behind' };
      }
    } else {
      const dailyGoal = weeklyGoal / 7;
      const expectedByToday = dailyGoal * todayIndex;
      const difference = current - expectedByToday;
      
      if (difference >= 0) {
        return { color: '#10b981', status: 'on-track' };
      } else if (difference >= -dailyGoal) {
        return { color: '#f59e0b', status: 'warning' };
      } else {
        return { color: '#ef4444', status: 'behind' };
      }
    }
  };

  const handleDateSelect = (date: Date) => {
    goToWeek(getWeekStart(date));
  };

  // Get input field styling based on value and daily completion percentage
  // Green: 100%+ of daily goal (completed)
  // Amber: 80-99% of daily goal (warning)
  // Red: <80% of daily goal OR missed day (past day with 0)
  // Gray: no value entered (only for today/future)
  const getInputStyle = (habit: Habit, value: number, dayDate: string, _weeklyStatus: string) => {
    const dailyGoal = habit.weeklyGoal / 7;
    const isPast = dayDate < today;
    
    // No value entered
    if (value === 0) {
      // Past day with no entry = missed = red
      if (isPast) {
        return {
          bg: 'bg-red-900/30',
          border: 'border-red-500/50',
          text: 'text-red-400/60'
        };
      }
      // Today/future with no entry = gray/neutral
      return {
        bg: 'bg-slate-700',
        border: 'border-slate-600',
        text: 'text-slate-500'
      };
    }
    
    // Calculate completion percentage
    const completionPercent = habit.type === 'binary' 
      ? (value >= 1 ? 100 : 0)
      : dailyGoal > 0 ? (value / dailyGoal) * 100 : 0;
    
    // 100%+ - Green (completed)
    if (completionPercent >= 100) {
      return {
        bg: 'bg-emerald-900/30',
        border: 'border-emerald-500/50',
        text: 'text-emerald-400 font-medium'
      };
    }
    
    // 80-99% - Amber (warning)
    if (completionPercent >= 80) {
      return {
        bg: 'bg-amber-900/30',
        border: 'border-amber-500/50',
        text: 'text-amber-400'
      };
    }
    
    // <80% - Red (below target)
    return {
      bg: 'bg-red-900/30',
      border: 'border-red-500/50',
      text: 'text-red-400'
    };
  };

  // Get button styling for binary habits
  // Green if done, red if missed (past), gray if not done yet (today/future)
  const getBinaryButtonStyle = (_habit: Habit, value: number, dayDate: string, _weeklyStatus: string) => {
    const isCompleted = value >= 1;
    const isPast = dayDate < today;
    
    // Completed - green
    if (isCompleted) {
      return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30';
    }
    
    // Past day not completed = missed = red
    if (isPast) {
      return 'bg-red-900/50 text-red-400 border border-red-500/50';
    }
    
    // Today/future not completed - grey
    return 'bg-slate-700 text-slate-500';
  };

  if (habits.length === 0) {
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
        <div className="text-5xl sm:text-6xl mb-4">📝</div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-2">No habits to track</h3>
        <p className="text-slate-400 text-sm sm:text-base">Add some habits first to start tracking</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Week Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold text-slate-300">Weekly Tracker</h2>
        <div className="relative flex items-center gap-1 sm:gap-2 bg-slate-800/50 rounded-lg sm:rounded-xl p-1 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 flex-1 sm:flex-none sm:min-w-[200px] justify-center hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
            title="Click to open date picker"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
            <span className="font-medium text-xs sm:text-sm">{formatWeekRange(weekStart)}</span>
          </button>
          
          <button
            onClick={goToNextWeek}
            className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {!isCurrentWeek(weekStart) && (
            <button
              onClick={goToCurrentWeek}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
            >
              Today
            </button>
          )}

          {/* Simple Calendar Picker */}
          {showDatePicker && (
            <SimpleCalendarPicker
              selectedDate={weekStart}
              onSelectDate={handleDateSelect}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {habits.map((habit) => {
          const weeklyTotal = getWeeklyTotal(habit.id);
          const { color: statusColor, status } = getPacingStatus(habit);
          const streak = habitStreaks[habit.id];
          const streakLevel = getStreakLevel(streak?.currentStreak || 0);
          const currentStreak = streak?.currentStreak || 0;

          return (
            <div key={habit.id} className="glass rounded-xl overflow-hidden">
              {/* Habit Header */}
              <div
                className="p-3 flex items-center justify-between cursor-pointer active:bg-slate-700/50"
                onClick={() => onEditHabit?.(habit)}
              >
                <div className="flex items-center gap-2.5">
                  {/* Streak Badge */}
                  <div 
                    className={`flex flex-col items-center justify-center min-w-[36px] px-1.5 py-1 rounded-lg text-[10px] font-bold ${
                      streak?.currentStreak > 0 
                        ? streakLevel === 'immortal'
                          ? 'streak-immortal text-white'
                          : streakLevel === 'mythic'
                            ? 'streak-mythic text-white'
                            : streakLevel === 'legendary'
                              ? 'streak-legendary text-white'
                              : streakLevel === 'fire'
                                ? 'bg-gradient-to-b from-violet-500/30 to-purple-500/30 text-violet-400'
                                : streakLevel === 'gold'
                                  ? 'bg-gradient-to-b from-amber-500/30 to-yellow-500/30 text-amber-400'
                                  : streakLevel === 'silver'
                                    ? 'bg-gradient-to-b from-cyan-500/30 to-blue-500/30 text-cyan-400'
                                    : 'bg-gradient-to-b from-emerald-500/30 to-green-500/30 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-500'
                    }`}
                    title={`Streak: ${currentStreak} days | Best: ${streak?.maxStreak || 0}`}
                  >
                    <span className={`${streakLevel === 'fire' || streakLevel === 'mythic' || streakLevel === 'immortal' ? 'flame-animate' : ''} ${streakLevel === 'immortal' || streakLevel === 'mythic' ? 'streak-icon' : ''}`}>
                      <StreakIcon streak={currentStreak} size="sm" />
                    </span>
                    <span>{currentStreak}</span>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${habit.color}20` }}
                  >
                    {habit.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: habit.color }}>
                      {habit.name}
                    </div>
                    <div className="text-xs text-slate-400">{getGoalDisplay(habit)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg" style={{ color: statusColor }}>
                    {weeklyTotal}/{habit.weeklyGoal}
                  </div>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                  >
                    {status === 'complete' && '✓ Done'}
                    {status === 'on-track' && 'On Track'}
                    {status === 'warning' && 'Catch Up'}
                    {status === 'behind' && 'Behind'}
                  </span>
                </div>
              </div>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-px bg-slate-700/30">
                {daysOfWeek.map((day) => {
                  const value = getEntryValue(habit.id, day.date);
                  const isToday = day.date === today;
                  const isFuture = day.date > today;
                  const isEditable = isDateEditable(day.date);
                  const inputStyle = getInputStyle(habit, value, day.date, status);
                  const buttonStyle = getBinaryButtonStyle(habit, value, day.date, status);

                  return (
                    <div
                      key={day.date}
                      className={`bg-slate-800/60 p-2 flex flex-col items-center ${
                        isToday ? 'bg-violet-900/30' : ''
                      } ${isFuture || !isEditable ? 'opacity-40' : ''}`}
                    >
                      <div className={`text-[10px] font-medium mb-1 ${isToday ? 'text-violet-400' : 'text-slate-500'}`}>
                        {day.dayName.slice(0, 1)}
                      </div>
                      {habit.type === 'binary' ? (
                        <button
                          onClick={() => toggleBinary(habit.id, day.date)}
                          disabled={!isEditable}
                          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${buttonStyle} ${!isEditable && !isFuture ? 'cursor-not-allowed' : ''}`}
                          title={!isEditable && !isFuture ? 'Locked (6hr grace period expired)' : ''}
                        >
                          {!isEditable && !isFuture ? (
                            <Lock className="w-3 h-3 text-slate-500" />
                          ) : value === 1 ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                        </button>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={getNumericDisplayValue(habit.id, day.date)}
                          onChange={(e) => handleNumericInputChange(habit.id, day.date, e.target.value)}
                          onBlur={() => handleNumericInputBlur(habit.id, day.date)}
                          disabled={!isEditable}
                          placeholder="0"
                          title={!isEditable && !isFuture ? 'Locked (6hr grace period expired)' : ''}
                          className={`w-9 h-7 ${inputStyle.bg} border ${inputStyle.border} rounded-md text-center text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ${inputStyle.text} ${!isEditable ? 'cursor-not-allowed' : ''}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden sm:block glass rounded-xl overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[50px_180px_repeat(7,1fr)_90px] lg:grid-cols-[60px_200px_repeat(7,1fr)_100px] gap-px bg-slate-700/50 min-w-[750px]">
          {/* Header Row */}
          <div className="bg-slate-800/80 p-2 lg:p-3 text-center font-semibold text-xs lg:text-sm text-slate-300 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-400" />
          </div>
          <div className="bg-slate-800/80 p-2 lg:p-3 font-semibold text-xs lg:text-sm text-slate-300">
            Habit
          </div>
          {daysOfWeek.map((day) => (
            <div
              key={day.date}
              className={`bg-slate-800/80 p-2 lg:p-3 text-center ${
                day.date === today ? 'bg-violet-900/30' : ''
              }`}
            >
              <div className="text-[10px] lg:text-xs text-slate-400 uppercase">{day.dayName}</div>
              <div className={`text-xs lg:text-sm font-medium ${day.date === today ? 'text-violet-400' : ''}`}>
                {day.dayNum}
              </div>
            </div>
          ))}
          <div className="bg-slate-800/80 p-2 lg:p-3 text-center font-semibold text-xs lg:text-sm text-slate-300">
            Progress
          </div>

          {/* Habit Rows */}
          {habits.map((habit) => {
            const weeklyTotal = getWeeklyTotal(habit.id);
            const { color: statusColor, status } = getPacingStatus(habit);
            const streak = habitStreaks[habit.id];
            const streakLevel = getStreakLevel(streak?.currentStreak || 0);
            const currentStreak = streak?.currentStreak || 0;

            return (
              <React.Fragment key={habit.id}>
                {/* Streak Column */}
                <div 
                  className={`bg-slate-800/50 p-1.5 lg:p-2 flex flex-col items-center justify-center ${
                    streakLevel === 'immortal' ? 'streak-immortal' :
                    streakLevel === 'mythic' ? 'streak-mythic' :
                    streakLevel === 'legendary' ? 'streak-legendary' :
                    streakLevel === 'fire' ? 'bg-gradient-to-b from-violet-500/20 to-purple-500/20' :
                    streakLevel === 'gold' ? 'bg-gradient-to-b from-amber-500/20 to-yellow-500/20' :
                    streakLevel === 'silver' ? 'bg-gradient-to-b from-cyan-500/20 to-blue-500/20' :
                    streakLevel === 'bronze' ? 'bg-gradient-to-b from-emerald-500/20 to-green-500/20' :
                    ''
                  }`}
                  title={`Streak: ${streak?.currentStreak || 0} days | Best: ${streak?.maxStreak || 0}`}
                >
                  <span className={`text-sm lg:text-base ${
                    streakLevel === 'fire' || streakLevel === 'mythic' || streakLevel === 'immortal' 
                      ? 'flame-animate streak-icon' 
                      : ''
                  }`}>
                    <StreakIcon streak={currentStreak} size="md" />
                  </span>
                  <span className={`text-xs lg:text-sm font-bold ${
                    streakLevel === 'fire' || streakLevel === 'legendary' || streakLevel === 'mythic' || streakLevel === 'immortal'
                      ? 'text-violet-400'
                      : streakLevel === 'gold'
                        ? 'text-amber-400'
                        : streakLevel === 'silver'
                          ? 'text-cyan-400'
                          : streakLevel === 'bronze'
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                  }`}>
                    {streak?.currentStreak || 0}
                  </span>
                </div>
                {/* Habit Name */}
                <div
                  className="bg-slate-800/50 p-2 lg:p-3 flex items-center gap-2 lg:gap-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
                  onClick={() => onEditHabit?.(habit)}
                >
                  <div 
                    className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center text-base lg:text-lg flex-shrink-0"
                    style={{ backgroundColor: `${habit.color}20` }}
                  >
                    {habit.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs lg:text-sm truncate" style={{ color: habit.color }}>
                      {habit.name}
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-400">
                      {getGoalDisplay(habit)}
                    </div>
                  </div>
                </div>

                {/* Day Cells */}
                {daysOfWeek.map((day) => {
                  const value = getEntryValue(habit.id, day.date);
                  const isToday = day.date === today;
                  const isFuture = day.date > today;
                  const isEditable = isDateEditable(day.date);
                  const inputStyle = getInputStyle(habit, value, day.date, status);
                  const buttonStyle = getBinaryButtonStyle(habit, value, day.date, status);

                  return (
                    <div
                      key={`${habit.id}-${day.date}`}
                      className={`bg-slate-800/50 p-1.5 lg:p-2 flex items-center justify-center ${
                        isToday ? 'bg-violet-900/20' : ''
                      } ${isFuture || !isEditable ? 'opacity-50' : ''}`}
                    >
                      {habit.type === 'binary' ? (
                        <button
                          onClick={() => toggleBinary(habit.id, day.date)}
                          disabled={!isEditable}
                          title={!isEditable && !isFuture ? 'Locked (6hr grace period expired)' : ''}
                          className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-all ${buttonStyle} ${!isEditable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {!isEditable && !isFuture ? (
                            <Lock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-500" />
                          ) : value === 1 ? (
                            <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          )}
                        </button>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={getNumericDisplayValue(habit.id, day.date)}
                          onChange={(e) => handleNumericInputChange(habit.id, day.date, e.target.value)}
                          onBlur={() => handleNumericInputBlur(habit.id, day.date)}
                          disabled={!isEditable}
                          placeholder="0"
                          title={!isEditable && !isFuture ? 'Locked (6hr grace period expired)' : ''}
                          className={`w-11 lg:w-14 h-7 lg:h-8 ${inputStyle.bg} border ${inputStyle.border} rounded-lg text-center text-xs lg:text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ${inputStyle.text} ${!isEditable ? 'cursor-not-allowed' : ''}`}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Weekly Progress */}
                <div className="bg-slate-800/50 p-2 lg:p-3 flex flex-col items-center justify-center">
                  <span 
                    className="font-bold text-sm lg:text-lg"
                    style={{ color: statusColor }}
                  >
                    {weeklyTotal}/{habit.weeklyGoal}
                  </span>
                  <span 
                    className="text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 rounded-full mt-0.5 lg:mt-1"
                    style={{ 
                      backgroundColor: `${statusColor}20`,
                      color: statusColor 
                    }}
                  >
                    {status === 'complete' && '✓ Done'}
                    {status === 'on-track' && 'On Track'}
                    {status === 'warning' && 'Catch Up'}
                    {status === 'behind' && 'Behind'}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-400">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-emerald-500" />
          <span>On Track</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-amber-500" />
          <span>Catch Up</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-red-500" />
          <span>Behind</span>
        </div>
      </div>
    </div>
  );
}
