import React from 'react';
import { Zap } from 'lucide-react';

interface SparksDisplayProps {
  sparks: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function SparksDisplay({ 
  sparks, 
  size = 'md', 
  showLabel = false,
  className = '' 
}: SparksDisplayProps) {
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 gap-1',
      icon: 'w-3.5 h-3.5',
      text: 'text-xs',
    },
    md: {
      container: 'px-2.5 py-1.5 gap-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      container: 'px-3 py-2 gap-2',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };

  const styles = sizeClasses[size];

  // Format sparks number (1000 -> 1K, 1000000 -> 1M)
  const formatSparks = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div 
      className={`
        flex items-center ${styles.container} 
        bg-gradient-to-r from-amber-500/20 to-yellow-500/20 
        border border-amber-500/30 rounded-lg
        ${className}
      `}
      title={`${sparks.toLocaleString()} Sparks`}
    >
      <Zap className={`${styles.icon} text-amber-400 fill-amber-400`} />
      <span className={`${styles.text} font-bold text-amber-400`}>
        {formatSparks(sparks)}
      </span>
      {showLabel && (
        <span className={`${styles.text} text-amber-400/70`}>Sparks</span>
      )}
    </div>
  );
}

// Animated spark burst for when earning new sparks
interface SparkBurstProps {
  amount: number;
  onComplete?: () => void;
}

export function SparkBurst({ amount, onComplete }: SparkBurstProps) {
  // Auto-dismiss after 4 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={onComplete}
    >
      {/* Backdrop - click to dismiss */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Popup */}
      <div className="relative animate-bounce-in flex flex-col items-center gap-2 bg-slate-900/95 border border-amber-500/50 rounded-2xl px-8 py-6 shadow-2xl shadow-amber-500/20">
        <div className="flex items-center gap-3">
          <Zap className="w-10 h-10 text-amber-400 fill-amber-400 animate-pulse" />
          <span className="text-4xl font-bold text-amber-400">+{amount}</span>
        </div>
        <span className="text-amber-400/80 text-lg">Sparks Earned!</span>
        <span className="text-slate-500 text-xs mt-1">Click anywhere to dismiss</span>
      </div>
    </div>
  );
}

