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
import { Loader2 } from 'lucide-react';

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
          fetchProfile(session.user.id);
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
        fetchProfile(session.user.id);
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

  const fetchProfile = async (userId: string) => {
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
             // Fallback for new users: Attempt to create a profile row so joins work
             const defaultName = 'New Player';
             const { error: insertError } = await supabase.from('profiles').insert({
                 id: userId,
                 full_name: defaultName,
                 // Optional: Set a default avatar or let it be null
             });

             if (insertError) {
                 console.warn("Could not auto-create profile row:", insertError.message);
             }

             setUser({ 
                id: userId, 
                name: defaultName, 
             });
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
    }
  };

  const handleUpdateProfile = async (updatedData: { name: string; phone: string }) => {
    if (!user) return;
    
    try {
      // Use upsert to ensure profile exists even if it was missing before
      const { error } = await supabase
          .from('profiles')
          .upsert({ 
              id: user.id,
              full_name: updatedData.name,
              phone: updatedData.phone,
              updated_at: new Date().toISOString()
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
            // Robust parsing for alternative_times
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
                        alternativeTimes = cleaned.split(',').map(t => t.replace(/"/g, '').trim());
                    }
                }
            }

            return {
              id: g.id,
              date: new Date(g.date),
              time: g.time,
              duration: g.duration,
              type: g.type,
              location: g.location,
              status: g.status || 'scheduled',
              creatorId: g.creator_id,
              note: g.note,
              alternative_times: alternativeTimes,
              is_tentative: g.is_tentative,
              players: g.game_participants ? g.game_participants
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
                  }) : []
            };
          });
          
          // Filter out games with 0 players (cancelled/abandoned but not fully deleted)
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
    const dayGames = games.filter(g => isSameDay(g.date, date));
    setSelectedDate(date);
    
    if (dayGames.length > 0) {
      setViewMode('viewDay');
    } else {
      if (!user) {
        setViewMode('auth');
      } else {
        setViewMode('new');
      }
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
      
      // Removed check for creator_id here to allow new host (second player) to update if RLS permits
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

      const { data: gameData, error: fetchError } = await supabase
        .from('games')
        .select(`*, game_participants(user_id, voted_time)`)
        .eq('id', gameId)
        .single();
        
      if (!fetchError && gameData) {
          const participants = gameData.game_participants || [];
          const playersCount = participants.length;
          
          if (gameData.is_tentative) {
              const voteCounts: Record<string, number> = {};
              participants.forEach((p: any) => {
                  if (p.voted_time) {
                      voteCounts[p.voted_time] = (voteCounts[p.voted_time] || 0) + 1;
                  }
              });

              let winningTime = null;
              for (const [time, count] of Object.entries(voteCounts)) {
                  if (count >= 4) {
                      winningTime = time;
                      break;
                  }
              }

              if (winningTime) {
                  await supabase.from('games').update({
                      status: 'confirmed',
                      time: winningTime, 
                      is_tentative: false
                  }).eq('id', gameId);
              }
          } else {
              if (playersCount >= 4 && gameData.status !== 'confirmed') {
                  await supabase.from('games').update({
                      status: 'confirmed'
                  }).eq('id', gameId);
              }
          }
      }

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
          // Ensure sorted order to reliably find "second" player
          participants.sort((a: any, b: any) => 
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );

          const remainingPlayers = participants.filter((p: any) => p.user_id !== user.id);

          if (remainingPlayers.length > 0) {
              const newOwnerId = remainingPlayers[0].user_id;
              
              // Attempt ownership transfer in DB. If this fails due to RLS, we catch it 
              // but continue with the leave process so the user isn't stuck.
              // The frontend UI will handle "Soft Ownership" based on player order.
              try {
                  const { error: updateError } = await supabase
                      .from('games')
                      .update({ creator_id: newOwnerId })
                      .eq('id', gameId);

                  if (updateError) {
                       console.warn("Soft Transfer: Database ownership update skipped (likely RLS restricted).", updateError.message);
                  }
              } catch (transferErr) {
                   console.warn("Soft Transfer: Error during ownership transfer attempt.", transferErr);
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
      // First, attempt to remove all participants.
      // RLS note: This might fail for non-creators if they can't delete other users' rows.
      // However, we proceed to attempt game deletion.
      await supabase.from('game_participants').delete().eq('game_id', gameId);
      
      // Attempt to delete the game row
      const { error } = await supabase.from('games').delete().eq('id', gameId);
      
      if (error) {
         console.warn("Backend delete failed (likely RLS), but UI will hide empty game.", error.message);
         // If we failed to delete the game row, it might still have 0 participants if that delete worked.
         // If it has 0 participants, fetchGames() will filter it out.
         // If participants were NOT deleted (due to RLS), the game will remain. 
         // In that case, we can't do much without backend changes, but we try our best.
      }

      // Optimistically remove from local state
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
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <MiniCalendar 
            onDateClick={handleDateClick} 
            games={games}
          />
          <WeatherWidget forecasts={weatherForecasts} />
        </aside>

        <div className="flex-1 bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-sm min-h-[800px]">
          {errorMsg ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                  <p>{errorMsg}</p>
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