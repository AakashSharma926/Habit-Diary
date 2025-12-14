import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  { label: 'Last 14 Days', getValue: () => ({ from: clampDate(subDays(new Date(), 13)), to: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ from: clampDate(subDays(new Date(), 29)), to: new Date() }) },
  { label: 'This Month', getValue: () => ({ from: clampDate(startOfMonth(new Date())), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getValue: () => ({ from: clampDate(startOfMonth(subMonths(new Date(), 1))), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: clampDate(subMonths(new Date(), 3)), to: new Date() }) },
  { label: 'Last 6 Months', getValue: () => ({ from: clampDate(subMonths(new Date(), 6)), to: new Date() }) },
  { label: 'Since 2025', getValue: () => ({ from: MIN_DATE, to: new Date() }) },
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
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
