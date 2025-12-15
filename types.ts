export interface Player {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  note?: string;
  voted_time?: string; // The time this player voted for
}

export interface Game {
  id: string;
  date: Date;
  time: string; // The currently displayed/main time
  duration: number; // minutes
  type: string; // e.g., "Padel"
  location: string;
  players: Player[];
  status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed';
  creatorId?: string;
  note?: string;
  alternative_times?: string[]; // Array of alternative time strings
  is_tentative?: boolean; // True if voting is still in progress
}

export interface WeatherForecast {
  date: Date;
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'partly-cloudy';
  summary?: string;
}