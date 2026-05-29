import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Scale, Trash2 } from 'lucide-react';
import { useLegalEagleStore } from '@/stores/legalEagleStore';
import { renderLegalEagleContent } from '@/utils/legalEagleMarkdown';

/**
 * Legal Eagle AI — full-page chat. Shares ONE conversation with the floating
 * widget via useLegalEagleStore (same history, live + on reload). The rendering
 * helper is shared too, so both surfaces look identical.
 */
export default function AIChat() {
  const messages = useLegalEagleStore((s) => s.messages);
  const isLoading = useLegalEagleStore((s) => s.loading);
  const send = useLegalEagleStore((s) => s.send);
  const clear = useLegalEagleStore((s) => s.clear);
  const hydrate = useLegalEagleStore((s) => s.hydrate);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  const clearHistory = () => {
    if (!confirm('Clear all chat history with Legal Eagle? This cannot be undone.')) return;
    clear();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await send(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedPrompts = [
    "Explain the key differences between civil and criminal law",
    "What are the essential elements of a valid contract?",
    "Draft a basic non-disclosure agreement clause",
    "What is the statute of limitations for personal injury cases?"
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-midnight">Legal Eagle AI</div>
              <div className="text-[11px] text-gray-500">
                {messages.length} message{messages.length === 1 ? '' : 's'} in this conversation
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear chat
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-midnight mb-2">Legal AI Assistant</h1>
            <p className="text-gray-600 text-center max-w-md mb-8">
              Get instant help with legal research, document drafting, case analysis, and more.
            </p>
            <div className="w-full max-w-2xl">
              <p className="text-sm font-medium text-gray-500 mb-3 text-center">Try asking about:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 group-hover:text-midnight">{prompt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-primary text-white' : 'bg-midnight text-white'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`flex-1 min-w-0 max-w-[80%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-midnight">
                      {message.role === 'user' ? 'You' : 'Legal AI'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`text-gray-700 inline-block text-left ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-xl rounded-tr-sm px-4 py-3'
                      : 'bg-white border border-gray-200 rounded-xl rounded-tl-sm p-4'
                  }`}>
                    {renderLegalEagleContent(message.content, message.role === 'user')}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 flex-row">
                <div className="w-10 h-10 rounded-xl bg-midnight text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-midnight">Legal AI</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl rounded-tl-sm p-4 inline-block">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-gray-500 text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3 bg-gray-50 border-2 border-gray-200 rounded-xl p-2 focus-within:border-primary transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about case law, draft clauses, or legal strategy..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-3 py-2 bg-transparent resize-none focus:outline-none text-gray-700 placeholder-gray-400 max-h-[150px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 bg-primary text-white rounded-lg hover:bg-midnight transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
