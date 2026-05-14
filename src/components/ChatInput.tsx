'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileUp, Image as ImageIcon, Mic, Paperclip, Plus, RefreshCw, Send, X } from 'lucide-react';
import { ChatAttachment } from '@/types';

type ModelOption = { id: string; name?: string };

interface ChatInputProps {
  onSend: (message: string, attachments: ChatAttachment[]) => void;
  loading: boolean;
  placeholder?: string;
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onRefreshModels: () => void;
  modelsLoading: boolean;
}

export function ChatInput({
  onSend,
  loading,
  placeholder = 'Type your message...',
  models,
  selectedModel,
  onModelChange,
  onRefreshModels,
  modelsLoading,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const modelPickerButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const selectedLabel = models.find((model) => model.id === selectedModel)?.name || selectedModel || 'default';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }

      if (
        modelPickerRef.current &&
        !modelPickerRef.current.contains(target) &&
        modelPickerButtonRef.current &&
        !modelPickerButtonRef.current.contains(target)
      ) {
        setShowModelPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    
  }, [menuOpen]);

  // Auto-resize textarea when input changes
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const scrollHeight = el.scrollHeight;
    el.style.height = Math.min(scrollHeight, 160) + 'px';
  }, [input]);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (event: any) => {
      let final = '';
      // only process final results to avoid duplication
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      // only update textarea with final confirmed text
      if (final) {
        setInput((prev) => (prev ? prev + ' ' : '') + final);
      }
    };

    recog.onend = () => {
      setListening(false);
    };

    recog.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recog;
    return () => {
      try { recog.stop(); } catch {}
    };
  }, []);

  const toAttachment = async (file: File, type: 'image' | 'file') => {
    let url: string | undefined;
    let textContent: string | undefined;

    if (type === 'image') {
      url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    } else if (file.type.startsWith('text/') || /\.(txt|md|csv|json|log|js|ts|tsx|jsx|py|java|c|cpp|css|html|xml)$/i.test(file.name)) {
      textContent = await file.text();
    }

    return {
      id: crypto.randomUUID(),
      name: file.name,
      type,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      url,
      textContent,
      rawFile: file,
    } satisfies ChatAttachment;
  };

  const handleFilesSelected = async (files: FileList | null, type: 'image' | 'file') => {
    if (!files?.length) return;
    const items = await Promise.all(Array.from(files).map((file) => toAttachment(file, type)));
    setAttachments((prev) => [...prev, ...items]);
    setMenuOpen(false);
  };

  const onDrop = async (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    await handleFilesSelected(files, 'file');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    onSend(input, attachments);
    setInput('');
    setAttachments([]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="border-t border-gray-700 bg-gray-900/95 px-4 py-4 sm:px-6"
    >
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-3 flex justify-end">
          <div className="relative">
            <button
              ref={modelPickerButtonRef}
              type="button"
              onClick={() => setShowModelPicker((prev) => !prev)}
              disabled={!models.length && !modelsLoading}
              className="flex h-10 items-center gap-2 rounded-full border border-gray-600 bg-[#3a3a3a] px-4 text-sm text-white transition-colors hover:bg-[#474747] disabled:opacity-50"
              title="Switch model"
            >
              <span className="max-w-[180px] truncate">{selectedLabel}</span>
              <ChevronDown size={15} className={showModelPicker ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {showModelPicker && (
              <div
                ref={modelPickerRef}
                className="absolute bottom-full right-0 z-50 mb-3 w-80 overflow-hidden rounded-3xl border border-gray-700 bg-[#3a3a3a] p-3 text-white shadow-2xl shadow-black/40"
              >
                <div className="mb-2 flex items-center justify-between px-2 text-xs uppercase tracking-wide text-gray-300">
                  <span>Available models</span>
                  <button
                    type="button"
                    onClick={onRefreshModels}
                    disabled={!models.length || modelsLoading}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-gray-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={modelsLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onModelChange('default')}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/10 ${selectedModel === 'default' ? 'bg-white/10' : ''}`}
                >
                  <div className="font-medium">default</div>
                  <div className="text-xs text-gray-300">Use the default LM Studio model</div>
                </button>

                <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/10 p-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => onModelChange(model.id)}
                      className={`mb-1 w-full rounded-2xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/10 ${selectedModel === model.id ? 'bg-white/10' : ''}`}
                    >
                      <div className="font-medium">{model.name || model.id}</div>
                      <div className="text-xs text-gray-300">{model.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 rounded-full border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
              >
                {attachment.type === 'image' && attachment.url ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <Paperclip size={16} className="text-gray-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{attachment.name}</p>
                  <p className="text-xs text-gray-400">
                    {attachment.type === 'image' ? 'Image' : 'File'} • {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3 rounded-[32px] border border-gray-700 bg-[#262626] px-3 py-3 shadow-2xl shadow-black/30">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={async (event) => {
            const inputElement = event.currentTarget;
            await handleFilesSelected(inputElement.files, 'file');
            inputElement.value = '';
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={async (event) => {
            const inputElement = event.currentTarget;
            await handleFilesSelected(inputElement.files, 'image');
            inputElement.value = '';
          }}
        />

        <div className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3a3a3a] text-white transition-colors hover:bg-[#474747] disabled:opacity-50"
            title="More options"
          >
            <Plus size={20} />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 z-50 mb-3 w-72 overflow-hidden rounded-3xl border border-gray-700 bg-[#3a3a3a] p-3 text-white shadow-2xl shadow-black/40"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <FileUp size={18} />
                </div>
                <div>
                  <div className="font-medium">Add photos & files</div>
                  <div className="text-xs text-gray-300">Upload images or documents</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <div className="font-medium">Add photos</div>
                  <div className="text-xs text-gray-300">Pick one or more images</div>
                </div>
              </button>

              <div className="my-2 h-px bg-white/10" />
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              // trigger submit
              if (!loading) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                // find nearest form and dispatch
                const form = textareaRef.current?.closest('form') as HTMLFormElement | null;
                form?.dispatchEvent(submitEvent);
              }
            }
          }}
          disabled={loading}
          placeholder={placeholder}
          rows={1}
          className="min-h-[44px] max-h-40 w-full flex-1 resize-none overflow-hidden bg-transparent px-2 py-2 text-[15px] text-white placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) return;
            const recog = recognitionRef.current;
            if (!recog) return;
            if (listening) {
              try { recog.stop(); } catch {}
              setListening(false);
            } else {
              try {
                // clear interim text
                setInput('');
                recog.start();
                setListening(true);
              } catch (e) {
                console.error('Speech start error', e);
              }
            }
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${listening ? 'bg-red-600 text-white' : 'text-gray-200 hover:bg-white/10'} disabled:opacity-50`}
          title="Voice input (Enter to send, Shift+Enter newline)"
        >
          <Mic size={19} />
        </button>
        <button
          type="submit"
          disabled={loading || (!input.trim() && attachments.length === 0)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </div>
      </div>
    </form>
  );
}
