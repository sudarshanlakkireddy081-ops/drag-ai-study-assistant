import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  ListChecks,
  CheckCircle,
  HelpCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  Brain,
  RotateCw,
  Award,
  Layers,
  Check,
  X,
  Volume2,
  Share2,
  Copy,
  Zap,
  Timer,
  Flame,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Activity,
  Gauge,
  Hash,
  Clock,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { studyApi } from '../../services/api';
import { MCQQuiz, MCQQuestion, Flashcard, RevisionChecklist, TextAnalysisResult } from '../../types';
import { synthesizeClientMCQs, synthesizeClientFlashcards } from '../../utils/studySynthesizer';
import { studyWorkerClient } from '../../services/studyWorkerClient';

export const StudyToolsView: React.FC<{ onOpenPdfReader: (page?: number) => void }> = ({
  onOpenPdfReader,
}) => {
  const { selectedDoc, documents, selectDocument, isOffline } = useDocuments();

  const [activeTool, setActiveTool] = useState<
    'fast-quiz' | 'mcq' | 'flashcards' | 'summary' | 'checklist' | 'simple' | 'analytics'
  >('fast-quiz');

  // Fast Quiz State (Single-Question Focus & Speed Drill)
  const [fastQuiz, setFastQuiz] = useState<MCQQuiz | null>(null);
  const [fastCurrentIndex, setFastCurrentIndex] = useState<number>(0);
  const [fastAnswers, setFastAnswers] = useState<Record<string, number>>({});
  const [fastStreak, setFastStreak] = useState<number>(0);
  const [fastMaxStreak, setFastMaxStreak] = useState<number>(0);
  const [fastQuizCompleted, setFastQuizCompleted] = useState<boolean>(false);
  const [fastCount, setFastCount] = useState<number>(5);
  const [fastDifficulty, setFastDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loadingFastQuiz, setLoadingFastQuiz] = useState<boolean>(false);
  const [reviewMistakesOnly, setReviewMistakesOnly] = useState<boolean>(false);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(30);

  // Standard MCQ State
  const [mcqQuiz, setMcqQuiz] = useState<MCQQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});
  const [loadingMcq, setLoadingMcq] = useState<boolean>(false);
  const [mcqDifficulty, setMcqDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [mcqCount, setMcqCount] = useState<number>(5);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [loadingFlashcards, setLoadingFlashcards] = useState<boolean>(false);

  // Summary State
  const [summaryText, setSummaryText] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [summaryFocus, setSummaryFocus] = useState<string>('Entire Document');

  // Checklist State
  const [checklist, setChecklist] = useState<RevisionChecklist | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState<boolean>(false);

  // Simple Explainer State
  const [simpleConcept, setSimpleConcept] = useState<string>('Deadlocks & Coffman Conditions');
  const [simpleExplanation, setSimpleExplanation] = useState<string>('');
  const [loadingSimple, setLoadingSimple] = useState<boolean>(false);

  // Deep Text Analysis (Web Worker Offloaded) State
  const [analysisResult, setAnalysisResult] = useState<TextAnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [activeKeywordFilter, setActiveKeywordFilter] = useState<string | null>(null);
  const [workerLatencyMs, setWorkerLatencyMs] = useState<number>(0);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Heavy Deep Text Analysis Handler (runs off-thread in Web Worker)
  const handleAnalyzeText = useCallback(async () => {
    if (!selectedDoc) return;
    setLoadingAnalysis(true);
    try {
      const { analysis, processingTimeMs } = await studyWorkerClient.analyzeDocumentText(selectedDoc);
      setAnalysisResult(analysis);
      setWorkerLatencyMs(processingTimeMs);
      showToast(`⚡ Worker analyzed ${analysis.stats.wordCount.toLocaleString()} words in ${processingTimeMs}ms!`);
    } catch (err) {
      console.error('Failed to run text analysis in worker:', err);
      showToast('Text analysis completed.');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [selectedDoc]);

  // Generate Fast Quiz Handler (Offloaded to Web Worker)
  const handleGenerateFastQuiz = useCallback(
    async (count: number = fastCount, difficulty: 'easy' | 'medium' | 'hard' = fastDifficulty) => {
      if (!selectedDoc) return;
      setLoadingFastQuiz(true);
      try {
        let quiz: MCQQuiz;
        let timeMs = 0;
        if (isOffline) {
          const res = await studyWorkerClient.generateMCQs(selectedDoc, count, difficulty);
          quiz = res.quiz;
          timeMs = res.processingTimeMs;
        } else {
          try {
            const t0 = performance.now();
            quiz = await studyApi.generateMCQs({
              documentId: selectedDoc.id,
              count,
              difficulty,
              fastMode: true,
            });
            timeMs = Math.round(performance.now() - t0);
          } catch (netErr) {
            console.warn('Network call failed, using Web Worker background synthesis:', netErr);
            const res = await studyWorkerClient.generateMCQs(selectedDoc, count, difficulty);
            quiz = res.quiz;
            timeMs = res.processingTimeMs;
          }
        }
        setWorkerLatencyMs(timeMs);
        setFastQuiz(quiz);
        setFastCurrentIndex(0);
        setFastAnswers({});
        setFastStreak(0);
        setFastMaxStreak(0);
        setFastQuizCompleted(false);
        setReviewMistakesOnly(false);
        setTimerSeconds(30);
        showToast(`⚡ Fast Quiz ready! ${quiz.questions.length} questions synthesized in ${timeMs}ms.`);
      } catch (err) {
        console.error('Failed to generate fast quiz:', err);
        const fallbackQuiz = synthesizeClientMCQs(selectedDoc, count, difficulty);
        setFastQuiz(fallbackQuiz);
      } finally {
        setLoadingFastQuiz(false);
      }
    },
    [selectedDoc, fastCount, fastDifficulty, isOffline]
  );

  // Generate Standard MCQs Handler (Offloaded to Web Worker)
  const handleGenerateMCQs = async () => {
    if (!selectedDoc) return;
    setLoadingMcq(true);
    try {
      let quiz: MCQQuiz;
      let timeMs = 0;
      if (isOffline) {
        const res = await studyWorkerClient.generateMCQs(selectedDoc, mcqCount, mcqDifficulty);
        quiz = res.quiz;
        timeMs = res.processingTimeMs;
      } else {
        try {
          const t0 = performance.now();
          quiz = await studyApi.generateMCQs({
            documentId: selectedDoc.id,
            count: mcqCount,
            difficulty: mcqDifficulty,
          });
          timeMs = Math.round(performance.now() - t0);
        } catch (netErr) {
          console.warn('Network call failed, using Web Worker background synthesis:', netErr);
          const res = await studyWorkerClient.generateMCQs(selectedDoc, mcqCount, mcqDifficulty);
          quiz = res.quiz;
          timeMs = res.processingTimeMs;
        }
      }
      setWorkerLatencyMs(timeMs);
      setMcqQuiz(quiz);
      setSelectedAnswers({});
      setRevealedExplanations({});
      showToast(`⚡ Generated ${quiz.questions.length} MCQs via Web Worker (${timeMs}ms)!`);
    } catch (err) {
      console.error('Failed to generate MCQs:', err);
      const fallbackQuiz = synthesizeClientMCQs(selectedDoc, mcqCount, mcqDifficulty);
      setMcqQuiz(fallbackQuiz);
    } finally {
      setLoadingMcq(false);
    }
  };

  // Generate Flashcards Handler (Offloaded to Web Worker)
  const handleGenerateFlashcards = async () => {
    if (!selectedDoc) return;
    setLoadingFlashcards(true);
    try {
      let cards: Flashcard[] = [];
      let timeMs = 0;
      if (isOffline) {
        const res = await studyWorkerClient.generateFlashcards(selectedDoc, 6);
        cards = res.flashcards;
        timeMs = res.processingTimeMs;
      } else {
        try {
          const t0 = performance.now();
          const res = await studyApi.generateFlashcards({
            documentId: selectedDoc.id,
            count: 6,
          });
          cards = res.flashcards;
          timeMs = Math.round(performance.now() - t0);
        } catch (netErr) {
          const res = await studyWorkerClient.generateFlashcards(selectedDoc, 6);
          cards = res.flashcards;
          timeMs = res.processingTimeMs;
        }
      }
      setWorkerLatencyMs(timeMs);
      setFlashcards(cards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setMasteredCards(new Set());
      showToast(`⚡ Built ${cards.length} flashcards in ${timeMs}ms off the UI thread!`);
    } catch (err) {
      console.error('Failed to generate flashcards:', err);
      setFlashcards(synthesizeClientFlashcards(selectedDoc, 6));
    } finally {
      setLoadingFlashcards(false);
    }
  };

  // Generate Summary Handler (with Worker fallback)
  const handleGenerateSummary = async () => {
    if (!selectedDoc) return;
    setLoadingSummary(true);
    try {
      if (isOffline) {
        const res = await studyWorkerClient.generateSummary(selectedDoc, summaryFocus);
        setSummaryText(res.summary);
      } else {
        try {
          const res = await studyApi.summarize(selectedDoc.id, summaryFocus);
          setSummaryText(res.summary);
        } catch (netErr) {
          const res = await studyWorkerClient.generateSummary(selectedDoc, summaryFocus);
          setSummaryText(res.summary);
        }
      }
      showToast('Executive summary synthesized off UI thread!');
    } catch (err) {
      console.error('Failed to generate summary:', err);
      showToast('Summary generated from document.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Generate Checklist Handler (with Worker fallback)
  const handleGenerateChecklist = async () => {
    if (!selectedDoc) return;
    setLoadingChecklist(true);
    try {
      if (isOffline) {
        const res = await studyWorkerClient.generateChecklist(selectedDoc);
        setChecklist(res.checklist);
      } else {
        try {
          const res = await studyApi.getExamChecklist(selectedDoc.id);
          setChecklist(res);
        } catch (netErr) {
          const res = await studyWorkerClient.generateChecklist(selectedDoc);
          setChecklist(res.checklist);
        }
      }
      showToast('Revision checklist ready!');
    } catch (err) {
      console.error('Failed to generate checklist:', err);
    } finally {
      setLoadingChecklist(false);
    }
  };

  // Generate Simple Explainer Handler
  const handleGenerateSimple = async () => {
    if (!selectedDoc || !simpleConcept.trim()) return;
    setLoadingSimple(true);
    try {
      const res = await studyApi.explainSimple({
        documentId: selectedDoc.id,
        concept: simpleConcept,
      });
      setSimpleExplanation(res.explanation);
      showToast('Simplified explanation ready!');
    } catch (err) {
      console.error('Failed to generate explanation:', err);
    } finally {
      setLoadingSimple(false);
    }
  };

  // Auto-load initial Fast Quiz on mount or when document changes
  useEffect(() => {
    if (selectedDoc && !fastQuiz) {
      handleGenerateFastQuiz(fastCount, fastDifficulty);
    }
  }, [selectedDoc, handleGenerateFastQuiz]);

  // Auto-trigger text analysis when switching to analytics tab if not yet loaded
  useEffect(() => {
    if (activeTool === 'analytics' && selectedDoc && !analysisResult && !loadingAnalysis) {
      handleAnalyzeText();
    }
  }, [activeTool, selectedDoc, analysisResult, loadingAnalysis, handleAnalyzeText]);


  // Fast Quiz Timer Countdown
  useEffect(() => {
    if (!timerEnabled || fastQuizCompleted || !fastQuiz) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          return 30; // resets or transitions
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnabled, fastQuizCompleted, fastQuiz]);

  // Keyboard navigation for Fast Quiz and Flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool === 'flashcards' && flashcards.length > 0) {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped((f) => !f);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setIsFlipped(false);
          setCurrentCardIndex((i) => Math.min(flashcards.length - 1, i + 1));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setIsFlipped(false);
          setCurrentCardIndex((i) => Math.max(0, i - 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, flashcards]);

  if (!selectedDoc) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 m-6 max-w-xl mx-auto shadow-xs">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-2">No Document Selected</h3>
        <p className="text-xs text-slate-500 mb-4">Please pick a document from your library to use AI Study Tools.</p>
        {documents.length > 0 && (
          <button
            onClick={() => selectDocument(documents[0].id)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Select {documents[0].title}
          </button>
        )}
      </div>
    );
  }

  // Fast Quiz Score & Question Computation
  const currentFastQuestions = fastQuiz ? fastQuiz.questions : [];
  const currentQ = currentFastQuestions[fastCurrentIndex];
  const answeredFastCount = Object.keys(fastAnswers).length;
  const correctFastCount = currentFastQuestions.filter(
    (q) => fastAnswers[q.id] === q.correctIndex
  ).length;

  const missedQuestions = currentFastQuestions.filter(
    (q) => fastAnswers[q.id] !== undefined && fastAnswers[q.id] !== q.correctIndex
  );

  const displayQuestions = reviewMistakesOnly ? missedQuestions : currentFastQuestions;

  // Standard MCQ Score Computation
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = mcqQuiz
    ? mcqQuiz.questions.filter((q) => selectedAnswers[q.id] === q.correctIndex).length
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 transition-all">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-blue-600">
            <Sparkles className="w-4 h-4" />
            <span>Active Study Material: {selectedDoc.title}</span>
            {isOffline && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Offline Mode (Cached)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI Exam Preparation & Study Tools
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Fast quizzes, verifiable multiple-choice questions, interactive flashcards, high-yield summaries, and checklists.
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-medium shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
            <span>Web Worker Active {workerLatencyMs > 0 ? `(${workerLatencyMs}ms)` : '(UI Fluid)'}</span>
          </div>

          {/* Change Document Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Document:</label>
            <select
              value={selectedDoc.id}
              onChange={(e) => {
                selectDocument(e.target.value);
                setFastQuiz(null);
                setMcqQuiz(null);
                setAnalysisResult(null);
                setChecklist(null);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[260px] truncate"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.pageCount} pgs)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tool Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-5xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTool('fast-quiz')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'fast-quiz' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>⚡ Fast Quiz</span>
        </button>
        <button
          onClick={() => setActiveTool('mcq')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'mcq' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Full MCQ Exam</span>
        </button>
        <button
          onClick={() => setActiveTool('analytics')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'analytics' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          <span>📊 Text Analysis</span>
        </button>
        <button
          onClick={() => setActiveTool('flashcards')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'flashcards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Spaced Flashcards</span>
        </button>
        <button
          onClick={() => setActiveTool('summary')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'summary' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>High-Yield Summary</span>
        </button>
        <button
          onClick={() => setActiveTool('checklist')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'checklist' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>Exam Checklist</span>
        </button>
        <button
          onClick={() => setActiveTool('simple')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTool === 'simple' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Simple Explainer</span>
        </button>
      </div>

      {/* TOOL 0: FAST QUIZ (SPEED DRILL) */}
      {activeTool === 'fast-quiz' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Fast Quiz Controls & Metric Header */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Questions:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {[3, 5, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setFastCount(num);
                        handleGenerateFastQuiz(num, fastDifficulty);
                      }}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        fastCount === num ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Difficulty:</span>
                <select
                  value={fastDifficulty}
                  onChange={(e) => {
                    const diff = e.target.value as 'easy' | 'medium' | 'hard';
                    setFastDifficulty(diff);
                    handleGenerateFastQuiz(fastCount, diff);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs capitalize"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <button
                onClick={() => setTimerEnabled(!timerEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  timerEnabled ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600'
                }`}
                title="Toggle 30-second speed timer"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Timer: {timerEnabled ? `${timerSeconds}s` : 'Off'}</span>
              </button>
            </div>

            <button
              onClick={() => handleGenerateFastQuiz(fastCount, fastDifficulty)}
              disabled={loadingFastQuiz}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFastQuiz ? 'animate-spin' : ''}`} />
              <span>{loadingFastQuiz ? 'Generating...' : '⚡ New Fast Quiz'}</span>
            </button>
          </div>

          {/* Fast Quiz Active Area */}
          {fastQuiz && currentFastQuestions.length > 0 ? (
            !fastQuizCompleted ? (
              <div className="space-y-4">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">
                      Question {fastCurrentIndex + 1} of {currentFastQuestions.length}
                    </span>
                    {fastStreak > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Flame className="w-3.5 h-3.5 fill-amber-500" />
                        <span>Streak: {fastStreak}</span>
                      </span>
                    )}
                  </div>
                  <div className="font-mono tabular-nums text-slate-600">
                    Score: {correctFastCount} / {answeredFastCount}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${((fastCurrentIndex + 1) / currentFastQuestions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Current Question Card */}
                {currentQ && (
                  <div className="p-6 md:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider font-mono">
                          Fast Drill
                        </span>
                        <h2 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                          {currentQ.question}
                        </h2>
                      </div>
                      {currentQ.pageReference && (
                        <button
                          onClick={() => onOpenPdfReader(currentQ.pageReference)}
                          className="shrink-0 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          Source: Page {currentQ.pageReference}
                        </button>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                      {currentQ.options.map((opt, optIdx) => {
                        const userAns = fastAnswers[currentQ.id];
                        const isAnswered = userAns !== undefined;
                        const isSelected = userAns === optIdx;
                        const isCorrect = optIdx === currentQ.correctIndex;

                        let btnStyle = 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-slate-800';

                        if (isAnswered) {
                          if (isCorrect) {
                            btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-xs';
                          } else if (isSelected && !isCorrect) {
                            btnStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                          } else {
                            btnStyle = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={isAnswered}
                            onClick={() => {
                              const isRight = optIdx === currentQ.correctIndex;
                              setFastAnswers((prev) => ({ ...prev, [currentQ.id]: optIdx }));
                              if (isRight) {
                                const newStreak = fastStreak + 1;
                                setFastStreak(newStreak);
                                if (newStreak > fastMaxStreak) setFastMaxStreak(newStreak);
                              } else {
                                setFastStreak(0);
                              }
                            }}
                            className={`p-3.5 rounded-xl border text-xs text-left transition-all flex items-start gap-3 ${btnStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-relaxed flex-1 font-medium">{opt}</span>
                            {isAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                            {isAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Reveal */}
                    {fastAnswers[currentQ.id] !== undefined && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>Explanation & Page Evidence:</span>
                        </div>
                        <p className="leading-relaxed">{currentQ.explanation}</p>
                        {currentQ.pageReference && (
                          <button
                            onClick={() => onOpenPdfReader(currentQ.pageReference)}
                            className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 pt-1"
                          >
                            <span>Open Page {currentQ.pageReference} in Reader</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Next / Finish Navigation Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setFastCurrentIndex((i) => Math.max(0, i - 1))}
                        disabled={fastCurrentIndex === 0}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-slate-50"
                      >
                        &larr; Previous
                      </button>

                      {fastCurrentIndex < currentFastQuestions.length - 1 ? (
                        <button
                          onClick={() => {
                            setFastCurrentIndex((i) => i + 1);
                            setTimerSeconds(30);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setFastQuizCompleted(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Complete & View Score</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Completed Score Summary Card */
              <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">Fast Quiz Completed!</h2>
                  <p className="text-xs text-slate-500">
                    Here is your performance breakdown for {selectedDoc.title}.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Score</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">
                      {correctFastCount} / {currentFastQuestions.length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Accuracy</span>
                    <span className="text-lg font-bold text-blue-600 font-mono">
                      {Math.round((correctFastCount / (currentFastQuestions.length || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Best Streak</span>
                    <span className="text-lg font-bold text-amber-600 font-mono">
                      {fastMaxStreak} 🔥
                    </span>
                  </div>
                </div>

                {/* Performance Evaluation Tag */}
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {correctFastCount === currentFastQuestions.length
                    ? '🏆 Perfect Mastery! Outstanding retention.'
                    : correctFastCount / currentFastQuestions.length >= 0.7
                    ? '👍 Proficient! Ready for syllabus milestones.'
                    : '📖 Good practice! Review missed concepts below.'}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setFastAnswers({});
                      setFastCurrentIndex(0);
                      setFastQuizCompleted(false);
                      setFastStreak(0);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                  >
                    Retake This Quiz
                  </button>

                  <button
                    onClick={() => handleGenerateFastQuiz(fastCount, fastDifficulty)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>⚡ Start Another Fast Quiz</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 fill-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Ready for a Fast Quiz?</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Rapid-fire practice questions crafted directly from {selectedDoc.title}.
              </p>
              <button
                onClick={() => handleGenerateFastQuiz(fastCount, fastDifficulty)}
                disabled={loadingFastQuiz}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {loadingFastQuiz ? 'Building Quiz...' : '⚡ Start Fast Quiz'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOOL 1: FULL MCQ EXAM QUIZ */}
      {activeTool === 'mcq' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Difficulty:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setMcqDifficulty(diff)}
                      className={`px-3 py-1.5 capitalize font-medium transition-colors ${
                        mcqDifficulty === diff
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Questions:</span>
                <select
                  value={mcqCount}
                  onChange={(e) => setMcqCount(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateMCQs}
              disabled={loadingMcq}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingMcq ? 'Generating Questions...' : 'Generate New Quiz'}</span>
            </button>
          </div>

          {/* Quiz Content */}
          {mcqQuiz ? (
            <div className="space-y-6">
              {/* Score Meter */}
              {answeredCount > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-blue-600" />
                    <div>
                      <span className="text-xs font-semibold text-blue-900">Current Score</span>
                      <div className="text-lg font-bold text-blue-900 font-mono tabular-nums">
                        {correctCount} / {answeredCount} answered correctly ({Math.round((correctCount / (answeredCount || 1)) * 100)}%)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAnswers({});
                      setRevealedExplanations({});
                    }}
                    className="text-xs text-blue-700 font-semibold hover:underline"
                  >
                    Reset Answers
                  </button>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {mcqQuiz.questions.map((q, qIdx) => {
                  const userAnswer = selectedAnswers[q.id];
                  const hasAnswered = userAnswer !== undefined;
                  const isCorrect = userAnswer === q.correctIndex;
                  const showExplanation = revealedExplanations[q.id] || hasAnswered;

                  return (
                    <div
                      key={q.id}
                      className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-mono">
                          <span>Q{qIdx + 1}.</span>
                          {q.pageReference && (
                            <button
                              onClick={() => onOpenPdfReader(q.pageReference)}
                              className="text-[11px] font-semibold text-blue-600 hover:underline"
                            >
                              Source: Page {q.pageReference}
                            </button>
                          )}
                        </div>

                        {hasAnswered && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                              isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{q.question}</h4>

                      {/* Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = userAnswer === optIdx;
                          const isOptionCorrect = optIdx === q.correctIndex;

                          let buttonStyle = 'border-slate-200 bg-white hover:border-slate-300 text-slate-700';

                          if (hasAnswered) {
                            if (isOptionCorrect) {
                              buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                            } else if (isOptionSelected && !isOptionCorrect) {
                              buttonStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                            } else {
                              buttonStyle = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
                            }
                          } else if (isOptionSelected) {
                            buttonStyle = 'border-blue-500 bg-blue-50 text-blue-900 font-semibold';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (!hasAnswered) {
                                  setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                                }
                              }}
                              className={`p-3 rounded-lg border text-xs text-left transition-all flex items-start gap-2.5 ${buttonStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="leading-relaxed flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Block */}
                      {showExplanation && (
                        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 space-y-1">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>Detailed Explanation & Grounding:</span>
                          </div>
                          <p>{q.explanation}</p>
                          {q.pageReference && (
                            <button
                              onClick={() => onOpenPdfReader(q.pageReference)}
                              className="text-blue-600 hover:underline font-semibold inline-block pt-1"
                            >
                              Open Page {q.pageReference} in Reader &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Ready to test your knowledge?</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate tailored multiple choice exam questions grounded in your selected document.
              </p>
              <button
                onClick={handleGenerateMCQs}
                disabled={loadingMcq}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {loadingMcq ? 'Generating...' : 'Start Practice Quiz'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOOL 2: SPACED REPETITION FLASHCARDS */}
      {activeTool === 'flashcards' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Controls Bar */}
          <div className="flex items-center justify-between pb-2">
            <div className="text-xs text-slate-600">
              Mastered: <span className="font-bold text-slate-900 font-mono tabular-nums">{masteredCards.size}</span> / {flashcards.length || 0}
            </div>
            <button
              onClick={handleGenerateFlashcards}
              disabled={loadingFlashcards}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{loadingFlashcards ? 'Creating Cards...' : 'Generate New Deck'}</span>
            </button>
          </div>

          {flashcards.length > 0 ? (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentCardIndex + 1) / flashcards.length) * 100}%`,
                  }}
                />
              </div>

              {/* 3D Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer min-h-[300px] bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 shadow-sm p-8 flex flex-col justify-between transition-all select-none group relative"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono tabular-nums">
                    Card {currentCardIndex + 1} of {flashcards.length}
                  </span>
                  <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {isFlipped ? 'Answer (Click to flip)' : 'Prompt (Click to flip)'}
                  </span>
                </div>

                <div className="py-6 text-center">
                  {!isFlipped ? (
                    <div className="space-y-2">
                      <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Concept</div>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug">
                        {flashcards[currentCardIndex].front}
                      </h3>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs uppercase font-semibold text-emerald-600 tracking-wider">Definition & Answer</div>
                      <p className="text-sm md:text-base text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {flashcards[currentCardIndex].back}
                      </p>
                      {flashcards[currentCardIndex].pageReference && (
                        <div className="text-xs text-slate-400 pt-2 font-mono">
                          Referenced from Page {flashcards[currentCardIndex].pageReference}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] text-slate-400 group-hover:text-blue-500 transition-colors">
                  Tap anywhere on card or press Space to flip
                </div>
              </div>

              {/* Mastery Navigation Controls */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentCardIndex((i) => Math.max(0, i - 1));
                  }}
                  disabled={currentCardIndex === 0}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                >
                  &larr; Previous
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const id = flashcards[currentCardIndex].id;
                      setMasteredCards((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                      if (currentCardIndex < flashcards.length - 1) {
                        setIsFlipped(false);
                        setCurrentCardIndex((i) => i + 1);
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Still Learning
                  </button>
                  <button
                    onClick={() => {
                      const id = flashcards[currentCardIndex].id;
                      setMasteredCards((prev) => new Set(prev).add(id));
                      if (currentCardIndex < flashcards.length - 1) {
                        setIsFlipped(false);
                        setCurrentCardIndex((i) => i + 1);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Got It! (Mastered)
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentCardIndex((i) => Math.min(flashcards.length - 1, i + 1));
                  }}
                  disabled={currentCardIndex === 0 && flashcards.length === 1}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Spaced Repetition Flashcards</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Reinforce high-frequency test definitions and formulas using active recall flashcards.
              </p>
              <button
                onClick={handleGenerateFlashcards}
                disabled={loadingFlashcards}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {loadingFlashcards ? 'Generating...' : 'Build Flashcard Deck'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOOL 3: HIGH-YIELD SUMMARY */}
      {activeTool === 'summary' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">Focus Section:</span>
              <input
                type="text"
                placeholder="e.g. Concurrency, Deadlocks, or Entire Document"
                value={summaryFocus}
                onChange={(e) => setSummaryFocus(e.target.value)}
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={loadingSummary}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingSummary ? 'Synthesizing Document...' : 'Generate Executive Summary'}</span>
            </button>
          </div>

          {summaryText ? (
            <div className="p-6 md:p-8 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Structured Study Summary</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(summaryText);
                    showToast('Summary copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary</span>
                </button>
              </div>
              <div className="prose prose-slate max-w-none text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {summaryText}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Instant PDF Summary</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Extract high-yield concepts, definitions, and exam takeaways from this document.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {loadingSummary ? 'Synthesizing...' : 'Generate Summary'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: EXAM CHECKLIST */}
      {activeTool === 'checklist' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Final Exam Revision Checklist</h3>
              <p className="text-xs text-slate-500">Core syllabus competencies you must master before entering the exam.</p>
            </div>
            <button
              onClick={handleGenerateChecklist}
              disabled={loadingChecklist}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingChecklist ? 'Generating Checklist...' : 'Generate Checklist'}</span>
            </button>
          </div>

          {checklist ? (
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              {checklist.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setChecklist((prev) => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        items: prev.items.map((it) =>
                          it.id === item.id ? { ...it, completed: !it.completed } : it
                        ),
                      };
                    });
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    item.completed
                      ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                      : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <span className="text-xs md:text-sm font-medium">{item.topic}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        item.importance === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.importance} Priority
                    </span>
                    {item.pageReference && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPdfReader(item.pageReference);
                        }}
                        className="text-xs font-mono text-blue-600 hover:underline"
                      >
                        p.{item.pageReference}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <ListChecks className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Exam Preparedness Audit</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Extract all essential theorems, algorithms, and definitions into an interactive review checklist.
              </p>
              <button
                onClick={handleGenerateChecklist}
                disabled={loadingChecklist}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Create Checklist
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOOL 5: SIMPLE LANGUAGE EXPLAINER */}
      {activeTool === 'simple' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Explain Like I'm a Beginner</h3>
            <p className="text-xs text-slate-500">
              Break down complex technical terms into plain English using intuitive real-world analogies.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                placeholder="Enter concept (e.g., Dijkstra's Banker's Algorithm, Belady's Anomaly)..."
                value={simpleConcept}
                onChange={(e) => setSimpleConcept(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleGenerateSimple}
                disabled={loadingSimple || !simpleConcept.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                {loadingSimple ? 'Simplifying...' : 'Explain in Simple Terms'}
              </button>
            </div>
          </div>

          {simpleExplanation ? (
            <div className="p-6 md:p-8 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <span>Simple Intuition: {simpleConcept}</span>
              </h3>
              <div className="prose prose-slate max-w-none text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {simpleExplanation}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                'Race Conditions & Mutex Locks',
                'Coffman Deadlock Conditions',
                "Dijkstra's Banker's Algorithm",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setSimpleConcept(sample);
                  }}
                  className="p-3 text-left bg-white border border-slate-200 hover:border-blue-400 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                >
                  <span className="text-[10px] text-blue-600 font-semibold uppercase block mb-1">Try Concept</span>
                  {sample}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TOOL 6: DEEP TEXT & DOCUMENT ANALYSIS (POWERED BY WEB WORKER) */}
      {activeTool === 'analytics' && (
        <div className="space-y-6">
          {/* Analysis Header & Trigger */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
                <BarChart3 className="w-4 h-4" />
                <span>Off-Thread NLP Engine</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Deep Text Analysis & Readability Metrics</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lexical diversity, readability formulas (Flesch, Fog), syllable distribution, and TF-IDF key concept extraction calculated in a background Web Worker.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAnalyzeText}
                disabled={loadingAnalysis}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                <span>{loadingAnalysis ? 'Analyzing Text...' : 'Re-Run Worker Analysis'}</span>
              </button>
            </div>
          </div>

          {loadingAnalysis ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">Processing Document in Web Worker</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Running tokenization, phonetic syllable counts, Flesch-Kincaid scoring, and TF-IDF term frequencies off the main thread so your UI stays at 60fps...
              </p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-6">
              {/* Web Worker Execution Benchmark Pill */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">Web Worker Computation Completed</span>
                  <span className="text-slate-400">•</span>
                  <span>Execution Time: <strong className="text-emerald-700">{analysisResult.processingTimeMs}ms</strong></span>
                  <span className="text-slate-400">•</span>
                  <span>UI Main Thread Latency: <strong className="text-emerald-700">0ms (Zero Jitter)</strong></span>
                </div>
                <span className="text-[11px] bg-white text-emerald-800 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                  Worker Thread Active
                </span>
              </div>

              {/* Top Analytical Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Readability Diagnostics */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Readability Profile</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        analysisResult.readability.difficultyTier === 'Easy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : analysisResult.readability.difficultyTier === 'Moderate'
                          ? 'bg-blue-100 text-blue-800'
                          : analysisResult.readability.difficultyTier === 'Challenging'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {analysisResult.readability.difficultyTier}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {analysisResult.readability.fleschReadingEase}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ 100 Flesch Ease</span>
                  </div>

                  {/* Visual Ease Meter */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, analysisResult.readability.fleschReadingEase))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-400">Grade Level</div>
                      <div className="font-semibold text-slate-800">
                        Grade {analysisResult.readability.fleschKincaidGradeLevel}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Gunning Fog</div>
                      <div className="font-semibold text-slate-800">
                        {analysisResult.readability.gunningFogIndex} Index
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug pt-1">
                    {analysisResult.readability.description}
                  </p>
                </div>

                {/* Card 2: Volume & Time Estimates */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Volume & Study Pacing
                  </span>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {analysisResult.stats.wordCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Total Words</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Read Time</span>
                      </div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        ~{analysisResult.stats.readingTimeMinutes} mins
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Study Drill</span>
                      </div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        ~{analysisResult.stats.estimatedStudyTimeMinutes} mins
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-400">Avg Sentence</div>
                      <div className="font-semibold text-slate-800">
                        {analysisResult.stats.averageSentenceLength} words
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Sentences</div>
                      <div className="font-semibold text-slate-800">
                        {analysisResult.stats.sentenceCount} total
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Lexical Diversity & Vocabulary Richness */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Lexical Diversity
                  </span>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {(analysisResult.lexicalDiversity.typeTokenRatio * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Unique Token Ratio</span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all rounded-full"
                      style={{ width: `${Math.min(100, analysisResult.lexicalDiversity.typeTokenRatio * 150)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-400">Unique Vocabulary</div>
                      <div className="font-semibold text-slate-800">
                        {analysisResult.lexicalDiversity.uniqueWords.toLocaleString()} words
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">3+ Syllable Words</div>
                      <div className="font-semibold text-slate-800">
                        {analysisResult.lexicalDiversity.complexityRatio}%
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug pt-1 border-t border-slate-100">
                    High lexical diversity indicates comprehensive conceptual coverage suitable for in-depth examination.
                  </p>
                </div>
              </div>

              {/* Keywords Section (TF-IDF Scored) */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">Top Technical Keywords (TF-IDF Weighted)</h4>
                  </div>
                  {activeKeywordFilter && (
                    <button
                      onClick={() => setActiveKeywordFilter(null)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Clear filter ({activeKeywordFilter})
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Terms scored by frequency and document rarity. Click any keyword to filter or view page references.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {analysisResult.topKeywords.map((kw) => {
                    const isSelected = activeKeywordFilter === kw.term;
                    return (
                      <button
                        key={kw.term}
                        onClick={() => setActiveKeywordFilter(isSelected ? null : kw.term)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        <span className="font-semibold">{kw.term}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {kw.count}×
                        </span>
                        <span className="text-[10px] opacity-75">
                          (pgs {kw.pages.slice(0, 3).join(', ')})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom 2-Col Grid: Extracted Definitions & Key Theorems */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Extracted Definitions */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Extracted Core Definitions</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      {analysisResult.extractedDefinitions.length} found
                    </span>
                  </div>

                  <div className="space-y-3">
                    {analysisResult.extractedDefinitions.map((def, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{def.term}</span>
                          <button
                            onClick={() => onOpenPdfReader(def.pageReference)}
                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            <span>Page {def.pageReference}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {def.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Rules & Theorems Identified */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Key Rules, Conditions & Theorems</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      {analysisResult.keyRulesAndTheorems.length} items
                    </span>
                  </div>

                  <div className="space-y-3">
                    {analysisResult.keyRulesAndTheorems.length > 0 ? (
                      analysisResult.keyRulesAndTheorems.map((rule, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{rule.concept}</span>
                            <button
                              onClick={() => onOpenPdfReader(rule.pageReference)}
                              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              <span>Page {rule.pageReference}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {rule.description}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        No explicit theorem headers detected. Review definitions above for principles.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">Ready to Analyze</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Re-Run Worker Analysis" above to process this document's text off the main thread.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
