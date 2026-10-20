import axios from 'axios';
import {
  User,
  DocumentMetadata,
  ChatSession,
  ChatMessage,
  MCQQuiz,
  Flashcard,
  RevisionChecklist,
} from '../types';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('drag_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('drag_auth_token', res.data.token);
    return res.data;
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    major?: string;
    targetExam?: string;
    preferredComplexity?: string;
  }): Promise<{ token: string; user: User }> => {
    const res = await apiClient.post('/auth/register', data);
    localStorage.setItem('drag_auth_token', res.data.token);
    return res.data;
  },

  demoLogin: async (): Promise<{ token: string; user: User }> => {
    const res = await apiClient.post('/auth/demo');
    localStorage.setItem('drag_auth_token', res.data.token);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/users/me');
    return res.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.put('/users/profile', data);
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('drag_auth_token');
  },
};

// Document API
export const documentApi = {
  getDocuments: async (): Promise<DocumentMetadata[]> => {
    const res = await apiClient.get('/documents');
    return res.data;
  },

  getDocument: async (id: string): Promise<DocumentMetadata> => {
    const res = await apiClient.get(`/documents/${id}`);
    return res.data;
  },

  uploadDocument: async (data: {
    fileName: string;
    base64Content?: string;
    rawText?: string;
    fileSize?: number;
  }): Promise<DocumentMetadata> => {
    const res = await apiClient.post('/documents/upload', data);
    return res.data;
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/documents/${id}`);
    return res.data;
  },

  renameDocument: async (id: string, title: string): Promise<{ id: string; title: string }> => {
    const res = await apiClient.patch(`/documents/${id}`, { title });
    return res.data;
  },
};

// Chat API
export const chatApi = {
  getSessions: async (documentId?: string): Promise<ChatSession[]> => {
    const res = await apiClient.get('/chat/sessions', { params: { documentId } });
    return res.data;
  },

  createSession: async (documentId: string, title?: string): Promise<ChatSession> => {
    const res = await apiClient.post('/chat/sessions', { documentId, title });
    return res.data;
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const res = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
    return res.data;
  },

  sendMessage: async (sessionId: string, content: string): Promise<ChatMessage> => {
    const res = await apiClient.post(`/chat/sessions/${sessionId}/messages`, { content });
    return res.data;
  },

  sendMessageStream: async (
    sessionId: string,
    content: string,
    onChunk: (text: string) => void,
    onCitations: (citations: any[]) => void,
    onDone: (message: ChatMessage) => void
  ): Promise<void> => {
    const token = localStorage.getItem('drag_auth_token');
    const response = await fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/event:\s*([^\n]+)/);
        const dataMatch = block.match(/data:\s*([\s\S]+)/);
        const event = eventMatch ? eventMatch[1].trim() : 'message';
        const data = dataMatch ? dataMatch[1].trim() : '';

        try {
          const parsed = JSON.parse(data);
          if (event === 'citations') {
            onCitations(parsed);
          } else if (event === 'chunk') {
            onChunk(parsed.text);
          } else if (event === 'done') {
            onDone(parsed);
          }
        } catch (e) {
          // ignore transient json parse
        }
      }
    }
  },

  renameSession: async (sessionId: string, title: string): Promise<ChatSession> => {
    const res = await apiClient.patch(`/chat/sessions/${sessionId}`, { title });
    return res.data;
  },

  deleteSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/chat/sessions/${sessionId}`);
    return res.data;
  },
};

// Study Tools API
export const studyApi = {
  summarize: async (documentId: string, focusTopic?: string): Promise<{ documentId: string; documentTitle: string; summary: string }> => {
    const res = await apiClient.post('/study/summarize', { documentId, focusTopic });
    return res.data;
  },

  generateMCQs: async (params: {
    documentId: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    topic?: string;
    fastMode?: boolean;
  }): Promise<MCQQuiz> => {
    const res = await apiClient.post('/study/generate-mcqs', params);
    return res.data;
  },

  generateFlashcards: async (params: {
    documentId: string;
    count?: number;
    chapter?: string;
    fastMode?: boolean;
  }): Promise<{ documentId: string; documentTitle: string; flashcards: Flashcard[] }> => {
    const res = await apiClient.post('/study/generate-flashcards', params);
    return res.data;
  },

  getExamChecklist: async (documentId: string): Promise<RevisionChecklist> => {
    const res = await apiClient.post('/study/exam-checklist', { documentId });
    return res.data;
  },

  explainSimple: async (params: {
    documentId: string;
    concept: string;
    targetLevel?: string;
  }): Promise<{ concept: string; explanation: string; citations: { pageNumber: number; excerpt: string }[] }> => {
    const res = await apiClient.post('/study/explain-simple', params);
    return res.data;
  },
};

// Database & Performance Diagnostics API
export const databaseApi = {
  getStatus: async (): Promise<any> => {
    const res = await apiClient.get('/database/status');
    return res.data;
  },

  runBenchmark: async (): Promise<any> => {
    const res = await apiClient.post('/database/benchmark');
    return res.data;
  },
};

