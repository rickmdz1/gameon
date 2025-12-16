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
                phone: data.phone ? String(data.phone) : undefined 
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
                phone: defaultPhone ? String(defaultPhone) : undefined
             });
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
    }
  };

  const handleUpdateProfile = async (updatedData: { name: string; phone: string; avatar?: string }) => {
    if (!user) return;
    
    try {
      // Clean phone number: remove non-digits. If empty, set to null.
      // Explicitly String() cast to handle cases where phone is a number/undefined
      const phoneInput = String(updatedData.phone || '');
      const cleanedPhone = phoneInput.replace(/\D/g, '');
      const phoneValue = cleanedPhone === '' ? null : cleanedPhone;

      const updatePayload: any = { 
          id: user.id,
          full_name: updatedData.name,
          phone: phoneValue
      };

      if (updatedData.avatar) {
          updatePayload.avatar_url = updatedData.avatar;
      }

      const { error } = await supabase
          .from('profiles')
          .upsert(updatePayload);

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
            let status = g.status || 'scheduled';
            let isTentative = g.is_tentative;
            let displayTime = g.time;

            // 1. Force revert if players < 4 (Fix for "still showing confirmed")
            if (status === 'confirmed' && players.length < 4) {
                 status = 'scheduled';
                 // If we revert to scheduled, we check if it should be tentative
                 if (alternativeTimes.length > 0) {
                     isTentative = true;
                 }
            }

            // 2. Logic to upgrade to confirmed
            if (status !== 'confirmed') {
                if (isTentative && alternativeTimes.length > 0) {
                     // Check voting
                     const voteCounts: Record<string, number> = {};
                     players.forEach((p: Player) => {
                         if (p.voted_time) {
                             const t = p.voted_time.trim();
                             voteCounts[t] = (voteCounts[t] || 0) + 1;
                         }
                     });

                     const allTimes = [displayTime, ...alternativeTimes];
                     // Dedupe and normalize
                     const candidates = [...new Set(allTimes.map(t => t.trim()))];

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
                  if (p.voted_time) {
                      const t = p.voted_time.trim();
                      voteCounts[t] = (voteCounts[t] || 0) + 1;
                  }
              });

              const candidates = [...new Set([gameData.time, ...alternativeTimes].map(t => t.trim()))];
              
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
      // 1. Fetch current participants to decide on transfer logic
      const { data: gameData, error: fetchError } = await supabase
        .from('games')
        .select(`*, game_participants (user_id, created_at)`)
        .eq('id', gameId)
        .single();

      if (fetchError || !gameData) throw new Error("Could not fetch game data");

      const participants = gameData.game_participants || [];
      const currentCount = participants.length;

      // 2. PRE-CHECK STATUS REVERT (Crucial: Update DB *before* removing participant to satisfy RLS)
      // If the game is confirmed and the count is 4 or less, leaving makes it < 4, so we revert.
      if (gameData.status === 'confirmed' && currentCount <= 4) {
          let isTentative = false;
          let hasAltTimes = false;
          const altTimes = gameData.alternative_times;

          if (Array.isArray(altTimes)) {
              hasAltTimes = altTimes.length > 0;
          } else if (typeof altTimes === 'string') {
              // Basic check for non-empty JSON array string or comma separated
              hasAltTimes = altTimes.includes('[') ? altTimes.length > 2 : altTimes.length > 0;
          }

          if (hasAltTimes) isTentative = true;

          const { error: statusError } = await supabase
            .from('games')
            .update({ 
                status: 'scheduled',
                is_tentative: isTentative
            })
            .eq('id', gameId);
          
          if (statusError) console.error("Error reverting status:", statusError);
      }

      const isCreator = gameData.creator_id === user.id;

      if (isCreator) {
          // Sort by join time to find the next oldest player (Host is usually first)
          participants.sort((a: any, b: any) => 
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );

          // Find the first participant that is NOT the current user
          const newOwner = participants.find((p: any) => p.user_id !== user.id);

          if (newOwner) {
              // Transfer ownership
              const { error: updateError } = await supabase
                  .from('games')
                  .update({ creator_id: newOwner.user_id })
                  .eq('id', gameId);
              
              if (updateError) {
                  // Fallback: If we can't transfer (e.g. RLS issues), we just log it and proceed to remove the participant.
                  // This is better than blocking the user from leaving.
                  console.warn("Soft Transfer failed (likely RLS), proceeding to leave:", updateError.message);
              }
          } else {
              // No players left -> Delete game automatically
              await handleCancelGame(gameId);
              return;
          }
      }

      // 3. Remove the player from participants list
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
      // Delete participants first (cascade often handles this, but explicit is safer)
      await supabase.from('game_participants').delete().eq('game_id', gameId);
      // Delete the game itself
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