import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  subDays,
  subWeeks,
  subYears,
  addDays,
} from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClose: () => void;
}

const PRESET_RANGES = [
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

export function DateRangePicker({ value, onChange, onClose }: DateRangePickerProps) {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ minWidth: '600px', maxWidth: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="font-semibold text-lg">Select Date Range</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex">
          {/* Preset Ranges */}
          <div className="w-44 bg-slate-900/50 border-r border-slate-700 p-2">
            <div className="text-xs text-slate-500 uppercase font-medium px-3 py-2">
              Quick Select
            </div>
            {PRESET_RANGES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-violet-600/20 hover:text-violet-400 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex-1 p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
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
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs text-slate-500 font-medium py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, tempRange.from) || isSameDay(day, tempRange.to);
                const inRange = isInRange(day);
                const isToday = isSameDay(day, new Date());
                const isStart = isSameDay(day, tempRange.from);
                const isEnd = isSameDay(day, tempRange.to);

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative h-9 text-sm rounded-lg transition-all
                      ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-300'}
                      ${isToday && !isSelected ? 'ring-1 ring-violet-500' : ''}
                      ${inRange && !isSelected ? 'bg-violet-600/20' : ''}
                      ${isSelected ? 'bg-violet-600 text-white font-medium' : 'hover:bg-slate-700'}
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
            <div className="mt-4 p-3 bg-slate-900/50 rounded-xl">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-500">From:</span>{' '}
                  <span className="font-medium text-violet-400">
                    {format(tempRange.from, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="text-slate-600">→</div>
                <div>
                  <span className="text-slate-500">To:</span>{' '}
                  <span className="font-medium text-cyan-400">
                    {format(tempRange.to, 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl text-sm font-medium transition-all"
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
