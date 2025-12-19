import React from 'react';
import { Activity } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-background z-50 transition-colors duration-500">
      <div className="relative">
        <div className="w-20 h-20 bg-primary rounded-2xl shadow-xl flex items-center justify-center animate-bounce">
          <Activity size={40} className="text-white" />
        </div>
        <div className="absolute -bottom-4 left-0 right-0 h-2 bg-black/10 rounded-full blur-sm animate-pulse mx-auto w-12"></div>
      </div>
      <h1 className="mt-8 text-3xl font-bold text-gray-800 dark:text-white tracking-wider">LocalTrack</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">Secure. Local. Fast.</p>
    </div>
  );
};

export default SplashScreen;
