import React from 'react';
import { WeatherForecast } from '../types';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, CloudSun } from 'lucide-react';

interface WeatherWidgetProps {
  forecasts: WeatherForecast[];
}

const WeatherIcon = ({ condition }: { condition: WeatherForecast['condition'] }) => {
  switch (condition) {
    case 'sunny': return <Sun className="w-6 h-6 text-yellow-500" />;
    case 'cloudy': return <Cloud className="w-6 h-6 text-slate-400" />;
    case 'rainy': return <CloudRain className="w-6 h-6 text-blue-400" />;
    case 'partly-cloudy': return <CloudSun className="w-6 h-6 text-yellow-600" />;
    default: return <Sun className="w-6 h-6 text-yellow-500" />;
  }
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ forecasts }) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm mt-0 lg:mt-6 w-full max-w-sm">
      <div className="flex flex-col gap-6">
        {forecasts.map((forecast, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 w-24">
              {index === 0 ? 'Today' : format(forecast.date, 'eeee')}
            </span>
            <div className="flex-1 flex justify-center items-center gap-3">
                <WeatherIcon condition={forecast.condition} />
                <div className="text-sm font-medium text-slate-600 flex flex-col items-start leading-tight">
                    <span>{forecast.temp}°F</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{forecast.condition.replace('-', ' ')}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherWidget;