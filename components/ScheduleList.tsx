import React from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { Game } from '../types';
import GameCard from './GameCard';
import { Plus } from 'lucide-react';

interface ScheduleListProps {
  games: Game[];
  onScheduleNew: () => void;
  onGameClick: (game: Game) => void;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ games, onScheduleNew, onGameClick }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Group games by date string to identify unique days with games
  // Filter only upcoming games (or today)
  const upcomingGames = games
    .filter(g => g.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Get unique dates that have games
  const uniqueDates: string[] = [];
  upcomingGames.forEach(g => {
    const dateStr = g.date.toISOString().split('T')[0];
    if (!uniqueDates.includes(dateStr)) {
      uniqueDates.push(dateStr);
    }
  });

  // Limit to first 5 days with games
  const displayDates = uniqueDates.slice(0, 5).map(dateStr => {
    // Reconstruct date object from string to avoid timezone shifts if possible, 
    // or just find the first game with this date string and use its date object
    const game = upcomingGames.find(g => g.date.toISOString().split('T')[0] === dateStr);
    return game ? game.date : new Date(dateStr);
  });

  return (
    <div className="flex-1 px-4 lg:px-12 py-6">
      <div className="flex justify-between items-start mb-10">
        <div>
           {/* Header spacer */}
        </div>
        <button 
          onClick={onScheduleNew}
          className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold py-3 px-6 rounded-2xl shadow-lg shadow-yellow-400/30 flex items-center gap-2 transition-transform transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Schedule new game
        </button>
      </div>

      <div className="space-y-8">
        {displayDates.length > 0 ? (
          displayDates.map((date) => {
            const dayGames = games.filter((g) => isSameDay(g.date, date));
            const isDayWeekend = isWeekend(date);
            const dayName = format(date, 'EEEE'); 
            const dayNumber = format(date, 'd'); 

            return (
              <div key={date.toString()} className="flex flex-col">
                {/* Day Header */}
                <div className="mb-4 flex items-baseline gap-2">
                   <h2 className={`text-3xl font-bold ${isDayWeekend ? 'text-blue-600' : 'text-slate-800'}`}>
                      {dayName}
                   </h2>
                   <span className={`text-3xl font-light ${isDayWeekend ? 'text-blue-400' : 'text-slate-400'}`}>
                      {dayNumber}
                   </span>
                   {isDayWeekend && <span className="text-sm font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-full">Weekend Vibes</span>}
                </div>

                {/* Games List for the Day */}
                <div className="flex flex-col">
                    {dayGames.map((game) => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                        isWeekend={isDayWeekend} 
                        onClick={onGameClick}
                      />
                    ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 text-slate-400">
            <p className="text-xl">No upcoming games scheduled.</p>
            <p className="text-sm mt-2">Click the button above to start a game!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleList;