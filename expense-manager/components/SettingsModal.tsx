import React, { useState } from 'react';
import { X, Save, Moon, Sun, Smartphone, Info } from 'lucide-react';
import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ settings, onClose, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-surface">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            Settings
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Delivery Preferences */}
          <section>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Delivery Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Petrol Rate (₹/L)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.petrolRate}
                  onChange={e => setFormData({ ...formData, petrolRate: parseFloat(e.target.value) })}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mileage (km/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.mileage}
                    onChange={e => setFormData({ ...formData, mileage: parseFloat(e.target.value) })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tank Cap (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.tankCapacity}
                    onChange={e => setFormData({ ...formData, tankCapacity: parseFloat(e.target.value) })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Appearance</h3>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setFormData({ ...formData, theme })}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                    formData.theme === theme 
                      ? 'bg-white dark:bg-surface shadow-md text-primary' 
                      : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {theme === 'light' && <Sun size={20} className="mb-1" />}
                  {theme === 'dark' && <Moon size={20} className="mb-1" />}
                  {theme === 'system' && <Smartphone size={20} className="mb-1" />}
                  <span className="text-xs font-medium capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </section>

          {/* About */}
          <section className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
             <div className="flex items-start gap-3">
               <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
               <div>
                 <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-sm">Local Data Only</h4>
                 <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                   All your data is stored locally on this device. Clearing browser data will delete your records.
                 </p>
                 <p className="text-xs text-gray-400 mt-2">v1.0.0</p>
               </div>
             </div>
          </section>
        </form>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-surface">
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-primary hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30"
          >
            <Save size={20} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
