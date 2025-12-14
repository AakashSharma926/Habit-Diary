import React, { useState } from 'react';
import { X, Smile, Trash2, Hash, CheckSquare } from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import { HABIT_COLORS, HABIT_ICONS } from '../lib/utils';
import type { Habit, HabitType, HabitFormData } from '../types';

interface HabitFormProps {
  habit?: Habit | null;
  onClose: () => void;
}

export function HabitForm({ habit, onClose }: HabitFormProps) {
  const { addHabit, editHabit, removeHabit } = useHabits();
  const isEditing = !!habit;

  const [formData, setFormData] = useState<HabitFormData>({
    name: habit?.name || '',
    type: habit?.type || 'binary',
    weeklyGoal: habit?.weeklyGoal || 7,
    unit: habit?.unit || 'days',
    color: habit?.color || HABIT_COLORS[0],
    icon: habit?.icon || HABIT_ICONS[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditing && habit) {
        await editHabit(habit.id, formData);
      } else {
        await addHabit(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save habit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (type: HabitType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      unit: type === 'binary' ? 'days' : prev.unit === 'days' ? 'units' : prev.unit,
    }));
  };

  const handleDelete = async () => {
    if (!habit) return;
    if (confirm(`Delete "${habit.name}"? This will also delete all tracking data for this habit. This cannot be undone!`)) {
      setIsSubmitting(true);
      try {
        await removeHabit(habit.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete habit:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="glass rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Habit' : 'Add New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Habit Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Morning meditation"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Tracking Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('binary')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  formData.type === 'binary'
                    ? 'border-violet-500 bg-violet-500/20'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <CheckSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="font-medium text-sm">Checkbox</div>
                <div className="text-xs text-slate-400">Did it or not</div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('numeric')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  formData.type === 'numeric'
                    ? 'border-violet-500 bg-violet-500/20'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <Hash className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="font-medium text-sm">Numeric</div>
                <div className="text-xs text-slate-400">Track amounts</div>
              </button>
            </div>
          </div>

          {/* Goal & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Weekly Goal
              </label>
              <input
                type="number"
                value={formData.weeklyGoal}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    weeklyGoal: parseFloat(e.target.value) || 0,
                  }))
                }
                min="1"
                step={formData.type === 'numeric' ? '0.5' : '1'}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                required
              />
              {/* Per-day calculation for numeric habits */}
              {formData.type === 'numeric' && formData.weeklyGoal > 0 && (
                <div className="mt-1.5 text-xs text-cyan-400 flex items-center gap-1">
                  <span>≈ {Math.round((formData.weeklyGoal / 7) * 100) / 100}</span>
                  <span className="text-slate-500">{formData.unit}/day</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g., liters, eggs"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    formData.icon === icon
                      ? 'border-violet-500 bg-violet-500/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {icon}
                </button>
              ))}
              {/* Custom Emoji Input */}
              <div className="relative">
                <input
                  type="text"
                  value={!HABIT_ICONS.includes(formData.icon) ? formData.icon : ''}
                  onChange={(e) => {
                    // Get the last character/emoji entered
                    const value = e.target.value;
                    if (value) {
                      // Extract the last emoji (handles multi-byte emojis)
                      const emojis = [...value];
                      const lastEmoji = emojis[emojis.length - 1];
                      setFormData((prev) => ({ ...prev, icon: lastEmoji }));
                    }
                  }}
                  placeholder="😀"
                  className={`w-10 h-10 text-xl text-center rounded-lg border-2 bg-slate-800 transition-all ${
                    !HABIT_ICONS.includes(formData.icon)
                      ? 'border-violet-500 bg-violet-500/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  title="Type any emoji"
                />
                <Smile className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-3 h-3 text-slate-500" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Click a preset or type your own emoji in the input box
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-slate-800/50 rounded-xl">
            <div className="text-xs text-slate-400 mb-2">Preview</div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                {formData.icon}
              </div>
              <div>
                <div className="font-medium">{formData.name || 'Habit name'}</div>
                <div className="text-xs text-slate-400">
                  {formData.weeklyGoal} {formData.unit}/week • {formData.type}
                </div>
              </div>
            </div>
          </div>

          {/* Delete Button (only when editing) */}
          {isEditing && (
            <div className="pt-2 border-t border-slate-700/50">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Habit
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

