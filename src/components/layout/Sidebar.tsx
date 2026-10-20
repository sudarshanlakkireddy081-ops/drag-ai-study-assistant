import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  GraduationCap,
  Files,
  History,
  Settings,
  Plus,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUpload: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
}) => {
  const { documents, selectedDoc, selectDocument } = useDocuments();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'PDF Chat & Reader', icon: MessageSquare },
    { id: 'study', label: 'AI Study Tools', icon: GraduationCap },
    { id: 'documents', label: 'My Documents', icon: Files },
    { id: 'history', label: 'Chat History', icon: History },
    { id: 'settings', label: 'Settings & Profile', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 hidden md:flex">
      {/* Top Section: Main Navigation */}
      <div className="p-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Workspace
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Documents List */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Study Library
            </span>
            <button
              onClick={onOpenUpload}
              className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded hover:bg-slate-100"
              title="Upload New PDF"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {documents.slice(0, 5).map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    selectDocument(doc.id);
                    setActiveTab('chat');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left group ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="truncate flex-1">{doc.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
                    p.{doc.pageCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Quick Pro Action & Quick Tip */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 m-3 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Instant Page Citations</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
          Every AI response links directly to exact textbook page passages for verifiable exam study.
        </p>
        <button
          onClick={() => setActiveTab('study')}
          className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors text-center shadow-xs"
        >
          Open Exam Tools
        </button>

        {/* Global Shortcuts Reference */}
        <div className="pt-2.5 mt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Shortcuts:</span>
          <div className="flex items-center gap-2">
            <span title="Upload PDF (Ctrl+U)"><kbd className="bg-white px-1 py-0.5 rounded border border-slate-200 font-semibold">^U</kbd> Upload</span>
            <span title="New Chat (Ctrl+N)"><kbd className="bg-white px-1 py-0.5 rounded border border-slate-200 font-semibold">^N</kbd> Chat</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
