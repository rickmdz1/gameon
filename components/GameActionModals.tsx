import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { X, Clock, MapPin, Trophy, Calendar as CalendarIcon, Check, LogOut, User as UserIcon, Sun, Cloud, CloudRain, CloudSun, Trash2, Loader2, Edit2, Save, StickyNote, MessageSquare, Plus, Vote, Mail, Lock, CheckCircle2, Users, AlertCircle, ThumbsUp } from 'lucide-react';
import { Game, Player, WeatherForecast } from '../types';
import { supabase } from '../supabaseClient';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  onSave: (game: Partial<Game>, note?: string, alternativeTimes?: string[]) => void;
  weatherForecasts: WeatherForecast[];
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ isOpen, onClose, date, onSave, weatherForecasts }) => {
  const [gameDate, setGameDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [altTimes, setAltTimes] = useState<string[]>([]);
  const [type, setType] = useState('Padel');
  const [location, setLocation] = useState('Central Court');
  const [duration, setDuration] = useState(120); // Default 2 hours
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (date) {
        setGameDate(format(date, 'yyyy-MM-dd'));
      } else {
        setGameDate(format(new Date(), 'yyyy-MM-dd'));
      }
      setTime('12:00');
      setAltTimes([]);
      setDuration(120); // Reset to default 2h on open
      setLocation('Central Court');
      setType('Padel');
      setNote('');
    }
  }, [isOpen, date]);

  const selectedWeather = gameDate ? weatherForecasts.find(w => {
    const [y, m, d] = gameDate.split('-').map(Number);
    return isSameDay(w.date, new Date(y, m - 1, d));
  }) : null;

  if (!isOpen) return null;

  const handleAddAltTime = () => {
    if (altTimes.length < 2) {
      setAltTimes([...altTimes, '14:00']);
    }
  };

  const handleAltTimeChange = (index: number, val: string) => {
    const newTimes = [...altTimes];
    newTimes[index] = val;
    setAltTimes(newTimes);
  };

  const handleRemoveAltTime = (index: number) => {
    const newTimes = altTimes.filter((_, i) => i !== index);
    setAltTimes(newTimes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const [year, month, day] = gameDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    await onSave({
      date: dateObj,
      time,
      duration: Number(duration),
      type,
      location,
      status: 'scheduled',
    }, note, altTimes);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule New Game">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Date & Weather Section */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">When</label>
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="date" 
                        value={gameDate}
                        onChange={(e) => setGameDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium transition-all"
                        required
                    />
                </div>
                <div className="relative w-32">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="time" 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium transition-all"
                        required
                    />
                </div>
            </div>

            {/* Alternative Times */}
            {altTimes.map((at, idx) => (
                <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative flex-1">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="time" 
                            value={at}
                            onChange={(e) => handleAltTimeChange(idx, e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium"
                        />
                    </div>
                    <button type="button" onClick={() => handleRemoveAltTime(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}

            {altTimes.length < 2 && (
                <button 
                    type="button" 
                    onClick={handleAddAltTime}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                >
                    <Plus className="w-3 h-3" /> Add Alternative Time
                </button>
            )}
            
            {/* Duration */}
            <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-medium text-slate-600">Duration:</label>
                 <div className="flex gap-2">
                    {[60, 90, 120, 150].map(d => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => setDuration(d)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${duration === d ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                        >
                            {d === 120 ? '2h (Default)' : `${d / 60}h`}
                        </button>
                    ))}
                 </div>
            </div>

            {selectedWeather && (
                <div className={`mt-2 p-3 rounded-xl flex items-center gap-3 text-sm font-medium border ${selectedWeather.condition === 'rainy' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {selectedWeather.condition === 'rainy' ? <CloudRain className="w-5 h-5 shrink-0" /> : 
                     selectedWeather.condition === 'sunny' ? <Sun className="w-5 h-5 shrink-0" /> :
                     selectedWeather.condition === 'partly-cloudy' ? <CloudSun className="w-5 h-5 shrink-0" /> :
                     <Cloud className="w-5 h-5 shrink-0" />}
                    <span className="opacity-90">{selectedWeather.summary || `${selectedWeather.temp}°F - ${selectedWeather.condition}`}</span>
                </div>
            )}
        </div>

        {/* Game Details Section */}
        <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Details</label>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium appearance-none transition-all"
                    >
                        <option>Padel</option>
                        <option>Tennis</option>
                        <option>Singles</option>
                        <option>Tournament</option>
                    </select>
                </div>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium appearance-none transition-all"
                    >
                        <option>Central Court</option>
                        <option>Court 1</option>
                        <option>Court 2</option>
                        <option>Court 3</option>
                        <option>Main Arena</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Note Section */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Note (Optional)</label>
            <div className="relative">
                <StickyNote className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium resize-none transition-all"
                    placeholder="Add details (e.g., 'Need 2 more players', 'Bringing snacks')..."
                />
            </div>
        </div>

        <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold rounded-xl shadow-lg shadow-yellow-400/20 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5" />}
            Confirm Schedule
        </button>
      </form>
    </Modal>
  );
};

interface ViewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  date: Date | null;
  onAddNew: () => void;
  onGameClick: (game: Game) => void;
}

export const ViewGameModal: React.FC<ViewGameModalProps> = ({ isOpen, onClose, games, date, onAddNew, onGameClick }) => {
  if (!date) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={format(date, 'MMMM do')}>
      <div className="flex flex-col gap-4">
        <div className="text-sm text-slate-500 font-medium mb-2">
            Scheduled Games
        </div>
        
        {games.length === 0 && (
            <p className="text-slate-400 text-center py-4">No games scheduled for this day.</p>
        )}

        {games.map((game) => {
            const hasAlternatives = game.alternative_times && game.alternative_times.length > 0;
            const isVoting = game.is_tentative && hasAlternatives;
            const isConfirmed = game.status === 'confirmed' || (!isVoting && game.players.length >= 4);
            const showPlayerStatus = !isVoting && !isConfirmed;
            
            return (
            <div 
                key={game.id} 
                onClick={() => onGameClick(game)}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 cursor-pointer hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-lg">{game.type}</h4>
                            {isConfirmed && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                            )}
                            {showPlayerStatus && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-blue-200">
                                   <ThumbsUp className="w-3 h-3" /> {game.players.length}/4
                                </span>
                            )}
                        </div>
                        <div className="flex items-center text-slate-500 text-sm gap-1">
                            <MapPin className="w-3 h-3" />
                            {game.location}
                        </div>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-lg text-sm font-bold text-blue-900 shadow-sm border border-slate-100">
                        {game.time}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex -space-x-2">
                        {game.players.slice(0,5).map((p, i) => (
                             <div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-800 overflow-hidden">
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    p.name.charAt(0)
                                )}
                             </div>
                        ))}
                    </div>
                    <span className="text-sm text-slate-600 font-medium ml-2">
                        {game.players.length} Players
                    </span>
                    {isVoting && (
                         <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full ml-auto">Vote active</span>
                    )}
                </div>
            </div>
        )})}

        <button 
            onClick={onAddNew}
            className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-400 hover:text-blue-600 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
            <Clock className="w-4 h-4" />
            Schedule another game
        </button>
      </div>
    </Modal>
  );
};

interface GameDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    game: Game | null;
    currentUser: Player | null;
    weatherForecasts?: WeatherForecast[];
    onJoin: (gameId: string, votedTime?: string) => void;
    onLeave: (gameId: string) => Promise<void>;
    onCancelGame: (gameId: string) => void;
    onUpdateGame: (gameId: string, updates: Partial<Game>) => Promise<void>;
    onUpdatePlayerMessage: (gameId: string, message: string) => Promise<void>;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ isOpen, onClose, game, currentUser, weatherForecasts, onJoin, onLeave, onCancelGame, onUpdateGame, onUpdatePlayerMessage }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [leaving, setLeaving] = useState(false);
    
    // Player Message Edit State
    const [editingMessage, setEditingMessage] = useState(false);
    const [myMessage, setMyMessage] = useState('');
    const [savingMessage, setSavingMessage] = useState(false);

    // Edit Game Form State
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editDuration, setEditDuration] = useState(120);
    const [editType, setEditType] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editNote, setEditNote] = useState('');

    useEffect(() => {
        if (game) {
            // Setup Game Edit State
            setEditDate(format(game.date, 'yyyy-MM-dd'));
            setEditTime(game.time);
            setEditDuration(game.duration);
            setEditType(game.type);
            setEditLocation(game.location);
            setEditNote(game.note || '');
            setIsEditing(false);

            // Setup Player Message State
            if (currentUser) {
                const participant = game.players.find(p => p.id === currentUser.id);
                if (participant) {
                    setMyMessage(participant.note || '');
                }
            }
        }
    }, [game, isOpen, currentUser]);

    if (!game) return null;

    // Determine Host based on first player in the list
    // This supports "Soft Ownership" if DB creator_id cannot be updated due to RLS.
    // The first player joined is considered the host.
    const sortedPlayers = [...game.players]; // Already sorted by join time in App.tsx
    const hostPlayer = sortedPlayers.length > 0 ? sortedPlayers[0] : null;
    
    // Am I the host?
    const isHost = currentUser && hostPlayer && hostPlayer.id === currentUser.id;
    
    const isJoined = currentUser && game.players.some(p => p.id === currentUser.id);
    const canTransferOwnership = isHost && game.players.length >= 2;
    
    // Find who will be the new owner (2nd player) if current creator leaves
    // This is purely for display text
    const nextOwner = canTransferOwnership ? game.players.find(p => p.id !== currentUser?.id) : null;
    
    const weather = weatherForecasts?.find(w => isSameDay(w.date, game.date));

    const WeatherIcon = ({ condition }: { condition: string }) => {
        switch (condition) {
            case 'sunny': return <Sun className="w-5 h-5 text-yellow-500" />;
            case 'cloudy': return <Cloud className="w-5 h-5 text-slate-400" />;
            case 'rainy': return <CloudRain className="w-5 h-5 text-blue-400" />;
            case 'partly-cloudy': return <CloudSun className="w-5 h-5 text-yellow-600" />;
            default: return <Sun className="w-5 h-5 text-yellow-500" />;
        }
    };

    const handleSaveEdit = async () => {
        setLoading(true);
        const [y, m, d] = editDate.split('-').map(Number);
        const newDate = new Date(y, m - 1, d); 

        await onUpdateGame(game.id, {
            date: newDate,
            time: editTime,
            duration: editDuration,
            type: editType,
            location: editLocation,
            note: editNote
        });
        setLoading(false);
        setIsEditing(false);
    };

    const handleSaveMessage = async () => {
        setSavingMessage(true);
        await onUpdatePlayerMessage(game.id, myMessage);
        setSavingMessage(false);
        setEditingMessage(false);
    };

    const handleLeave = async () => {
        setLeaving(true);
        await onLeave(game.id);
        setLeaving(false);
        // We DO NOT close the modal. This allows the user to see the updated state 
        // (i.e. they are no longer the owner or joined, and can rejoin if they want).
        // If the game was cancelled (because they were the only player), App.tsx handles closing via state update or unmount.
    };

    if (isEditing) {
        return (
            <Modal isOpen={isOpen} onClose={() => { setIsEditing(false); }} title="Edit Game Details">
                <div className="flex flex-col gap-5">
                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                            <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50" />
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Duration</label>
                        <select value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} className="w-full p-2 border rounded-lg bg-slate-50">
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                            <option value={150}>2.5 hours</option>
                            <option value={180}>3 hours</option>
                        </select>
                    </div>

                    {/* Type & Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                            <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50">
                                <option>Padel</option>
                                <option>Tennis</option>
                                <option>Singles</option>
                                <option>Tournament</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                            <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50">
                                <option>Central Court</option>
                                <option>Court 1</option>
                                <option>Court 2</option>
                                <option>Court 3</option>
                                <option>Main Arena</option>
                            </select>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Note</label>
                        <textarea 
                            value={editNote} 
                            onChange={(e) => setEditNote(e.target.value)} 
                            className="w-full p-2 border rounded-lg bg-slate-50" 
                            rows={3} 
                            placeholder="Add details..." 
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveEdit}
                            disabled={loading}
                            className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl shadow-lg hover:bg-blue-800 transition-colors flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    const availableTimes = [game.time, ...(game.alternative_times || [])];
    const hasMultipleTimes = availableTimes.length > 1;
    // Determine if we should show voting UI. 
    // It's strictly for when the game is tentative AND there are actual alternatives to choose from.
    const showVoting = game.is_tentative && hasMultipleTimes;

    // Count votes for each time
    const votes = availableTimes.reduce((acc, t) => {
        acc[t] = game.players.filter(p => p.voted_time === t).length;
        return acc;
    }, {} as Record<string, number>);
    
    // Find my voted time
    const myVote = currentUser ? game.players.find(p => p.id === currentUser.id)?.voted_time : null;

    // Logic for "Thumbs up" banner
    // Only show if NOT voting, NOT confirmed, and NOT full
    const isFull = game.players.length >= 4;
    const isConfirmed = game.status === 'confirmed' || (!showVoting && isFull);
    const showPlayerAlert = !showVoting && !isConfirmed;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Game Details">
            <div className="flex flex-col gap-6 relative">
                {isHost && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="absolute top-0 right-0 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Game"
                    >
                        <Edit2 className="w-5 h-5" />
                    </button>
                )}
                
                {/* Header Info */}
                <div className="flex flex-col gap-1 text-center pb-4 border-b border-slate-100 mx-8">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        {game.type}
                        {isConfirmed && (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        )}
                    </h2>
                    <p className="text-slate-500 font-medium">{format(game.date, 'EEEE, MMMM do, yyyy')}</p>
                    
                    {showVoting ? (
                        <div className="mt-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 self-center mx-auto">
                            <Vote className="w-3 h-3" /> Time Vote in Progress
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center gap-2 mt-2">
                            <span 
                                onClick={() => isHost && setIsEditing(true)}
                                className={`bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold ${isHost ? 'cursor-pointer hover:bg-blue-200 hover:text-blue-900 transition-colors' : ''}`}
                                title={isHost ? "Click to edit time" : ""}
                            >
                                {game.time}
                            </span>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">{game.duration} min</span>
                        </div>
                    )}

                    {showPlayerAlert && (
                        <div className="mt-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 self-center mx-auto border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                            <ThumbsUp className="w-3 h-3" /> {game.players.length}/4
                        </div>
                    )}
                </div>

                {/* Note Section */}
                {game.note && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1 flex items-center gap-2">
                            <StickyNote className="w-3 h-3" />
                            Note from Host
                        </h5>
                        <p className="text-sm text-slate-700 italic">"{game.note}"</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Location</p>
                            <p className="font-semibold text-slate-800">{game.location}</p>
                        </div>
                    </div>

                    {weather ? (
                         <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                <WeatherIcon condition={weather.condition} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Weather (95211)</p>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 capitalize">{weather.summary || weather.condition.replace('-', ' ')}</span>
                                    {weather.temp && <span className="text-xs text-slate-500 font-medium">{weather.temp}°F</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl opacity-60">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
                                <Cloud className="w-5 h-5" />
                            </div>
                             <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Weather</p>
                                <p className="font-medium text-slate-600 text-sm">Forecast unavailable</p>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Vote Results (Visible if tentative - FOR EVERYONE) */}
                {showVoting && (
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Vote className="w-3 h-3" /> Current Vote Standings
                        </h4>
                        <div className="space-y-2">
                            {availableTimes.map(t => {
                                const isMyChoice = myVote === t;
                                return (
                                    <div key={t} className={`flex items-center justify-between text-sm p-2 rounded-lg ${isMyChoice ? 'bg-blue-100/50' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${isMyChoice ? 'text-blue-800' : 'text-slate-700'}`}>{t}</span>
                                            {isMyChoice && <span className="text-[10px] text-blue-600 bg-white px-1.5 rounded-full border border-blue-100">Your Vote</span>}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isMyChoice ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-900'}`}>
                                            {votes[t] || 0} votes
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                        Participants
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{game.players.length}</span>
                    </h4>
                    <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                        {game.players.map(player => {
                            const isMe = currentUser && player.id === currentUser.id;
                            const message = player.note;
                            const vote = player.voted_time;
                            const isPlayerHost = player.id === hostPlayer?.id;
                            
                            return (
                                <div key={player.id} className="flex flex-col gap-1 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden shrink-0">
                                            {player.avatar ? (
                                                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover"/>
                                            ) : (
                                                <span className="text-sm">{player.name ? player.name.charAt(0) : '?'}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${isMe ? 'text-blue-600' : 'text-slate-700'}`}>
                                                    {player.name} {isMe && '(You)'}
                                                </span>
                                                {isPlayerHost && (
                                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">Host</span>
                                                )}
                                            </div>
                                            {showVoting && vote && (
                                                <span className="text-[10px] text-blue-500 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-md self-start">
                                                    Voted: {vote}
                                                </span>
                                            )}
                                        </div>
                                        {isMe && !editingMessage && (
                                            <button 
                                                onClick={() => setEditingMessage(true)}
                                                className="ml-auto p-1.5 text-slate-400 hover:text-blue-600 bg-white shadow-sm rounded-full transition-all"
                                                title={message ? "Edit Status" : "Add Status"}
                                            >
                                                {message ? <Edit2 className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Inline Edit Form for Message */}
                                    {isMe && editingMessage ? (
                                        <div className="ml-11 flex items-center gap-2 mt-1">
                                            <input 
                                                type="text" 
                                                value={myMessage} 
                                                onChange={(e) => setMyMessage(e.target.value)}
                                                placeholder="Set status (e.g. Late, Bringing balls)..."
                                                className="text-xs w-full p-1.5 border border-blue-200 rounded focus:outline-none focus:border-blue-400 bg-blue-50/50"
                                                autoFocus
                                            />
                                            <button 
                                                onClick={handleSaveMessage} 
                                                disabled={savingMessage}
                                                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                                {savingMessage ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}
                                            </button>
                                            <button onClick={() => setEditingMessage(false)} className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors"><X className="w-3 h-3"/></button>
                                        </div>
                                    ) : message && (
                                        <div className="ml-11 text-xs text-slate-600 bg-slate-100 p-2 rounded-lg inline-block self-start border border-slate-200 mt-1 relative group-hover:bg-white transition-colors">
                                            "{message}"
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action Buttons / Voting */}
                <div className="pt-2 flex flex-col gap-3">
                    {/* Voting Logic - Available to everyone if tentative AND multiple options (Creator can change vote, others can join/change) */}
                    {showVoting && (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold text-slate-600 mb-1">
                                {isJoined ? "Change your vote:" : "Pick a time to Join:"}
                            </p>
                            {availableTimes.map(t => {
                                const isMyChoice = myVote === t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => { 
                                            onJoin(game.id, t); 
                                            // Only close modal if it's the first time joining for non-creator. 
                                            // If changing vote, keeping it open allows checking the new vote count immediately.
                                            if (!isJoined) onClose();
                                        }}
                                        disabled={isMyChoice}
                                        className={`w-full py-3 font-bold rounded-xl flex items-center justify-between px-4 transition-colors hover:shadow-md ${
                                            isMyChoice 
                                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-500 cursor-default shadow-none' 
                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Clock className="w-4 h-4"/> 
                                            {t}
                                            {isMyChoice && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full ml-2">Selected</span>}
                                        </span>
                                        <span className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded-md">
                                            {votes[t] || 0} / 4
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Standard Join for non-tentative games OR single-option tentative games */}
                    {!showVoting && !isJoined && (
                        <button 
                            onClick={() => { onJoin(game.id, game.time); onClose(); }}
                            className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Join Game
                        </button>
                    )}
                    
                    {/* Host Actions */}
                    {isHost && (
                        <div className="flex flex-col gap-2 mt-2">
                            {canTransferOwnership && (
                                 <div className="flex flex-col gap-1">
                                    <button 
                                        onClick={handleLeave}
                                        disabled={leaving}
                                        className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        {leaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <LogOut className="w-4 h-4" />}
                                        Leave Game
                                    </button>
                                    <span className="text-[10px] text-slate-400 text-center">
                                        Host will be transferred to {nextOwner?.name || 'next player'}
                                    </span>
                                </div>
                            )}
                            
                            <button 
                                onClick={() => { onCancelGame(game.id); onClose(); }}
                                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Cancel Game
                            </button>
                        </div>
                    )}

                    {/* Participant Leave Action (Non-Host) */}
                    {isJoined && !isHost && (
                        <button 
                            onClick={handleLeave}
                            disabled={leaving}
                            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {leaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <LogOut className="w-4 h-4" />}
                            Leave Game
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("If this is a new account, please check your email for a confirmation link.");
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isSignUp ? "Join Game On!" : "Welcome Back"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
            </div>
        )}
        
        <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    placeholder="you@example.com"
                    required
                />
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    placeholder="••••••••"
                    required
                />
            </div>
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl mt-2 hover:bg-blue-800 transition-colors flex justify-center items-center gap-2"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (isSignUp ? "Sign Up" : "Sign In")}
        </button>

        <div className="text-center text-sm text-slate-500 mt-2">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 text-blue-600 font-bold hover:underline"
            >
                {isSignUp ? "Sign In" : "Sign Up"}
            </button>
        </div>
      </form>
    </Modal>
  );
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Player | null;
  onUpdate: (data: { name: string; phone: string }) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate({ name, phone });
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
             <div className="flex justify-center mb-4">
                 <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 font-bold text-3xl border-4 border-white shadow-lg overflow-hidden">
                     {user?.avatar ? (
                         <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                         user?.name.charAt(0)
                     )}
                 </div>
             </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Display Name</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone (Optional)</label>
                <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    placeholder="For game notifications"
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl mt-4 hover:bg-blue-800 transition-colors flex justify-center items-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Save Changes"}
            </button>
        </form>
    </Modal>
  );
};