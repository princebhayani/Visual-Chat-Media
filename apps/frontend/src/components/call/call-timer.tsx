'use client';

interface CallTimerProps {
  duration: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CallTimer({ duration }: CallTimerProps) {
  return (
    <span className="text-sm font-mono text-white/80">
      {formatDuration(duration)}
    </span>
  );
}
