import React, { useState, useEffect } from 'react';
import { isSameDay } from 'date-fns';
import Header from './components/Header';
import MiniCalendar from './components/MiniCalendar';
import WeatherWidget from './components/WeatherWidget';
import ScheduleList from './components/ScheduleList';
import { NewGameModal, ViewGameModal, GameDetailsModal, AuthModal, ProfileModal } from './components/GameActionModals';
import { MOCK_WEATHER } from './constants';
import { getWeatherForecast } from './weatherService';
import { Game, Player, WeatherForecast } from './types';
import { supabase } from './supabaseClient';
import { Loader2, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<Player | null>(null);
  
  // Track ID instead of object to avoid stale data
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  
  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecast[]>(MOCK_WEATHER);
  
  // Modal states
  const [viewMode, setViewMode] = useState<'none' | 'new' | 'viewDay' | 'gameDetails' | 'auth' | 'profile'>('none');

  // Derived state: Get the latest game object from the list using the ID
  const selectedGame = selectedGameId ? games.find(g => g.id === selectedGameId) || null : null;

  // Handle Auth State Changes
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          fetchProfile(session.user.id, session.user.user_metadata);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
        if (viewMode === 'auth') setViewMode('none');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [viewMode]);

  // Fetch Weather
  useEffect(() => {
    const fetchWeather = async () => {
      const forecast = await getWeatherForecast();
      if (forecast.length > 0) {
        setWeatherForecasts(forecast);
      }
    };
    fetchWeather();
  }, []);

  const fetchProfile = async (userId: string, metadata?: any) => {
    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        
        // Handle "Row not found" gracefully
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            setUser({ 
                id: data.id, 
                name: data.full_name || 'Player', 
                avatar: data.avatar_url,
                phone: data.phone 
            });
        } else {
             // Fallback for new users: Use metadata if available, else default
             const defaultName = metadata?.full_name || 'New Player';
             const defaultPhone = metadata?.phone || null;

             const { error: insertError } = await supabase.from('profiles').insert({
                 id: userId,
                 full_name: defaultName,
                 phone: defaultPhone
             });

             if (insertError) {
                 console.warn("Could not auto-create profile row:", insertError.message);
             }

             setUser({ 
                id: userId, 
                name: defaultName, 
                phone: defaultPhone
             });
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
    }
  };

  const handleUpdateProfile = async (updatedData: { name: string; phone: string }) => {
    if (!user) return;
    
    try {
      // Clean phone number: remove non-digits. If empty, set to null.
      const cleanedPhone = updatedData.phone.replace(/\D/g, '');
      const phoneValue = cleanedPhone === '' ? null : cleanedPhone;

      const { error } = await supabase
          .from('profiles')
          .upsert({ 
              id: user.id,
              full_name: updatedData.name,
              phone: phoneValue
          });

      if (error) throw error;
      await fetchProfile(user.id);
    } catch (error: any) {
      console.error("Profile update failed:", error.message);
      alert("Failed to update profile: " + error.message);
    }
  };

  // Fetch Games
  useEffect(() => {
    fetchGames();
  }, [user]); 

  const fetchGames = async (isBackground = false) => {
    // If no user, we don't fetch (or we fetch but won't show). 
    // Requirement: Don't show games if not logged in.
    if (!user) {
      setGames([]);
      setLoading(false);
      return;
    }

    if (!isBackground) setLoading(true);
    setErrorMsg(null);

    try {
        const { data: gamesData, error } = await supabase
          .from('games')
          .select(`
            *,
            game_participants (
              user_id,
              note,
              voted_time,
              created_at,
              profiles ( id, full_name, avatar_url )
            )
          `)
          .order('date', { ascending: true });

        if (error) throw error;

        if (gamesData) {
          const formattedGames: Game[] = gamesData.map((g: any) => {
            let alternativeTimes: string[] = [];
            if (Array.isArray(g.alternative_times)) {
                alternativeTimes = g.alternative_times;
            } else if (typeof g.alternative_times === 'string') {
                try {
                    const parsed = JSON.parse(g.alternative_times);
                    if (Array.isArray(parsed)) alternativeTimes = parsed;
                } catch {
                    const cleaned = g.alternative_times.replace(/^\{|\}$/g, '');
                    if (cleaned) {
                        alternativeTimes = cleaned.split(',').map((t: string) => t.replace(/"/g, '').trim());
                    }
                }
            }

            const players = g.game_participants ? g.game_participants
                  .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
                  .map((gp: any) => {
                     const profileData = gp.profiles;
                     const profile = Array.isArray(profileData) ? profileData[0] : profileData;
                     
                     if (!profile) return { id: 'unknown', name: 'Unknown', avatar: undefined };
                     
                     return {
                      id: profile.id,
                      name: profile.full_name,
                      avatar: profile.avatar_url,
                      note: gp.note,
                      voted_time: gp.voted_time 
                     };
                  }) : [];

            // AUTO-CONFIRMATION LOGIC (Client-Side)
            // If the DB hasn't updated yet or RLS prevents it, we calculate the status locally
            // to ensure the UI reflects "Confirmed! Game On!" when conditions are met.
            let status = g.status || 'scheduled';
            let isTentative = g.is_tentative;
            let displayTime = g.time;

            if (status !== 'confirmed') {
                if (isTentative && alternativeTimes.length > 0) {
                     // Check voting
                     const voteCounts: Record<string, number> = {};
                     players.forEach((p: Player) => {
                         if (p.voted_time) voteCounts[p.voted_time] = (voteCounts[p.voted_time] || 0) + 1;
                     });

                     const allTimes = [displayTime, ...alternativeTimes];
                     // Dedupe just in case
                     const candidates = [...new Set(allTimes)];

                     for (const t of candidates) {
                         if ((voteCounts[t] || 0) >= 4) {
                             status = 'confirmed';
                             isTentative = false;
                             displayTime = t;
                             break;
                         }
                     }
                } else {
                     // Standard Game
                     if (players.length >= 4) {
                         status = 'confirmed';
                     }
                }
            }

            return {
              id: g.id,
              date: new Date(g.date),
              time: displayTime,
              duration: g.duration,
              type: g.type,
              location: g.location,
              status: status,
              creatorId: g.creator_id,
              note: g.note,
              alternative_times: alternativeTimes,
              is_tentative: isTentative,
              players: players
            };
          });
          
          const activeGames = formattedGames.filter(g => g.players.length > 0);
          setGames(activeGames);
        }
    } catch (error: any) {
        console.error('Failed to fetch games:', error.message || error);
        setErrorMsg(`Could not load games: ${error.message || 'Unknown error'}`);
        setGames([]);
    } finally {
        if (!isBackground) setLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    if (!user) {
        setViewMode('auth');
        return;
    }
    const dayGames = games.filter(g => isSameDay(g.date, date));
    setSelectedDate(date);
    
    if (dayGames.length > 0) {
      setViewMode('viewDay');
    } else {
      setViewMode('new');
    }
  };

  const handleScheduleNew = () => {
    if (!user) {
        setViewMode('auth');
        return;
    }
    setSelectedDate(new Date());
    setViewMode('new');
  };

  const handleGameClick = (game: Game) => {
    setSelectedGameId(game.id);
    setViewMode('gameDetails');
  };

  const handleSaveGame = async (gameData: Partial<Game>, note?: string, alternativeTimes?: string[]) => {
    if (!user) return;

    try {
      const uniqueAltTimes = alternativeTimes 
          ? [...new Set(alternativeTimes.filter(t => t && t !== gameData.time))] 
          : [];
      
      const isTentative = uniqueAltTimes.length > 0;
      
      const { data: newGameData, error } = await supabase
        .from('games')
        .insert({
          date: gameData.date,
          time: gameData.time,
          duration: gameData.duration,
          type: gameData.type,
          location: gameData.location,
          creator_id: user.id,
          note: note,
          status: 'scheduled',
          alternative_times: uniqueAltTimes,
          is_tentative: isTentative
        })
        .select()
        .single();

      if (error || !newGameData) throw error || new Error('No data returned');

      const creatorVote = gameData.time;

      const { error: participantError } = await supabase.from('game_participants').insert({
        game_id: newGameData.id,
        user_id: user.id,
        voted_time: creatorVote
      });

      if (participantError) console.error("Error adding creator:", participantError.message);

      await fetchGames(true); 
      setViewMode('none');

    } catch (error: any) {
      console.error("Save failed:", error.message);
      alert("Failed to save game: " + error.message);
    }
  };

  const handleUpdateGame = async (gameId: string, updates: Partial<Game>) => {
    if (!user) return;
    
    try {
      const dbUpdates: any = {};
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.time) dbUpdates.time = updates.time;
      if (updates.duration) dbUpdates.duration = updates.duration;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.note !== undefined) dbUpdates.note = updates.note;
      
      // Update logic for alternative times
      if (updates.alternative_times !== undefined) {
         dbUpdates.alternative_times = updates.alternative_times;
         // If we are updating alt times, we re-evaluate tentative status
         dbUpdates.is_tentative = updates.alternative_times.length > 0;
      }
      
      const { error } = await supabase
        .from('games')
        .update(dbUpdates)
        .eq('id', gameId);

      if (error) throw error;
      await fetchGames(true);
    } catch (error: any) {
      console.error("Error updating game:", error.message);
      alert("Failed to update game: " + error.message);
    }
  };

  const handleUpdatePlayerMessage = async (gameId: string, message: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
          .from('game_participants')
          .update({ note: message })
          .eq('game_id', gameId)
          .eq('user_id', user.id);

      if (error) throw error;
      await fetchGames(true);
    } catch (error: any) {
      console.error("Could not save message to DB:", error.message);
      alert("Failed to update status: " + error.message);
    }
  };

  const handleJoinGame = async (gameId: string, votedTime?: string) => {
    if (!user) {
        setViewMode('auth');
        return;
    }

    try {
      const { error } = await supabase.from('game_participants').upsert({
        game_id: gameId,
        user_id: user.id,
        voted_time: votedTime
      }); 
      
      if (error) throw error;

      // --- CHECK FOR CONFIRMATION (4 PLAYERS) ---
      // Attempt to persist the status update in the DB.
      // Even if this fails (e.g. RLS), the fetchGames logic will handle the UI update.
      const { data: gameData } = await supabase
        .from('games')
        .select(`*, game_participants(voted_time)`)
        .eq('id', gameId)
        .single();

      if (gameData && gameData.status !== 'confirmed') {
          const participants = gameData.game_participants || [];
          let shouldConfirm = false;
          let winningTime = gameData.time;

          // Normalize alt times
          let alternativeTimes: string[] = [];
          if (Array.isArray(gameData.alternative_times)) {
              alternativeTimes = gameData.alternative_times;
          } else if (typeof gameData.alternative_times === 'string') {
              try {
                  const parsed = JSON.parse(gameData.alternative_times);
                  if (Array.isArray(parsed)) alternativeTimes = parsed;
              } catch {
                   const cleaned = gameData.alternative_times.replace(/^\{|\}$/g, '');
                   if (cleaned) alternativeTimes = cleaned.split(',').map((t: string) => t.replace(/"/g, '').trim());
              }
          }

          if (gameData.is_tentative && alternativeTimes.length > 0) {
              // Voting Logic
              const voteCounts: Record<string, number> = {};
              participants.forEach((p: any) => {
                  if (p.voted_time) voteCounts[p.voted_time] = (voteCounts[p.voted_time] || 0) + 1;
              });

              const candidates = [...new Set([gameData.time, ...alternativeTimes])];
              
              for (const t of candidates) {
                  if ((voteCounts[t] || 0) >= 4) {
                      shouldConfirm = true;
                      winningTime = t;
                      break;
                  }
              }
          } else {
              // Standard Logic
              if (participants.length >= 4) {
                  shouldConfirm = true;
              }
          }

          if (shouldConfirm) {
              await supabase.from('games').update({
                  status: 'confirmed',
                  is_tentative: false,
                  time: winningTime
              }).eq('id', gameId);
          }
      }
      // ------------------------------------------

      await fetchGames(true);
    } catch (error: any) {
      console.error("Error joining game:", error.message);
      alert("Failed to join game: " + error.message);
    }
  };

  const handleLeaveGame = async (gameId: string) => {
    if (!user) return;

    try {
      const { data: gameData, error: fetchError } = await supabase
        .from('games')
        .select(`*, game_participants (user_id, created_at)`)
        .eq('id', gameId)
        .single();

      if (fetchError || !gameData) throw new Error("Could not fetch game data");

      const isCreator = gameData.creator_id === user.id;

      if (isCreator) {
          const participants = gameData.game_participants || [];
          participants.sort((a: any, b: any) => 
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );

          const remainingPlayers = participants.filter((p: any) => p.user_id !== user.id);

          if (remainingPlayers.length > 0) {
              const newOwnerId = remainingPlayers[0].user_id;
              try {
                  const { error: updateError } = await supabase
                      .from('games')
                      .update({ creator_id: newOwnerId })
                      .eq('id', gameId);
                  if (updateError) console.warn("Soft Transfer skipped (RLS).");
              } catch (transferErr) {
                   console.warn("Soft Transfer Error", transferErr);
              }
          } else {
              await handleCancelGame(gameId);
              return;
          }
      }

      const { error } = await supabase
        .from('game_participants')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchGames(true);
    } catch (error: any) {
      console.error("Error leaving game:", error.message);
      alert(error.message);
    }
  };

  const handleCancelGame = async (gameId: string) => {
    if (!user) return;
    try {
      await supabase.from('game_participants').delete().eq('game_id', gameId);
      await supabase.from('games').delete().eq('id', gameId);
      setGames(prevGames => prevGames.filter(g => g.id !== gameId));
      setViewMode('none');
      setSelectedGameId(null);
    } catch (error: any) {
       console.error("Error cancelling game:", error.message);
       alert("Failed to cancel game: " + error.message);
    }
  };

  const handleCloseModal = () => {
    setViewMode('none');
    setSelectedDate(null);
    setSelectedGameId(null);
  };

  const getSelectedDayGames = () => {
    if (!selectedDate) return [];
    return games.filter(g => isSameDay(g.date, selectedDate));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-900">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-yellow-200">
      <Header 
        user={user} 
        onSignInClick={() => setViewMode('auth')} 
        onProfileClick={() => setViewMode('profile')}
      />
      
      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 p-4 lg:p-8">
        {/* Aside: Calendar and Weather. Side-by-side on mobile/tablet (flex-row), stacked on desktop (lg:flex-col) */}
        <aside className="w-full lg:w-80 flex flex-row flex-wrap lg:flex-col gap-6 shrink-0 justify-center lg:justify-start">
          <div className="w-full sm:w-auto lg:w-full flex justify-center">
             <MiniCalendar 
               onDateClick={handleDateClick} 
               games={games}
             />
          </div>
          <div className="w-full sm:w-auto lg:w-full flex justify-center">
             <WeatherWidget forecasts={weatherForecasts} />
          </div>
        </aside>

        <div className="flex-1 bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-sm min-h-[600px] lg:min-h-[800px]">
          {errorMsg ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                  <p>{errorMsg}</p>
              </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                   <Lock className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Member Access Only</h3>
                <p className="text-slate-500 max-w-md mb-8">
                   Please sign in to view the schedule, join matches, and see who is playing.
                </p>
                <button 
                    onClick={() => setViewMode('auth')} 
                    className="bg-blue-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-transform active:scale-95 shadow-lg shadow-blue-900/20"
                >
                    Sign In to Game On!
                </button>
            </div>
          ) : (
            <ScheduleList 
                games={games} 
                onScheduleNew={handleScheduleNew}
                onGameClick={handleGameClick}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <NewGameModal 
        isOpen={viewMode === 'new'} 
        onClose={handleCloseModal}
        date={selectedDate}
        onSave={handleSaveGame}
        weatherForecasts={weatherForecasts}
      />

      <ViewGameModal 
        isOpen={viewMode === 'viewDay'}
        onClose={handleCloseModal}
        games={getSelectedDayGames()}
        date={selectedDate}
        onAddNew={handleScheduleNew}
        onGameClick={handleGameClick}
      />

      <GameDetailsModal 
        isOpen={viewMode === 'gameDetails'}
        onClose={handleCloseModal}
        game={selectedGame} 
        currentUser={user}
        weatherForecasts={weatherForecasts}
        onJoin={handleJoinGame}
        onLeave={handleLeaveGame}
        onCancelGame={handleCancelGame}
        onUpdateGame={handleUpdateGame}
        onUpdatePlayerMessage={handleUpdatePlayerMessage}
      />

      <AuthModal 
        isOpen={viewMode === 'auth'}
        onClose={handleCloseModal}
      />

      <ProfileModal 
        isOpen={viewMode === 'profile'}
        onClose={handleCloseModal}
        user={user}
        onUpdate={handleUpdateProfile}
      />
    </div>
  );
};

export default App;