import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, Video, Mic, FolderHeart, 
  BrainCircuit, MessageSquareText, Star, Trash2, Settings, Zap
} from 'lucide-react';

const navItems = [
  { group: 'Workspace', items: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Documents', icon: FileText, path: '/dashboard/documents' },
    { name: 'Videos', icon: Video, path: '/dashboard/videos' },
    { name: 'Audio', icon: Mic, path: '/dashboard/audio' },
  ]},
  { group: 'Knowledge', items: [
    { name: 'Collections', icon: FolderHeart, path: '/dashboard/collections' },
    { name: 'AI Workspace', icon: BrainCircuit, path: '/dashboard/ai' },
    { name: 'Chat Sessions', icon: MessageSquareText, path: '/dashboard/chat' },
    { name: 'Favorites', icon: Star, path: '/dashboard/favorites' },
  ]},
  { group: 'Manage', items: [
    { name: 'Trash', icon: Trash2, path: '/dashboard/trash' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ]}
];

export const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-slate-300 font-sans">
      
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-border glass-panel rounded-none">
        
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-2 text-white">
            <Zap size={22} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" strokeWidth={2.5} />
            <span className="text-lg font-bold font-display tracking-tight">SnapSummary</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar">
          {navItems.map((group, i) => (
            <div key={i}>
              <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3 px-3">
                {group.group}
              </h4>
              <nav className="space-y-1">
                {group.items.map((item, j) => (
                  <NavLink 
                    key={j} 
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative
                      ${isActive 
                        ? 'text-white bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div 
                            layoutId="active-nav-indicator"
                            className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-400' : 'group-hover:text-blue-400 transition-colors'} />
                        <span className="font-medium relative z-10">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* User Profile Area */}
        <div className="h-20 flex items-center px-6 border-t border-border/50">
           <div className="flex items-center gap-3 w-full cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-all">
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-white">JD</span>
             </div>
             <div className="flex flex-col flex-1 overflow-hidden">
               <span className="text-sm font-medium text-white truncate">John Doe</span>
               <span className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">Free Plan</span>
             </div>
           </div>
        </div>

      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background">
        
        {/* Subtle glowing ambient light */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};
