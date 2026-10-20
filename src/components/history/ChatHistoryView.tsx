import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { chatApi } from '../../services/api';
import { ChatSession } from '../../types';
import { useDocuments } from '../../context/DocumentContext';

export const ChatHistoryView: React.FC<{ onResumeChat: () => void }> = ({
  onResumeChat,
}) => {
  const { selectDocument, setActiveSessionId } = useDocuments();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await chatApi.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      try {
        await chatApi.deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.documentTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Chat History
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Review previous academic inquiry sessions, citation logs, and exam Q&A exchanges.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search past conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.map((s) => (
          <div
            key={s.id}
            onClick={() => {
              selectDocument(s.documentId);
              setActiveSessionId(s.id);
              onResumeChat();
            }}
            className="p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-xs flex items-center justify-between gap-4 cursor-pointer group"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {s.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 text-slate-600 font-medium truncate max-w-xs">
                    <FileText className="w-3.5 h-3.5" />
                    {s.documentTitle}
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{s.messageCount} messages</span>
                  <span>·</span>
                  <span className="text-slate-400 font-mono tabular-nums">
                    {new Date(s.updatedAt).toLocaleDateString()} at{' '}
                    {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                <span>Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && !loading && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No chat sessions found</h3>
            <p className="text-xs text-slate-500">Start an AI inquiry session from the PDF Chat tab.</p>
          </div>
        )}
      </div>
    </div>
  );
};
