import React, { useState } from 'react';
import { Check, Plus, Minus, Edit2, Trash2 } from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import {
  getWeekDates,
  formatDate,
  getDayName,
  formatDisplayDate,
  isCurrentWeek,
  calculateWeeklyStats,
  getStatusColor,
} from '../lib/utils';
import type { Habit } from '../types';

interface HabitGridProps {
  onEditHabit: (habit: Habit) => void;
}

export function HabitGrid({ onEditHabit }: HabitGridProps) {
  const { habits, entries, weekStart, updateEntry, getEntryValue, removeHabit } = useHabits();
  const weekDates = getWeekDates(weekStart);
  const today = formatDate(new Date());
  const isCurrentWeekView = isCurrentWeek(weekStart);

  const handleToggleBinary = async (habitId: string, date: string) => {
    const currentValue = getEntryValue(habitId, date);
    await updateEntry(habitId, date, currentValue === 0 ? 1 : 0);
  };

  const handleNumericChange = async (habitId: string, date: string, delta: number) => {
    const currentValue = getEntryValue(habitId, date);
    const newValue = Math.max(0, currentValue + delta);
    await updateEntry(habitId, date, newValue);
  };

  const handleNumericInput = async (habitId: string, date: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    await updateEntry(habitId, date, Math.max(0, numValue));
  };

  const handleDeleteHabit = async (habit: Habit) => {
    if (confirm(`Are you sure you want to delete "${habit.name}"? All data will be lost.`)) {
      await removeHabit(habit.id);
    }
  };

  if (habits.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold mb-2">No habits yet</h3>
        <p className="text-slate-400 mb-4">Add your first habit to start tracking your progress!</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Grid Header */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left p-3 md:p-4 font-semibold text-slate-300 w-48 md:w-64">
                Habit
              </th>
              {weekDates.map((date) => {
                const dateStr = formatDate(date);
                const isToday = dateStr === today;
                return (
                  <th
                    key={dateStr}
                    className={`p-2 md:p-3 text-center font-medium w-20 md:w-24 ${
                      isToday ? 'bg-violet-600/20' : ''
                    }`}
                  >
                    <div className={`text-xs ${isToday ? 'text-violet-300' : 'text-slate-400'}`}>
                      {getDayName(date)}
                    </div>
                    <div className={`text-sm ${isToday ? 'text-violet-200 font-bold' : 'text-slate-300'}`}>
                      {formatDisplayDate(date)}
                    </div>
                  </th>
                );
              })}
              <th className="p-3 md:p-4 text-center font-semibold text-slate-300 w-24 md:w-32">
                Weekly
              </th>
              <th className="p-3 md:p-4 text-center font-semibold text-slate-300 w-20 md:w-24">
                Status
              </th>
              <th className="p-3 md:p-4 w-16 md:w-20"></th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit, idx) => {
              const stats = calculateWeeklyStats(habit, entries, weekStart);
              const statusColor = getStatusColor(stats.isOnTrack, stats.completionPercentage);

              return (
                <tr
                  key={habit.id}
                  className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors animate-slide-up`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Habit Name */}
                  <td className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div
                        className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-lg md:text-xl shrink-0"
                        style={{ backgroundColor: `${habit.color}20` }}
                      >
                        {habit.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm md:text-base truncate">{habit.name}</div>
                        <div className="text-xs text-slate-400">
                          {habit.weeklyGoal} {habit.unit}/week
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Daily Cells */}
                  {weekDates.map((date) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === today;
                    const value = getEntryValue(habit.id, dateStr);

                    return (
                      <td
                        key={dateStr}
                        className={`p-1 md:p-2 text-center ${isToday ? 'bg-violet-600/10' : ''}`}
                      >
                        {habit.type === 'binary' ? (
                          <button
                            onClick={() => handleToggleBinary(habit.id, dateStr)}
                            className={`w-10 h-10 md:w-12 md:h-12 mx-auto rounded-xl flex items-center justify-center transition-all transform hover:scale-105 ${
                              value > 0
                                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                                : 'bg-slate-700/50 text-slate-500 border-2 border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            {value > 0 && <Check className="w-5 h-5 md:w-6 md:h-6" />}
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              onClick={() => handleNumericChange(habit.id, dateStr, 1)}
                              className="w-6 h-5 md:w-8 md:h-6 bg-slate-700/50 hover:bg-slate-600 rounded-t-md flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={value || ''}
                              onChange={(e) => handleNumericInput(habit.id, dateStr, e.target.value)}
                              placeholder="0"
                              className="w-10 md:w-12 h-8 md:h-10 text-center bg-slate-700/50 border-x border-slate-600 text-sm font-medium focus:outline-none focus:bg-slate-600/50"
                              min="0"
                              step="0.5"
                            />
                            <button
                              onClick={() => handleNumericChange(habit.id, dateStr, -1)}
                              className="w-6 h-5 md:w-8 md:h-6 bg-slate-700/50 hover:bg-slate-600 rounded-b-md flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Weekly Total */}
                  <td className="p-3 md:p-4 text-center">
                    <div className="font-bold text-lg" style={{ color: habit.color }}>
                      {stats.total}
                      <span className="text-slate-500 font-normal text-sm">/{stats.goal}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {stats.remaining > 0 ? `${stats.remaining} left` : '✓ Done!'}
                    </div>
                    {stats.remaining > 0 && stats.avgNeededPerDay > 0 && (
                      <div className="text-xs text-slate-500">
                        ~{stats.avgNeededPerDay}/day needed
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3 md:p-4 text-center">
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${statusColor}20`,
                        color: statusColor,
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      {stats.completionPercentage}%
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-3 md:p-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditHabit(habit)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
                        title="Edit habit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHabit(habit)}
                        className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                        title="Delete habit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

