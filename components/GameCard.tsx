import React from 'react';
import { Game } from '../types';
import { Clock, CheckCircle2, ThumbsUp } from 'lucide-react';

interface GameCardProps {
  game: Game;
  isWeekend: boolean;
  onClick?: (game: Game) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, isWeekend, onClick }) => {
  // Styles based on the image description and weekend highlight request.
  // Using Yellow for Saturday/Sunday active cards to pop.
  const cardBg = isWeekend ? 'bg-yellow-400' : 'bg-white';
  const textColor = isWeekend ? 'text-blue-900' : 'text-slate-800';
  const subTextColor = isWeekend ? 'text-blue-800' : 'text-slate-500';
  const playerTextColor = isWeekend ? 'text-blue-900' : 'text-slate-600';
  
  // Logic to determine display state
  const hasAlternatives = game.alternative_times && game.alternative_times.length > 0;
  const isVoting = game.is_tentative && hasAlternatives;
  
  // Visually confirm if status is confirmed OR if it's a single-time game with 4+ players
  const isConfirmed = game.status === 'confirmed' || (!isVoting && game.players.length >= 4);
  
  const showPlayerStatus = !isVoting && !isConfirmed;

  return (
    <div 
      className="flex flex-row items-stretch w-full mb-4 group cursor-pointer"
      onClick={() => onClick && onClick(game)}
    >
      {/* Time Column */}
      <div className="w-24 py-4 flex flex-col justify-start">
        <span className={`text-2xl font-bold ${isWeekend ? 'text-slate-800' : 'text-slate-800'}`}>
          {game.time}
        </span>
        {isVoting && (
           <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full w-fit mt-1">
             Voting
           </span>
        )}
      </div>

      {/* Main Card Content */}
      <div className={`flex-1 ${isWeekend ? 'bg-yellow-400' : 'bg-transparent border-b border-slate-100'} p-4 rounded-xl flex items-center justify-between transition-all hover:shadow-md hover:bg-slate-50/50`}>
        
        {/* Game Info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-xl font-bold ${textColor}`}>
              {game.type}
            </h3>
            {isConfirmed && (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Confirmed
                </div>
            )}
            {showPlayerStatus && (
                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold border border-blue-200">
                    <ThumbsUp className="w-3 h-3" />
                    {game.players.length}/4
                </div>
            )}
          </div>
          <div className={`flex items-center gap-2 text-sm ${subTextColor}`}>
            <span>{game.location}</span>
          </div>
          {isWeekend && (
              <div className="mt-2 inline-flex items-center px-2 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm">
                  <Clock className="w-3 h-3 mr-1" /> {game.duration} min
              </div>
          )}
        </div>

        {/* Players List - Right Aligned */}
        <div className="flex flex-col items-end gap-1 ml-4 text-right">
          {game.players.slice(0, 4).map((player) => (
            <span key={player.id} className={`text-sm font-medium ${playerTextColor}`}>
              {player.name}
            </span>
          ))}
          {game.players.length > 4 && (
             <span className={`text-xs ${subTextColor}`}>+{game.players.length - 4} more</span>
          )}
        </div>

      </div>
    </div>
  );
};

export default GameCard;