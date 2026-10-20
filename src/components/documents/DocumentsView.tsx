import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Edit2,
  ExternalLink,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Check,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { documentApi } from '../../services/api';

interface DocumentsViewProps {
  onOpenUpload: () => void;
  onNavigateToChat: () => void;
  onNavigateToStudy: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onOpenUpload,
  onNavigateToChat,
  onNavigateToStudy,
}) => {
  const { documents, selectedDoc, selectDocument, deleteDocument, refreshDocuments } =
    useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await documentApi.renameDocument(id, editTitle.trim());
      setEditingId(null);
      await refreshDocuments();
      setActionMessage('Document renamed successfully');
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}" and all its vector embeddings?`)) {
      try {
        await deleteDocument(id);
        setActionMessage('Document and embeddings removed');
        setTimeout(() => setActionMessage(null), 2500);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete document');
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Study Library
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage your uploaded textbooks, syllabi, lecture slides, and vector indexed notes.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-95 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload PDF Document</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Showing {filteredDocs.length} {filteredDocs.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const isSelected = selectedDoc?.id === doc.id;
          const isEditing = editingId === doc.id;

          return (
            <div
              key={doc.id}
              className={`p-5 bg-white rounded-2xl border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => handleStartRename(doc.id, doc.title)}
                      className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Rename Title"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-blue-400 rounded-md w-full"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(doc.id)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <h3
                    className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => {
                      selectDocument(doc.id);
                      onNavigateToChat();
                    }}
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>
                )}

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Page Count:</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700">
                      {doc.pageCount} pages
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>File Size:</span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Processing Status:</span>
                    <span className="text-emerald-700 font-semibold capitalize bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Indexed On:</span>
                    <span className="font-mono tabular-nums text-[11px]">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => {
                    selectDocument(doc.id);
                    onNavigateToChat();
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors text-center"
                >
                  Chat & Read
                </button>
                <button
                  onClick={() => {
                    selectDocument(doc.id);
                    onNavigateToStudy();
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors text-center"
                >
                  Exam Tools
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocs.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No documents matched your search</h3>
          <p className="text-xs text-slate-500">Try searching with a different keyword or upload a new PDF.</p>
        </div>
      )}
    </div>
  );
};
