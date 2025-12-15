import { addDays } from 'date-fns';
import { WeatherForecast, Game, Player } from './types';

// Placeholder for weather, as we are not fetching live weather yet
const today = new Date();

export const MOCK_WEATHER: WeatherForecast[] = [
  { date: today, temp: 24, condition: 'partly-cloudy' },
  { date: addDays(today, 1), temp: 22, condition: 'cloudy' },
  { date: addDays(today, 2), temp: 25, condition: 'sunny' },
  { date: addDays(today, 3), temp: 19, condition: 'rainy' },
  { date: addDays(today, 4), temp: 20, condition: 'rainy' },
];

export const MOCK_USER: Player = {
  id: 'user-1',
  name: 'Alex Johnson',
  avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80',
  phone: '555-0101',
  note: 'Ready to play!'
};

export const MOCK_GAMES: Game[] = [
  {
    id: 'game-1',
    date: today,
    time: '14:00',
    duration: 90,
    type: 'Padel',
    location: 'Central Court',
    status: 'scheduled',
    creatorId: 'user-2',
    players: [
      { id: 'user-2', name: 'Sarah Conner', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80', voted_time: '14:00' },
      { id: 'user-3', name: 'Mike Ross', voted_time: '14:00' },
      MOCK_USER
    ],
    note: 'Bring your own racket if possible.'
  },
  {
    id: 'game-2',
    date: addDays(today, 2),
    time: '10:00',
    duration: 60,
    type: 'Tennis',
    location: 'Court 1',
    status: 'scheduled',
    creatorId: 'user-4',
    players: [
      { id: 'user-4', name: 'Harvey Specter', voted_time: '10:00' },
      { id: 'user-5', name: 'Donna Paulsen', voted_time: '10:00' }
    ]
  }
];
