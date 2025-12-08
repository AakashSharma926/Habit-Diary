import { useState } from 'react';
import { Plus, CalendarCheck, PieChart } from 'lucide-react';
import { HabitProvider, useHabits } from './context/HabitContext';
import { Header } from './components/Header';
import { HabitForm } from './components/HabitForm';
import { ImportModal } from './components/ImportModal';
import { MainDashboard } from './components/MainDashboard';
import { TrackerView } from './components/TrackerView';
import type { Habit } from './types';

type ViewType = 'tracker' | 'dashboard';

function AppContent() {
  const { habits, isLoading } = useHabits();
  const [activeView, setActiveView] = useState<ViewType>('tracker');
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setShowHabitForm(true);
  };

  const handleCloseForm = () => {
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  if (isLoading) {
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
          {/* Navigation Tabs & Add Button */}
          <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
            {/* View Toggle - Segmented Control */}
            <div className="relative flex bg-slate-800/80 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-slate-700/50 shadow-inner">
              {/* Sliding Background Indicator */}
              <div
                className={`absolute top-1 sm:top-1.5 bottom-1 sm:bottom-1.5 w-[calc(50%-4px)] sm:w-[calc(50%-6px)] bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 ease-out ${
                  activeView === 'dashboard' ? 'left-[calc(50%+2px)] sm:left-[calc(50%+3px)]' : 'left-1 sm:left-1.5'
                }`}
              />
              
              <button
                onClick={() => setActiveView('tracker')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 min-w-[80px] sm:min-w-[130px] justify-center ${
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
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 min-w-[80px] sm:min-w-[130px] justify-center ${
                  activeView === 'dashboard'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Stats</span>
              </button>
            </div>

            {/* Add Habit Button */}
            <button
              onClick={() => setShowHabitForm(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95 sm:hover:scale-105"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Habit</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Content based on active view */}
          {habits.length === 0 ? (
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
          ) : (
            <>
              {activeView === 'tracker' ? (
                <TrackerView onEditHabit={handleEditHabit} />
              ) : (
                <MainDashboard />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-slate-500">
          <p>Built with 🎯 Habit Diary</p>
        </footer>
      </div>

      {/* Modals */}
      {showHabitForm && (
        <HabitForm habit={editingHabit} onClose={handleCloseForm} />
      )}

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <HabitProvider>
      <AppContent />
    </HabitProvider>
  );
}

export default App;
