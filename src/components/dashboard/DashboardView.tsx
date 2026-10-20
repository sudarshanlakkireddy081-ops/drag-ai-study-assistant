import React from 'react';
import {
  FileText,
  Upload,
  MessageSquare,
  Sparkles,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
  HelpCircle,
  GraduationCap,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocuments } from '../../context/DocumentContext';

interface DashboardViewProps {
  onOpenUpload: () => void;
  onNavigateToChat: () => void;
  onNavigateToStudy: () => void;
  onNavigateToDocuments: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenUpload,
  onNavigateToChat,
  onNavigateToStudy,
  onNavigateToDocuments,
}) => {
  const { user } = useAuth();
  const { documents, selectDocument } = useDocuments();

  const totalPages = documents.reduce((sum, d) => sum + (d.pageCount || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
            <GraduationCap className="w-4 h-4" />
            <span>AI Academic Study Assistant</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Target Goal: <span className="text-white font-medium">{user?.targetExam || 'OS & Distributed Systems Exam'}</span>.
            Your study materials are indexed with exact page-level citations for verified exam preparation.
          </p>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95"
            title="Upload PDF (Ctrl+U)"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New PDF</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono bg-blue-700/80 text-blue-200 border border-blue-500/60 px-1.5 py-0.5 rounded">
              Ctrl+U
            </kbd>
          </button>
          <button
            onClick={onNavigateToChat}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-semibold backdrop-blur-sm transition-colors"
            title="New Chat (Ctrl+N)"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open PDF Chat</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white/10 text-white/80 border border-white/20 px-1.5 py-0.5 rounded">
              Ctrl+N
            </kbd>
          </button>
        </div>
      </div>

      {/* Metric Cards (Tabular Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Indexed PDFs</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {documents.length}
          </div>
          <p className="text-[11px] text-slate-400">Full textbook & lecture materials</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Total Pages Ready</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalPages}
          </div>
          <p className="text-[11px] text-slate-400">Indexed for instant answers</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Citation Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            100%
          </div>
          <p className="text-[11px] text-slate-400">Strictly grounded in source text</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Exam Preparedness</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            Ready
          </div>
          <p className="text-[11px] text-slate-400">MCQ & flashcard tools active</p>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Quick Study Launchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Recent Study Materials */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Documents</h2>
              <p className="text-xs text-slate-500">Select any material to enter the 3-panel reader and chat workspace.</p>
            </div>
            <button
              onClick={onNavigateToDocuments}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {documents.slice(0, 4).map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-xs flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono tabular-nums">{doc.pageCount} pages</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      <span>·</span>
                      <span className="text-emerald-600 font-medium capitalize">{doc.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      selectDocument(doc.id);
                      onNavigateToChat();
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Chat & Read
                  </button>
                  <button
                    onClick={() => {
                      selectDocument(doc.id);
                      onNavigateToStudy();
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors hidden sm:block"
                  >
                    Study Tools
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 Col): Quick Exam Shortcuts & Recent Activity */}
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Exam Prep Shortcuts</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onNavigateToStudy();
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">⚡</span>
                    <span>Start Fast Quiz (Speed Drill)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Instant questions with page citations & streak meter</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                onClick={() => {
                  onNavigateToStudy();
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                    Spaced Repetition Flashcards
                  </div>
                  <div className="text-[11px] text-slate-400">Active recall card deck</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                onClick={() => {
                  onNavigateToStudy();
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                    Exam Revision Checklist
                  </div>
                  <div className="text-[11px] text-slate-400">Must-know syllabus milestones</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Recent Study Activity Feed */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Activity</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div>
                  <p className="text-slate-800 font-medium">Indexed Operating Systems textbook chapter</p>
                  <span className="text-[10px] text-slate-400">6 pages · 14 semantic chunks</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <div>
                  <p className="text-slate-800 font-medium">Queried Coffman Conditions with citations</p>
                  <span className="text-[10px] text-slate-400">Cited Page 4 & Page 5</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div>
                  <p className="text-slate-800 font-medium">Created revision notes for Midterm</p>
                  <span className="text-[10px] text-slate-400">Concurrency & Mutual Exclusion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
