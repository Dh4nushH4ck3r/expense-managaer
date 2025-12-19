import React, { useState, useEffect } from 'react';
import { Settings, Wallet, Truck, CreditCard, LayoutDashboard } from 'lucide-react';
import { AppSettings } from './types';
import ExpensesPage from './pages/Expenses';
import LoansPage from './pages/Loans';
import DeliveryPage from './pages/Delivery';
import SettingsModal from './components/SettingsModal';
import SplashScreen from './components/SplashScreen';

const DEFAULT_SETTINGS: AppSettings = {
  petrolRate: 101.42,
  mileage: 55,
  tankCapacity: 5.25,
  theme: 'system'
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'loans' | 'delivery'>('expenses');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Initialize
  useEffect(() => {
    const initApp = async () => {
      try {
        // Load settings from localStorage
        const storedSettings = localStorage.getItem('localTrackSettings');
        if (storedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        }
        
        // Apply theme
        applyTheme(storedSettings ? JSON.parse(storedSettings).theme : 'system');
        
        // Simulate minimum splash time for branding
        setTimeout(() => setLoading(false), 1500);
      } catch (e) {
        console.error("Failed to initialize app", e);
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const applyTheme = (theme: string) => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('localTrackSettings', JSON.stringify(newSettings));
    applyTheme(newSettings.theme);
  };

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className="flex flex-col h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* Professional Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 bg-gray-50 dark:bg-[#0f172a]"></div>
         {/* Grid Pattern */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
         {/* Subtle Gradient Orb */}
         <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/20 opacity-30 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="flex-none h-16 bg-white/80 dark:bg-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
            L
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">LocalTrack</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
        >
          <Settings size={22} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 scroll-smooth z-10 relative">
        {activeTab === 'expenses' && <ExpensesPage settings={settings} />}
        {activeTab === 'loans' && <LoansPage />}
        {activeTab === 'delivery' && <DeliveryPage settings={settings} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-none h-16 bg-white/90 dark:bg-surface/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-safe safe-area-inset-bottom fixed bottom-0 w-full z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
        <NavButton 
          active={activeTab === 'expenses'} 
          onClick={() => setActiveTab('expenses')} 
          icon={<Wallet size={24} />} 
          label="Expenses" 
        />
        <NavButton 
          active={activeTab === 'loans'} 
          onClick={() => setActiveTab('loans')} 
          icon={<CreditCard size={24} />} 
          label="Loans" 
        />
        <NavButton 
          active={activeTab === 'delivery'} 
          onClick={() => setActiveTab('delivery')} 
          icon={<Truck size={24} />} 
          label="Delivery" 
        />
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          settings={settings} 
          onClose={() => setShowSettings(false)} 
          onSave={updateSettings} 
        />
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
      active ? 'text-primary dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
    }`}
  >
    <div className={`mb-1 transition-transform duration-300 ${active ? 'scale-110 -translate-y-1' : 'scale-100'}`}>{icon}</div>
    <span className={`text-[10px] font-bold tracking-wide transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;