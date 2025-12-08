import { useMemo } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import { exportToJSON, exportToCSV, downloadFile, calculateOverallStreak, getStreakLevel, getStreakEmoji } from '../lib/utils';

interface HeaderProps {
  onImport: () => void;
}

export function Header({ onImport }: HeaderProps) {
  const {
    clearAllEntries,
    habits,
    allEntries,
  } = useHabits();

  // Calculate overall streak (weekly-based)
  const overallStreak = useMemo(() => {
    return calculateOverallStreak(habits, allEntries);
  }, [habits, allEntries]);

  const streakLevel = getStreakLevel(overallStreak.currentStreak);
  const streakEmoji = getStreakEmoji(overallStreak.currentStreak);

  const handleExportJSON = () => {
    const json = exportToJSON(habits, allEntries);
    const filename = `habits-export-${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(json, filename, 'application/json');
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(habits, allEntries);
    const filename = `habits-export-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csv, filename, 'text/csv');
  };

  const handleClearAllEntries = async () => {
    if (confirm('⚠️ Clear all tracking data? Your habits will be kept, but all progress will be reset. This cannot be undone!')) {
      await clearAllEntries();
    }
  };

  // Get streak badge styling based on current week's overall status
  const getStreakBadgeClass = () => {
    // Color based on current week status: green (on track), yellow (warning), red (behind)
    if (overallStreak.weeklyStatus === 'behind') {
      return 'bg-gradient-to-r from-red-500 to-red-600';
    } else if (overallStreak.weeklyStatus === 'warning') {
      return 'bg-gradient-to-r from-amber-500 to-yellow-500';
    } else {
      // On track or complete
      return 'bg-gradient-to-r from-emerald-500 to-green-600';
    }
  };

  const getStreakIconClass = () => {
    if (streakLevel === 'immortal') return 'streak-icon';
    if (streakLevel === 'mythic') return 'streak-icon';
    if (streakLevel === 'fire') return 'flame-animate';
    return '';
  };

  return (
    <header className="glass sticky top-0 z-50 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <span className="text-base sm:text-xl">🎯</span>
            </div>
            <div className="hidden xs:block">
              <h1 className="text-base sm:text-xl font-bold gradient-text">Habit Diary</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Build your best self</p>
            </div>
            
            {/* Overall Streak Badge - Color based on current week status */}
            <div 
              className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg ${getStreakBadgeClass()}`}
              title={`Current streak: ${overallStreak.currentStreak} days | This week: ${overallStreak.weeklyStatus}`}
            >
              <span className={`text-base sm:text-lg ${getStreakIconClass()}`}>
                {streakEmoji}
              </span>
              <span className="streak-number text-lg sm:text-xl font-bold">{overallStreak.currentStreak}</span>
              {/* Special badge for high streaks */}
              {streakLevel === 'immortal' && (
                <span className="absolute -top-2 -right-2 text-base animate-pulse">🌟</span>
              )}
              {streakLevel === 'mythic' && (
                <span className="absolute -top-1.5 -right-1.5 text-sm">💎</span>
              )}
              {streakLevel === 'legendary' && (
                <span className="absolute -top-1.5 -right-1.5 text-sm">👑</span>
              )}
            </div>
            
            {/* Best Streak - Separate */}
            {overallStreak.maxStreak > 0 && (
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 border border-amber-500/30"
                title={`Best streak: ${overallStreak.maxStreak} days`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">{overallStreak.maxStreak}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative group">
              <button className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                <button
                  onClick={handleExportJSON}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-700 rounded-t-lg whitespace-nowrap"
                >
                  Export as JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-700 rounded-b-lg whitespace-nowrap"
                >
                  Export as CSV
                </button>
              </div>
            </div>
            
            <button
              onClick={onImport}
              className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              title="Import data"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import</span>
            </button>
            
            <button
              onClick={handleClearAllEntries}
              className="p-1.5 sm:p-2 hover:bg-amber-600/20 text-amber-400 rounded-lg transition-colors"
              title="Reset all tracking data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
