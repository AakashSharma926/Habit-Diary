import { useState, useEffect } from 'react';
import { Plus, CalendarCheck, PieChart, Users, FileBarChart } from 'lucide-react';
import { HabitProvider, useHabits } from './context/HabitContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { HabitForm } from './components/HabitForm';
import { ImportModal } from './components/ImportModal';
import { MainDashboard } from './components/MainDashboard';
import { TrackerView } from './components/TrackerView';
import { FriendsPanel } from './components/FriendsPanel';
import { ReportsView } from './components/ReportsView';
// LoginScreen is used conditionally based on auth state
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LoginScreen } from './components/LoginScreen';
import type { Habit } from './types';

type ViewType = 'tracker' | 'dashboard' | 'reports';

function AppContent() {
  const { habits, isLoading, isViewingFriend, setViewingUser, setCurrentUserId, viewingUserId } = useHabits();
  const { user, isLoading: authLoading, isAuthenticated, isFirebaseEnabled, allUsers } = useAuth();
  
  const [activeView, setActiveView] = useState<ViewType>('tracker');
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);

  // Sync user ID with HabitContext
  useEffect(() => {
    if (user) {
      setCurrentUserId(user.uid);
    } else {
      setCurrentUserId(null);
    }
  }, [user, setCurrentUserId]);

  const handleEditHabit = (habit: Habit) => {
    if (isViewingFriend) return; // Can't edit friend's habits
    setEditingHabit(habit);
    setShowHabitForm(true);
  };

  const handleCloseForm = () => {
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  const handleBackToMyDashboard = () => {
    setViewingUser(null);
  };

  // Get the name of the user being viewed
  const viewingUserName = viewingUserId 
    ? allUsers.find(u => u.uid === viewingUserId)?.displayName || 'User'
    : null;

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🎯</span>
          </div>
          <div className="text-xl font-semibold gradient-text">Loading Habit Diary...</div>
          <div className="text-sm text-slate-400 mt-2">Preparing your dashboard</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header onImport={() => setShowImportModal(true)} />

        <main className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          {/* Friend Viewing Banner */}
          {isViewingFriend && (
            <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="text-amber-200">
                  Viewing <span className="font-semibold">{viewingUserName}'s</span> dashboard (read-only)
                </span>
              </div>
              <button
                onClick={handleBackToMyDashboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-200 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to My Dashboard
              </button>
            </div>
          )}

          {/* Navigation Tabs & Add Button */}
          <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
            {/* View Toggle - Segmented Control */}
            <div className="relative flex bg-slate-800/80 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-slate-700/50 shadow-inner">
              {/* Sliding Background Indicator */}
              <div
                className={`absolute top-1 sm:top-1.5 bottom-1 sm:bottom-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 ease-out ${
                  activeView === 'tracker' 
                    ? 'left-1 sm:left-1.5 w-[calc(33.33%-4px)] sm:w-[calc(33.33%-6px)]' 
                    : activeView === 'dashboard'
                      ? 'left-[calc(33.33%+2px)] sm:left-[calc(33.33%+3px)] w-[calc(33.33%-4px)] sm:w-[calc(33.33%-6px)]'
                      : 'left-[calc(66.66%+2px)] sm:left-[calc(66.66%+3px)] w-[calc(33.33%-4px)] sm:w-[calc(33.33%-6px)]'
                }`}
              />
              
              <button
                onClick={() => setActiveView('tracker')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 min-w-[60px] sm:min-w-[100px] justify-center ${
                  activeView === 'tracker'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Tracker</span>
              </button>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 min-w-[60px] sm:min-w-[100px] justify-center ${
                  activeView === 'dashboard'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Stats</span>
              </button>
              <button
                onClick={() => setActiveView('reports')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 min-w-[60px] sm:min-w-[100px] justify-center ${
                  activeView === 'reports'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileBarChart className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Reports</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Users Button (only when authenticated) */}
              {isFirebaseEnabled && isAuthenticated && (
                <button
                  onClick={() => setShowFriendsPanel(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Users</span>
                  {allUsers.length > 1 && (
                    <span className="bg-violet-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {allUsers.length - 1}
                    </span>
                  )}
                </button>
              )}

              {/* Add Habit Button (hidden when viewing friend) */}
              {!isViewingFriend && (
                <button
                  onClick={() => setShowHabitForm(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95 sm:hover:scale-105"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Habit</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>

          {/* Content based on active view */}
          {habits.length === 0 && !isViewingFriend ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-2xl font-semibold mb-2">Welcome to Habit Diary</h3>
              <p className="text-slate-400 mb-6">Start by adding your first habit to track</p>
              <button
                onClick={() => setShowHabitForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-medium transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Your First Habit
        </button>
            </div>
          ) : habits.length === 0 && isViewingFriend ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-semibold mb-2">No habits yet</h3>
              <p className="text-slate-400">{viewingUserName} hasn't added any habits yet</p>
            </div>
          ) : (
            <>
              {activeView === 'tracker' && (
                <TrackerView onEditHabit={isViewingFriend ? undefined : handleEditHabit} />
              )}
              {activeView === 'dashboard' && <MainDashboard />}
              {activeView === 'reports' && <ReportsView />}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-slate-500">
          <p>Built with 🎯 Habit Diary</p>
        </footer>
      </div>

      {/* Modals */}
      {showHabitForm && !isViewingFriend && (
        <HabitForm habit={editingHabit} onClose={handleCloseForm} />
      )}

      {showImportModal && !isViewingFriend && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {showFriendsPanel && (
        <FriendsPanel onClose={() => setShowFriendsPanel(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <HabitProvider>
        <AppContent />
      </HabitProvider>
    </AuthProvider>
  );
}

export default App;
