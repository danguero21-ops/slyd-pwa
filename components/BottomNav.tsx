
import React from 'react';
import { AppView } from '../types';

interface BottomNavProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  unreadCount?: number;
  showMapTab?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView, unreadCount = 0, showMapTab = true }) => {
  const allTabs = [
    { id: 'grid', label: 'Nearby', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'map', label: 'SlyD Map', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'inbox', label: 'Inbox', icon: (
      <div className="relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]"></span>
          </div>
        )}
      </div>
    )},
    { id: 'profile', label: 'Me', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
  ];

  const tabs = showMapTab ? allTabs : allTabs.filter(t => t.id !== 'map');

  return (
    <nav className="h-16 bg-slate-950 border-t border-slate-900 flex justify-around items-center absolute bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/90">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveView(tab.id as AppView)}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative ${
            activeView === tab.id ? 'text-sky-400' : 'text-slate-600'
          }`}
        >
          {tab.icon}
          {activeView === tab.id && (
            <div className="absolute top-0 w-8 h-1 bg-sky-400 rounded-b-full shadow-[0_0_12px_#38bdf8]" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
