import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Search,
  BookOpen,
  HelpCircle,
  Brain,
  RotateCcw,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Zap,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { chatApi } from '../../services/api';
import { ChatMessage, ChatSession } from '../../types';

export const PdfChatWorkspace: React.FC<{ onNavigateToStudy: () => void }> = ({
  onNavigateToStudy,
}) => {
  const {
    documents,
    selectedDoc,
    selectedPage,
    highlightExcerpt,
    activeSessionId,
    newChatTrigger,
    startNewChat,
    selectDocument,
    setSelectedPage,
    jumpToCitation,
  } = useDocuments();

  // Panels & View states
  const [showDocNav, setShowDocNav] = useState(true);
  const [activeMobileView, setActiveMobileView] = useState<'reader' | 'chat'>('chat');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [pageSearchQuery, setPageSearchQuery] = useState<string>('');

  // Chat State
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readerContentRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Initialize or fetch chat session for current document
  useEffect(() => {
    if (!selectedDoc) return;

    const initChat = async () => {
      try {
        const sessions = await chatApi.getSessions(selectedDoc.id);
        let targetSession: ChatSession | undefined;

        if (activeSessionId) {
          targetSession = sessions.find((s) => s.id === activeSessionId);
        }
        if (!targetSession && sessions.length > 0) {
          targetSession = sessions[0];
        }

        if (targetSession) {
          setSession(targetSession);
          const msgs = await chatApi.getMessages(targetSession.id);
          if (msgs.length === 0) {
            setMessages([
              {
                id: 'init-msg',
                sessionId: targetSession.id,
                role: 'assistant',
                content: `New study chat started for **${selectedDoc.title}** (Page 1-${selectedDoc.pageCount}).\n\nAsk any question, request exam summaries, or explore difficult concepts with page-level citations!`,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else {
            setMessages(msgs);
          }
        } else {
          const newSession = await chatApi.createSession(
            selectedDoc.id,
            `Study: ${selectedDoc.title.slice(0, 30)}`
          );
          setSession(newSession);
          // Pre-populate with welcome message
          setMessages([
            {
              id: 'init-msg',
              sessionId: newSession.id,
              role: 'assistant',
              content: `Hello! I am **DrAG**, your AI Study Assistant. I have indexed all **${selectedDoc.pageCount} pages** of **${selectedDoc.title}**.

You can ask me to:
- Summarize any topic or chapter
- Explain difficult concepts in simple English
- Extract high-probability exam questions
- Compare algorithms or theories

Every answer will include clickable **[Page X] citations** that jump directly to the source text in the reader.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Auto focus input when switching/starting chat
        setTimeout(() => {
          chatInputRef.current?.focus();
        }, 120);
      } catch (err) {
        console.error('Failed to init chat session:', err);
      }
    };

    initChat();
  }, [selectedDoc, activeSessionId, newChatTrigger]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingAnswer]);

  // Scroll reader to top when page changes
  useEffect(() => {
    readerContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPage]);

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const query = customPrompt || inputText;
    if (!query.trim() || !session || loadingAnswer) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sessionId: session.id,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    const streamingId = `ast-${Date.now()}`;
    const streamingPlaceholder: ChatMessage = {
      id: streamingId,
      sessionId: session.id,
      role: 'assistant',
      content: '',
      citations: [],
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, streamingPlaceholder]);
    setInputText('');
    setLoadingAnswer(true);

    try {
      await chatApi.sendMessageStream(
        session.id,
        query.trim(),
        (chunkText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: m.content + chunkText } : m
            )
          );
        },
        (citations) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, citations } : m
            )
          );
        },
        (finalMessage) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamingId ? { ...finalMessage, isStreaming: false } : m))
          );
          setLoadingAnswer(false);
        }
      );
    } catch (err) {
      console.warn('Streaming failed, falling back to direct API call:', err);
      try {
        const directMsg = await chatApi.sendMessage(session.id, query.trim());
        setMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? directMsg : m))
        );
      } catch (directErr) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  content: 'Sorry, I encountered an issue retrieving passages from this document. Please check your network or try rephrasing.',
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setLoadingAnswer(false);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!selectedDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-[600px]">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Document Selected</h2>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          Select a document from your library or upload a syllabus, lecture notes, or textbook PDF to begin AI-powered study.
        </p>
        <div className="flex gap-3">
          {documents.length > 0 && (
            <button
              onClick={() => selectDocument(documents[0].id)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Load Sample Textbook ({documents[0].title.slice(0, 24)}...)
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentPageData = selectedDoc.pages?.find((p) => p.pageNumber === selectedPage);

  // Suggested prompt chips for student exam prep
  const suggestedPrompts = [
    'Explain the 4 Coffman deadlock conditions [Page 4]',
    'Summarize Mutual Exclusion vs Semaphores',
    "How does Dijkstra's Banker's Algorithm ensure safety?",
    'Compare FIFO vs LRU page replacement',
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* Mobile Top Toggle (Reader vs Chat) */}
      <div className="lg:hidden flex items-center justify-between p-2.5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full">
          <button
            onClick={() => setActiveMobileView('reader')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeMobileView === 'reader' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            PDF Reader (p.{selectedPage})
          </button>
          <button
            onClick={() => setActiveMobileView('chat')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeMobileView === 'chat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            AI Study Chat
          </button>
        </div>
      </div>

      {/* Main 3-Panel Grid Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Document Navigation & Page Index */}
        <div
          className={`${
            showDocNav ? 'w-64' : 'w-0'
          } border-r border-slate-200 bg-white transition-all duration-200 flex flex-col overflow-hidden hidden xl:flex shrink-0`}
        >
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-blue-600" />
              <span>Table of Contents</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              {selectedDoc.pageCount} pgs
            </span>
          </div>

          {/* Quick Page Search Filter */}
          <div className="p-2.5 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search topics..."
                value={pageSearchQuery}
                onChange={(e) => setPageSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Page Thumbnails & Headings List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {selectedDoc.pages
              ?.filter((p) => {
                if (!pageSearchQuery) return true;
                return (
                  p.text.toLowerCase().includes(pageSearchQuery.toLowerCase()) ||
                  p.sectionTitle?.toLowerCase().includes(pageSearchQuery.toLowerCase())
                );
              })
              .map((page) => {
                const isActive = page.pageNumber === selectedPage;
                return (
                  <button
                    key={page.pageNumber}
                    onClick={() => setSelectedPage(page.pageNumber)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900">
                        Page {page.pageNumber}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded">
                          Viewing
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {page.sectionTitle || page.text.slice(0, 90) + '...'}
                    </p>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Center Panel: Built-in PDF Reader */}
        <div
          className={`flex-1 flex flex-col bg-slate-100 overflow-hidden ${
            activeMobileView === 'reader' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Reader Toolbar */}
          <div className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDocNav(!showDocNav)}
                className="hidden xl:flex p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                title="Toggle Table of Contents"
              >
                {showDocNav ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </button>
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[280px]">
                {selectedDoc.title}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedPage(Math.max(1, selectedPage - 1))}
                disabled={selectedPage <= 1}
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent hover:bg-slate-100 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-700 px-2">
                <span className="font-semibold">{selectedPage}</span>
                <span className="text-slate-400">/</span>
                <span>{selectedDoc.pageCount}</span>
              </div>
              <button
                onClick={() => setSelectedPage(Math.min(selectedDoc.pageCount, selectedPage + 1))}
                disabled={selectedPage >= selectedDoc.pageCount}
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent hover:bg-slate-100 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 px-1">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 text-xs ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onNavigateToStudy}
                className="ml-2 hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Launch Fast Quiz on this document"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>⚡ Fast Quiz</span>
              </button>
            </div>
          </div>

          {/* PDF Page Canvas Sheet */}
          <div
            ref={readerContentRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start"
          >
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-3xl bg-white rounded-xl shadow-md border border-slate-200 min-h-[750px] p-8 md:p-12 transition-transform duration-150 flex flex-col justify-between"
            >
              {/* Document Header inside Page Sheet */}
              <div>
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 text-xs text-slate-400">
                  <span className="font-medium text-slate-600 truncate max-w-sm">
                    {selectedDoc.title}
                  </span>
                  <span className="font-mono tabular-nums">Page {selectedPage} of {selectedDoc.pageCount}</span>
                </div>

                {/* Section Title if present */}
                {currentPageData?.sectionTitle && (
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                    {currentPageData.sectionTitle}
                  </h3>
                )}

                {/* Highlight banner if user arrived via citation */}
                {highlightExcerpt && (
                  <div className="mb-6 p-3.5 bg-blue-50/90 border border-blue-200 rounded-lg text-xs text-blue-900 animate-pulse flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-blue-900 mb-0.5">Cited Passage Highlighted:</div>
                      <p className="italic text-blue-800 leading-relaxed font-serif">
                        "{highlightExcerpt.slice(0, 180)}..."
                      </p>
                    </div>
                  </div>
                )}

                {/* Page Content with paragraph rendering & citation matching */}
                <div className="prose prose-slate max-w-none text-slate-800 text-sm md:text-base leading-relaxed space-y-4">
                  {currentPageData ? (
                    currentPageData.text.split('\n\n').map((paragraph, idx) => {
                      const isHighlighted =
                        highlightExcerpt &&
                        (paragraph.toLowerCase().includes(highlightExcerpt.toLowerCase().slice(0, 40)) ||
                          highlightExcerpt.toLowerCase().includes(paragraph.toLowerCase().slice(0, 40)));

                      return (
                        <p
                          key={idx}
                          className={`transition-colors rounded-md p-2 -mx-2 ${
                            isHighlighted
                              ? 'bg-amber-100/80 text-amber-950 font-medium border-l-4 border-amber-500'
                              : 'text-slate-800'
                          }`}
                        >
                          {paragraph}
                        </p>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 text-slate-400">
                      Page content not available.
                    </div>
                  )}
                </div>
              </div>

              {/* Sheet Bottom Footer */}
              <div className="pt-8 mt-12 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Document Viewer</span>
                <span>Page {selectedPage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: AI PDF Chat & Citations */}
        <div
          className={`w-full lg:w-[460px] xl:w-[480px] border-l border-slate-200 bg-white flex flex-col shrink-0 ${
            activeMobileView === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Chat Header */}
          <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">DrAG AI Tutor</span>
                <span className="text-[11px] text-slate-500 ml-2">Grounding: On</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startNewChat()}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                title="New Chat (Ctrl+N)"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>New Chat</span>
                <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-1 py-0.2 rounded">
                  Ctrl+N
                </kbd>
              </button>

              <button
                onClick={onNavigateToStudy}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors pl-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Study Tools</span>
              </button>
            </div>
          </div>

          {/* Messages Stream Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl p-3.5 text-xs md:text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-white border border-slate-200 text-slate-900 shadow-xs'
                        : 'bg-blue-600 text-white font-medium'
                    }`}
                  >
                    {/* Render Content */}
                    <div className="whitespace-pre-wrap space-y-2">
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-pulse ml-0.5 align-middle rounded-xs" />
                      )}
                    </div>

                    {/* Citations Box for Assistant messages */}
                    {isAssistant && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-blue-600" />
                            <span>Direct Page Citations (Click to View):</span>
                          </div>
                          {msg.generationTimeMs && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-semibold">
                              <Zap className="w-2.5 h-2.5 text-emerald-500" />
                              {msg.generationTimeMs < 1000
                                ? `${msg.generationTimeMs}ms`
                                : `${(msg.generationTimeMs / 1000).toFixed(1)}s`}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((citation, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => {
                                jumpToCitation(citation.pageNumber, citation.excerpt);
                                setActiveMobileView('reader');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[11px] font-medium transition-colors text-left"
                              title={`Jump to Page ${citation.pageNumber}`}
                            >
                              <span className="font-semibold">Page {citation.pageNumber}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Action Footer */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isAssistant && msg.generationTimeMs && !msg.citations?.length && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-emerald-600 font-semibold">
                        <Zap className="w-2.5 h-2.5" />
                        {msg.generationTimeMs < 1000 ? `${msg.generationTimeMs}ms` : `${(msg.generationTimeMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                    {isAssistant && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-slate-600 flex items-center gap-1"
                        title="Copy Answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loadingAnswer && (
              <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Zap className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>Instant Vector & BM25 Retrieval Active</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Extracting page citations & synthesizing grounded response (&lt; 50ms initial tokens)...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips */}
          <div className="p-2 border-t border-slate-100 bg-white">
            <div className="text-[10px] font-semibold text-slate-400 px-1 mb-1">
              Suggested Questions:
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {suggestedPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(undefined, chip)}
                  className="px-2.5 py-1 text-[11px] bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-600 rounded-md whitespace-nowrap transition-colors shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
          >
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Ask anything about this document... (Press Enter to send)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loadingAnswer}
              className="flex-1 px-3.5 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loadingAnswer}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-transform active:scale-95"
              title="Send Question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
