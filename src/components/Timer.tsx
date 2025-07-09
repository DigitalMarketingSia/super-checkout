import { useState, useEffect } from 'react';

interface TimerProps {
  durationInSeconds: number;
  backgroundColor: string;
  text: string;
}

export const Timer = ({ durationInSeconds, backgroundColor, text }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(durationInSeconds);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="w-full py-3 px-4 text-center text-white font-bold text-lg"
      style={{ backgroundColor }}
    >
      {text} {formatTime(timeLeft)}
    </div>
  );
};