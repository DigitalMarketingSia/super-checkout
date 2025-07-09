import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DEFAULT_TIMER_CONFIG } from '@/constants';

interface TimerConfig {
  enabled: boolean;
  durationInSeconds: number;
  backgroundColor: string;
  text: string;
}

interface TimerConfigurationProps {
  timerConfig: TimerConfig;
  onTimerConfigChange: (field: keyof TimerConfig, value: any) => void;
}

export const TimerConfiguration = ({
  timerConfig,
  onTimerConfigChange
}: TimerConfigurationProps) => {
  const convertSecondsToTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  };

  const convertTimeToSeconds = (hours: number, minutes: number, seconds: number) => {
    return hours * 3600 + minutes * 60 + seconds;
  };

  const timeComponents = convertSecondsToTime(timerConfig.durationInSeconds);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Timer de Escassez (Contagem Regressiva)</h3>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="timerEnabled"
          checked={timerConfig.enabled}
          onCheckedChange={(checked) => onTimerConfigChange('enabled', checked)}
        />
        <Label htmlFor="timerEnabled" className="text-gray-300">
          Ativar Timer
        </Label>
      </div>

      {timerConfig.enabled && (
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Duração do Timer</Label>
            <div className="flex space-x-2 mt-2">
              <div className="flex-1">
                <Label htmlFor="hours" className="text-gray-400 text-sm">Horas</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="23"
                  value={timeComponents.hours}
                  onChange={(e) => {
                    const newDuration = convertTimeToSeconds(
                      parseInt(e.target.value) || 0,
                      timeComponents.minutes,
                      timeComponents.seconds
                    );
                    onTimerConfigChange('durationInSeconds', newDuration);
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="minutes" className="text-gray-400 text-sm">Minutos</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={timeComponents.minutes}
                  onChange={(e) => {
                    const newDuration = convertTimeToSeconds(
                      timeComponents.hours,
                      parseInt(e.target.value) || 0,
                      timeComponents.seconds
                    );
                    onTimerConfigChange('durationInSeconds', newDuration);
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="seconds" className="text-gray-400 text-sm">Segundos</Label>
                <Input
                  id="seconds"
                  type="number"
                  min="0"
                  max="59"
                  value={timeComponents.seconds}
                  onChange={(e) => {
                    const newDuration = convertTimeToSeconds(
                      timeComponents.hours,
                      timeComponents.minutes,
                      parseInt(e.target.value) || 0
                    );
                    onTimerConfigChange('durationInSeconds', newDuration);
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="backgroundColor" className="text-gray-300">Cor de Fundo da Faixa</Label>
            <input
              id="backgroundColor"
              type="color"
              value={timerConfig.backgroundColor}
              onChange={(e) => onTimerConfigChange('backgroundColor', e.target.value)}
              className="w-full h-10 rounded border border-gray-600 bg-gray-700"
            />
          </div>

          <div>
            <Label htmlFor="timerText" className="text-gray-300">Texto da Faixa</Label>
            <Input
              id="timerText"
              value={timerConfig.text}
              onChange={(e) => onTimerConfigChange('text', e.target.value)}
              placeholder={DEFAULT_TIMER_CONFIG.text}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};