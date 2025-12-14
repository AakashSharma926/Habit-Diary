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
  isSameWeek,
  isBefore,
} from 'date-fns';

interface SimpleCalendarPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

// Minimum date: December 1, 2025
const MIN_DATE = new Date(2025, 11, 1);

export function SimpleCalendarPicker({ selectedDate, onSelectDate, onClose }: SimpleCalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

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
  
  const canGoPrevMonth = !isBefore(subMonths(currentMonth, 1), MIN_DATE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up p-4 w-full max-w-[340px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Title */}
        <div className="text-center mb-4">
          <h3 className="text-sm font-semibold text-slate-300">Select Week</h3>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => canGoPrevMonth && setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={!canGoPrevMonth}
            className={`p-2 rounded-lg transition-colors ${
              canGoPrevMonth 
                ? 'hover:bg-slate-700 text-slate-300' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
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
            const isBeforeMin = isBefore(day, MIN_DATE);

            return (
              <button
                key={idx}
                onClick={() => !isBeforeMin && handleDayClick(day)}
                disabled={isBeforeMin}
                className={`
                  h-9 w-9 text-sm rounded-lg transition-all
                  ${isBeforeMin ? 'text-slate-700 cursor-not-allowed' : ''}
                  ${!isCurrentMonth && !isBeforeMin ? 'text-slate-600' : ''}
                  ${isCurrentMonth && !isBeforeMin ? 'text-slate-300 hover:bg-slate-700' : ''}
                  ${isToday && !isBeforeMin ? 'ring-1 ring-violet-500 font-bold text-violet-400' : ''}
                  ${isSelectedWeek && isCurrentMonth && !isBeforeMin ? 'bg-violet-600/30' : ''}
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
    </div>
  );
}
