import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  isSameWeek,
} from 'date-fns';

interface SimpleCalendarPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export function SimpleCalendarPicker({ selectedDate, onSelectDate, onClose }: SimpleCalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getDaysInMonth = (date: Date) => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleDayClick = (day: Date) => {
    onSelectDate(day);
    onClose();
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up p-4"
      style={{ minWidth: '300px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-semibold text-sm">
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
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
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
          const isToday = isSameDay(day, today);
          const isSelectedWeek = isSameWeek(day, selectedDate, { weekStartsOn: 1 });

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              className={`
                h-9 w-9 text-sm rounded-lg transition-all
                ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-300 hover:bg-slate-700'}
                ${isToday ? 'ring-1 ring-violet-500 font-bold text-violet-400' : ''}
                ${isSelectedWeek && isCurrentMonth ? 'bg-violet-600/30' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Today Button */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <button
          onClick={() => {
            onSelectDate(new Date());
            onClose();
          }}
          className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-colors"
        >
          Go to Today
        </button>
      </div>
    </div>
  );
}

