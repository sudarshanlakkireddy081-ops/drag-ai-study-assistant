export interface User {
  id: string;
  name: string;
  email: string;
  major?: string;
  targetExam?: string;
  preferredComplexity: 'simple' | 'high_school' | 'undergrad' | 'expert';
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  embedding?: number[];
  chunkIndex: number;
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
  sectionTitle?: string;
}

export interface DocumentMetadata {
  id: string;
  userId: string;
  title: string;
  originalFileName: string;
  fileSize: number; // bytes
  pageCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  pages?: DocumentPage[];
  chunks?: DocumentChunk[];
}

export interface Citation {
  pageNumber: number;
  excerpt: string;
  relevanceScore?: number;
  section?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
  isStreaming?: boolean;
  generationTimeMs?: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  pageReference?: number;
}

export interface MCQQuiz {
  id: string;
  documentId: string;
  documentTitle: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: MCQQuestion[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  documentId: string;
  front: string; // Term / Concept / Question
  back: string;  // Definition / Answer
  pageReference?: number;
  chapterOrTopic?: string;
  mastered?: boolean;
}

export interface StudySummary {
  documentId: string;
  documentTitle: string;
  executiveSummary: string;
  keyThemes: { title: string; summary: string; pageReferences: number[] }[];
  importantFormulasOrDefinitions: string[];
  takeaways: string[];
}

export interface StudyNote {
  id: string;
  documentId: string;
  documentTitle: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface RevisionChecklist {
  id: string;
  documentId: string;
  documentTitle: string;
  items: {
    id: string;
    topic: string;
    importance: 'high' | 'medium' | 'low';
    completed: boolean;
    pageReference?: number;
  }[];
}

export interface TextAnalysisResult {
  documentId: string;
  documentTitle: string;
  stats: {
    wordCount: number;
    sentenceCount: number;
    characterCount: number;
    paragraphCount: number;
    averageSentenceLength: number;
    averageWordLength: number;
    readingTimeMinutes: number;
    estimatedStudyTimeMinutes: number;
  };
  readability: {
    fleschReadingEase: number;
    fleschKincaidGradeLevel: number;
    gunningFogIndex: number;
    difficultyTier: 'Easy' | 'Moderate' | 'Challenging' | 'Advanced Academic';
    description: string;
  };
  lexicalDiversity: {
    uniqueWords: number;
    typeTokenRatio: number;
    complexityRatio: number;
  };
  topKeywords: {
    term: string;
    count: number;
    relevance: number;
    pages: number[];
  }[];
  extractedDefinitions: {
    term: string;
    definition: string;
    pageReference: number;
  }[];
  keyRulesAndTheorems: {
    concept: string;
    description: string;
    pageReference: number;
  }[];
  processingTimeMs: number;
}

