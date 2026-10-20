import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DocumentProvider, useDocuments } from './context/DocumentContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { PdfChatWorkspace } from './components/chat/PdfChatWorkspace';
import { StudyToolsView } from './components/study/StudyToolsView';
import { DocumentsView } from './components/documents/DocumentsView';
import { ChatHistoryView } from './components/history/ChatHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { UploadModal } from './components/documents/UploadModal';
import { AuthModal } from './components/auth/AuthModal';
import { Command } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);
  const { setSelectedPage, startNewChat } = useDocuments();

  const handleOpenPdfReaderAtPage = (pageNumber?: number) => {
    if (pageNumber) {
      setSelectedPage(pageNumber);
    }
    setActiveTab('chat');
  };

  // Global Keyboard Shortcut Listener (Ctrl+U for Upload, Ctrl+N for New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support both Ctrl (Windows/Linux) and Cmd (macOS)
      const hasModifier = e.ctrlKey || e.metaKey;
      if (!hasModifier) return;

      const key = e.key.toLowerCase();

      if (key === 'u') {
        e.preventDefault();
        setIsUploadOpen(true);
        setShortcutToast('Triggered: Upload PDF (Ctrl+U)');
        setTimeout(() => setShortcutToast(null), 2400);
      } else if (key === 'n') {
        e.preventDefault();
        setActiveTab('chat');
        startNewChat();
        setShortcutToast('Triggered: New Chat (Ctrl+N)');
        setTimeout(() => setShortcutToast(null), 2400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startNewChat]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenUpload={() => setIsUploadOpen(true)}
        />

        {/* Dynamic View Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateToChat={() => setActiveTab('chat')}
              onNavigateToStudy={() => setActiveTab('study')}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}

          {activeTab === 'chat' && (
            <PdfChatWorkspace
              onNavigateToStudy={() => setActiveTab('study')}
            />
          )}

          {activeTab === 'study' && (
            <StudyToolsView
              onOpenPdfReader={handleOpenPdfReaderAtPage}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateToChat={() => setActiveTab('chat')}
              onNavigateToStudy={() => setActiveTab('study')}
            />
          )}

          {activeTab === 'history' && (
            <ChatHistoryView
              onResumeChat={() => setActiveTab('chat')}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Keyboard Shortcut Toast Notification */}
      {shortcutToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <Command className="w-3.5 h-3.5 text-blue-400" />
          <span>{shortcutToast}</span>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => setActiveTab('chat')}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DocumentProvider>
        <AppContent />
      </DocumentProvider>
    </AuthProvider>
  );
}
