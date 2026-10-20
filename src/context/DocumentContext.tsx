import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DocumentMetadata } from '../types';
import { documentApi, chatApi } from '../services/api';

const OFFLINE_DOCS_KEY = 'drag_offline_documents_v1';
const OFFLINE_DOC_PREFIX = 'drag_offline_doc_v1_';

interface DocumentContextType {
  documents: DocumentMetadata[];
  selectedDoc: DocumentMetadata | null;
  selectedPage: number;
  highlightExcerpt: string | null;
  loadingDocs: boolean;
  isOffline: boolean;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  newChatTrigger: number;
  startNewChat: () => Promise<string | null>;
  selectDocument: (docId: string, pageNumber?: number) => Promise<void>;
  setSelectedPage: (page: number) => void;
  jumpToCitation: (pageNumber: number, excerpt: string) => void;
  refreshDocuments: () => Promise<void>;
  uploadPdfFile: (file: File) => Promise<DocumentMetadata>;
  deleteDocument: (id: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>(() => {
    // Initial hydration from local storage if available
    try {
      const cached = localStorage.getItem(OFFLINE_DOCS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [selectedDoc, setSelectedDoc] = useState<DocumentMetadata | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [highlightExcerpt, setHighlightExcerpt] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newChatTrigger, setNewChatTrigger] = useState<number>(0);

  // Monitor online / offline connectivity
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Connectivity] Network online');
      setIsOffline(false);
      refreshDocuments();
    };

    const handleOffline = () => {
      console.log('[Connectivity] Network offline');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save documents list to localStorage
  const cacheDocumentsList = (docs: DocumentMetadata[]) => {
    try {
      localStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('Failed to cache documents list to localStorage:', e);
    }
  };

  // Save a full document (with pages and text) to localStorage for offline reading
  const cacheFullDocument = (doc: DocumentMetadata) => {
    try {
      localStorage.setItem(`${OFFLINE_DOC_PREFIX}${doc.id}`, JSON.stringify(doc));
    } catch (e) {
      console.warn('Failed to cache document to localStorage:', e);
    }
  };

  // Retrieve a cached document from localStorage
  const getCachedDocument = (docId: string): DocumentMetadata | null => {
    try {
      const cached = localStorage.getItem(`${OFFLINE_DOC_PREFIX}${docId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to read cached document:', e);
    }
    return null;
  };

  const refreshDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const docs = await documentApi.getDocuments();
      if (Array.isArray(docs) && docs.length > 0) {
        setDocuments(docs);
        cacheDocumentsList(docs);

        if (!selectedDoc) {
          // Preload first document for instant offline reading
          try {
            const fullDoc = await documentApi.getDocument(docs[0].id);
            setSelectedDoc(fullDoc);
            cacheFullDocument(fullDoc);
            setSelectedPage(1);
          } catch (docErr) {
            // Check offline cache
            const cachedFirst = getCachedDocument(docs[0].id);
            if (cachedFirst) {
              setSelectedDoc(cachedFirst);
              setSelectedPage(1);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load documents from network, checking offline cache:', err);
      try {
        const cached = localStorage.getItem(OFFLINE_DOCS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setDocuments(parsed);
          if (parsed.length > 0 && !selectedDoc) {
            const cachedDoc = getCachedDocument(parsed[0].id);
            if (cachedDoc) {
              setSelectedDoc(cachedDoc);
              setSelectedPage(1);
            }
          }
        }
      } catch (cacheErr) {
        console.error('Failed reading offline document cache:', cacheErr);
      }
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const selectDocument = async (docId: string, pageNumber: number = 1) => {
    try {
      // First try fetching (Service Worker will intercept and serve from cache if offline)
      const fullDoc = await documentApi.getDocument(docId);
      if (fullDoc && fullDoc.pages) {
        setSelectedDoc(fullDoc);
        cacheFullDocument(fullDoc);
        setSelectedPage(pageNumber);
        setHighlightExcerpt(null);
        return;
      }
    } catch (err) {
      console.warn('Error fetching document, checking offline backup:', err);
    }

    // Secondary Fallback: Load from localStorage offline cache
    const offlineDoc = getCachedDocument(docId);
    if (offlineDoc) {
      setSelectedDoc(offlineDoc);
      setSelectedPage(pageNumber);
      setHighlightExcerpt(null);
    } else {
      console.warn('Document not available in offline cache:', docId);
    }
  };

  const jumpToCitation = (pageNumber: number, excerpt: string) => {
    setSelectedPage(pageNumber);
    setHighlightExcerpt(excerpt);
  };

  const uploadPdfFile = async (file: File): Promise<DocumentMetadata> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(',')[1];
          const newDoc = await documentApi.uploadDocument({
            fileName: file.name,
            fileSize: file.size,
            base64Content,
          });

          // Refresh list and select new document
          await refreshDocuments();
          await selectDocument(newDoc.id);
          resolve(newDoc);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const startNewChat = async (): Promise<string | null> => {
    let doc = selectedDoc;
    if (!doc && documents.length > 0) {
      doc = await documentApi.getDocument(documents[0].id);
      setSelectedDoc(doc);
    }
    if (!doc) return null;

    try {
      const title = `Study: ${doc.title.slice(0, 24)} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      const newSession = await chatApi.createSession(doc.id, title);
      setActiveSessionId(newSession.id);
      setNewChatTrigger((c) => c + 1);
      return newSession.id;
    } catch (err) {
      console.error('Failed to create new chat session:', err);
      return null;
    }
  };

  const deleteDocument = async (id: string) => {
    await documentApi.deleteDocument(id);
    await refreshDocuments();
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        selectedDoc,
        selectedPage,
        highlightExcerpt,
        loadingDocs,
        isOffline,
        activeSessionId,
        setActiveSessionId,
        newChatTrigger,
        startNewChat,
        selectDocument,
        setSelectedPage,
        jumpToCitation,
        refreshDocuments,
        uploadPdfFile,
        deleteDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
