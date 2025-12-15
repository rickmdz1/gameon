import { WeatherForecast } from './types';

// Coordinates for Zip Code 95211 (Stockton, CA)
const LAT = 38.005;
const LON = -121.321;

export const getWeatherForecast = async (): Promise<WeatherForecast[]> => {
  try {
    // 1. Get grid point endpoint
    const pointsRes = await fetch(`https://api.weather.gov/points/${LAT},${LON}`, {
      headers: {
        'User-Agent': '(game-on-scheduler-app, contact@example.com)'
      }
    });
    
    if (!pointsRes.ok) throw new Error('Failed to fetch weather points');
    const pointsData = await pointsRes.json();
    const forecastUrl = pointsData.properties.forecast;

    // 2. Get forecast data
    const forecastRes = await fetch(forecastUrl, {
      headers: {
        'User-Agent': '(game-on-scheduler-app, contact@example.com)'
      }
    });

    if (!forecastRes.ok) throw new Error('Failed to fetch forecast');
    const forecastData = await forecastRes.json();

    // 3. Map to internal type
    const periods = forecastData.properties.periods;
    
    // Filter for daytime forecasts and map
    const mappedForecasts: WeatherForecast[] = periods
      .filter((p: any) => p.isDaytime)
      .map((p: any) => {
        let condition: 'sunny' | 'cloudy' | 'rainy' | 'partly-cloudy' = 'sunny';
        const short = p.shortForecast.toLowerCase();

        if (short.includes('rain') || short.includes('shower') || short.includes('storm')) {
          condition = 'rainy';
        } else if (short.includes('cloud') && (short.includes('partly') || short.includes('mostly'))) {
          condition = 'partly-cloudy';
        } else if (short.includes('cloud') || short.includes('overcast') || short.includes('fog')) {
          condition = 'cloudy';
        }

        return {
          date: new Date(p.startTime),
          temp: p.temperature,
          condition: condition,
          summary: p.shortForecast
        };
      });

    return mappedForecasts;

  } catch (error) {
    console.error("Error fetching weather:", error);
    return [];
  }
};