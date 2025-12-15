import React, { useState } from 'react';
import { 
  format, 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  isBefore,
  isWeekend
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Game } from '../types';

interface MiniCalendarProps {
  onDateClick?: (date: Date) => void;
  games: Game[];
}

const isHoliday = (date: Date): boolean => {
  const month = date.getMonth(); 
  const d = date.getDate(); 
  const dayOfWeek = date.getDay(); 

  // Fixed Date Holidays
  if (month === 0 && d === 1) return true; // New Year's Day
  if (month === 5 && d === 19) return true; // Juneteenth
  if (month === 6 && d === 4) return true; // Independence Day
  if (month === 10 && d === 11) return true; // Veterans Day
  if (month === 11 && d === 25) return true; // Christmas Day

  // Dynamic Day-of-Week Holidays
  // MLK Day: 3rd Monday in Jan
  if (month === 0 && dayOfWeek === 1 && d >= 15 && d <= 21) return true;
  // Presidents' Day: 3rd Monday in Feb
  if (month === 1 && dayOfWeek === 1 && d >= 15 && d <= 21) return true;
  // Memorial Day: Last Monday in May
  if (month === 4 && dayOfWeek === 1 && d >= 25) return true;
  // Labor Day: 1st Monday in Sep
  if (month === 8 && dayOfWeek === 1 && d <= 7) return true;
  // Columbus Day: 2nd Monday in Oct
  if (month === 9 && dayOfWeek === 1 && d >= 8 && d <= 14) return true;
  // Thanksgiving: 4th Thursday in Nov
  if (month === 10 && dayOfWeek === 4 && d >= 22 && d <= 28) return true;

  return false;
};

const MiniCalendar: React.FC<MiniCalendarProps> = ({ onDateClick, games }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Replacements for missing date-fns functions
  const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day; 
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getStartOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const monthStart = getStartOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = getStartOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm w-full max-w-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-4 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-slate-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-4">
        {calendarDays.map((day, dayIdx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isToday(day);
          const isPast = isBefore(day, getStartOfToday());
          const hasGame = games.some(g => isSameDay(g.date, day));
          const isWknd = isWeekend(day);
          const isHol = isHoliday(day);
          
          let dayClasses = "w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all relative ";
          
          // Base Text Color
          if (!isCurrentMonth) {
            dayClasses += "text-slate-300 ";
          } else {
            // Priority: Selected > Holiday > Weekend > Default
            if (isSelected) {
               dayClasses += "bg-blue-900 text-white font-bold hover:bg-blue-800 ";
            } else if (isHol) {
               dayClasses += "bg-red-50 text-red-600 font-medium ";
            } else if (isWknd) {
               dayClasses += "bg-slate-100 text-slate-500 shadow-sm ";
            } else {
               dayClasses += "text-slate-700 ";
            }

            // Hover state for interactive days
            if (!isSelected && !isPast) {
               dayClasses += "hover:bg-yellow-100 cursor-pointer font-semibold ";
            }
          }

          if (isPast && !isSelected) {
             dayClasses += "opacity-50 cursor-default ";
          }

          return (
            <div key={day.toString()} className="flex justify-center relative">
              <button
                disabled={isPast}
                onClick={() => onDateClick && onDateClick(day)}
                className={dayClasses}
                title={isHol ? "Holiday" : ""}
              >
                {format(day, 'd')}
              </button>
              {hasGame && !isSelected && isCurrentMonth && (
                <div className="absolute bottom-0 w-1 h-1 bg-red-500 rounded-full mb-1"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;