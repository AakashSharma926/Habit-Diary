import { 
  Flame, 
  Sparkles, 
  Star, 
  Crown, 
  Gem, 
  Zap,
  Leaf,
  Moon,
  Trophy
} from 'lucide-react';

interface StreakIconProps {
  streak: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Get icon size classes based on size prop
const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

export function StreakIcon({ streak, className = '', size = 'md' }: StreakIconProps) {
  const sizeClass = sizeClasses[size];
  const baseClass = `${sizeClass} ${className}`;
  
  // 365+ days - Immortal (Rainbow Star)
  if (streak >= 365) {
    return <Star className={`${baseClass} text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]`} />;
  }
  
  // 100+ days - Mythic (Diamond/Gem)
  if (streak >= 100) {
    return <Gem className={`${baseClass} text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]`} />;
  }
  
  // 60+ days - Legendary (Crown)
  if (streak >= 60) {
    return <Crown className={`${baseClass} text-purple-400 drop-shadow-[0_0_6px_rgba(192,132,252,0.7)]`} />;
  }
  
  // 30+ days - Fire (Flame)
  if (streak >= 30) {
    return <Flame className={`${baseClass} text-orange-400 fill-orange-500 drop-shadow-[0_0_5px_rgba(251,146,60,0.6)]`} />;
  }
  
  // 14+ days - Gold (Trophy)
  if (streak >= 14) {
    return <Trophy className={`${baseClass} text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]`} />;
  }
  
  // 7+ days - Silver (Zap/Lightning)
  if (streak >= 7) {
    return <Zap className={`${baseClass} text-violet-400 fill-violet-400`} />;
  }
  
  // 3+ days - Bronze (Sparkles)
  if (streak >= 3) {
    return <Sparkles className={`${baseClass} text-emerald-400`} />;
  }
  
  // 1-2 days - Starting (Leaf/Sprout)
  if (streak > 0) {
    return <Leaf className={`${baseClass} text-green-500`} />;
  }
  
  // 0 days - Inactive (Moon/Sleep)
  return <Moon className={`${baseClass} text-slate-500`} />;
}

// Get streak color for text/backgrounds (for use with the icon)
export function getStreakIconColor(streak: number): string {
  if (streak >= 365) return '#facc15'; // yellow-400
  if (streak >= 100) return '#22d3ee'; // cyan-400
  if (streak >= 60) return '#c084fc';  // purple-400
  if (streak >= 30) return '#fb923c';  // orange-400
  if (streak >= 14) return '#fbbf24';  // amber-400
  if (streak >= 7) return '#a78bfa';   // violet-400
  if (streak >= 3) return '#34d399';   // emerald-400
  if (streak > 0) return '#22c55e';    // green-500
  return '#64748b';                    // slate-500
}

