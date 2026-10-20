import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { documentApi } from '../../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { uploadPdfFile, refreshDocuments } = useDocuments();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
      setErrorMessage('Please select a valid PDF document.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleStartUpload = async () => {
    if (!selectedFile && (!pasteMode || !pastedText.trim())) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      if (pasteMode) {
        setUploadStep('Extracting and indexing text sections...');
        await documentApi.uploadDocument({
          fileName: (pastedTitle.trim() || 'Custom Study Notes') + '.pdf',
          rawText: pastedText,
          fileSize: pastedText.length,
        });
      } else if (selectedFile) {
        setUploadStep('Uploading PDF binary...');
        await uploadPdfFile(selectedFile);
      }

      setUploadStep('Generating semantic chunk embeddings...');
      await new Promise((r) => setTimeout(r, 600));

      setUploadStep('Ready!');
      await refreshDocuments();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.response?.data?.error || 'Failed to upload and process document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Study Document</h3>
              <p className="text-[11px] text-slate-500">Add PDF textbooks, lecture notes, or syllabi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <button
            onClick={() => setPasteMode(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              !pasteMode ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload PDF File
          </button>
          <button
            onClick={() => setPasteMode(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              pasteMode ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paste Text / Lecture Notes
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!pasteMode ? (
            <div>
              {/* Drag Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  id="pdf-file-input"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">{selectedFile.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <label
                      htmlFor="pdf-file-input"
                      className="text-xs text-blue-600 hover:underline cursor-pointer block pt-1"
                    >
                      Change file
                    </label>
                  </div>
                ) : (
                  <label htmlFor="pdf-file-input" className="cursor-pointer space-y-2 block">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      Drag & drop your PDF here, or <span className="text-blue-600 underline">browse</span>
                    </div>
                    <p className="text-[11px] text-slate-400">PDF documents up to 25 MB supported</p>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document / Chapter Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Algorithms & Data Structures Exam Notes"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Study Content (Separate pages with blank lines)
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste lecture slides, study guides, or textbook text here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {/* Progress state */}
          {uploading && (
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 flex items-center gap-2.5 animate-pulse">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <span>{uploadStep || 'Processing document...'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartUpload}
            disabled={uploading || (!selectedFile && (!pasteMode || !pastedText.trim()))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-transform active:scale-95"
          >
            <span>{uploading ? 'Processing...' : 'Upload & Index'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
