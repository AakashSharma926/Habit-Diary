import { useMemo, useState } from 'react';
import {
  Download,
  Upload,
  Trophy,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import { useAuth } from '../context/AuthContext';
import { exportToJSON, exportToCSV, downloadFile, calculateOverallStreak, getStreakLevel } from '../lib/utils';
import { StreakIcon } from './StreakIcon';

interface HeaderProps {
  onImport: () => void;
}

export function Header({ onImport }: HeaderProps) {
  const {
    habits,
    allEntries,
    isViewingFriend,
  } = useHabits();
  
  const { user, isAuthenticated, isFirebaseEnabled, signInWithGoogle, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Calculate overall streak (weekly-based)
  const overallStreak = useMemo(() => {
    return calculateOverallStreak(habits, allEntries);
  }, [habits, allEntries]);

  const streakLevel = getStreakLevel(overallStreak.currentStreak);
  const currentStreak = overallStreak.currentStreak;

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
              title={`Current streak: ${currentStreak} days | This week: ${overallStreak.weeklyStatus}`}
            >
              <span className={`text-base sm:text-lg ${getStreakIconClass()}`}>
                <StreakIcon streak={currentStreak} size="lg" />
              </span>
              <span className="streak-number text-lg sm:text-xl font-bold">{currentStreak}</span>
              {/* Special badge for high streaks */}
              {streakLevel === 'immortal' && (
                <span className="absolute -top-2 -right-2 text-base animate-pulse"><Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" /></span>
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
            {/* Export/Import only when not viewing friend */}
            {!isViewingFriend && (
              <>
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
              </>
            )}
            
            {/* User Account */}
            {isFirebaseEnabled && (
              <div className="relative ml-2 flex items-center gap-2">
                {isAuthenticated && user ? (
                  <>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-1 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-8 h-8 rounded-full border-2 border-violet-500/50"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                    
                    {showUserMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 min-w-[220px] p-2">
                          <div className="px-3 py-2 border-b border-slate-700 mb-2">
                            <div className="font-medium truncate">{user.displayName}</div>
                            <div className="text-xs text-slate-400 truncate">{user.email}</div>
                          </div>
                          <button
                            onClick={() => {
                              logout();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  );
}
