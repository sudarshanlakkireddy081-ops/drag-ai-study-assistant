import React from 'react';
import { BookOpen, User as UserIcon, Upload, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocuments } from '../../context/DocumentContext';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenAuth,
  activeTab,
  setActiveTab,
}) => {
  const { user, logout } = useAuth();
  const { selectedDoc } = useDocuments();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between gap-8">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>DrAG</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">AI Study Guide & Document Assistant</p>
          </div>
        </button>

        {/* Selected Document Indicator */}
        {selectedDoc && (
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs text-slate-600">
            <span className="text-slate-400">Active Book:</span>
            <span className="font-medium text-slate-900 truncate max-w-[220px]" title={selectedDoc.title}>
              {selectedDoc.title}
            </span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              ({selectedDoc.pageCount} pages)
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Links (Single-Line) */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'chat' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          PDF Chat & Reader
        </button>
        <button
          onClick={() => setActiveTab('study')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'study' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Study Tools
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'documents' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          My Documents
        </button>
      </nav>

      {/* Zone 3: Primary Action & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 active:scale-95 group"
          title="Upload PDF (Ctrl+U)"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload PDF</span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-blue-100 bg-blue-700/80 border border-blue-500/60 px-1.5 py-0.5 rounded">
            Ctrl+U
          </kbd>
        </button>

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
              title="View Profile & Settings"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
                {user.name.slice(0, 2)}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{user.name}</div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.major || 'Student'}</div>
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
