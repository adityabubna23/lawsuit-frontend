import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { modelChatApi } from '@/services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello. I am Grok, your AI legal research assistant, built by xAI. How may I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await modelChatApi.chatCompletion(
        updatedMessages.map(m => ({
          role: m.role,
          content: m.content,
        }))
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || 'I apologize, I was unable to generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);

      const errorText = error.response?.data?.error || error.message || 'Connection error';

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${errorText}. Please try again.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-midnight rounded-xl">
      {/* Header */}
      <header className=" text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold">Your Legal AI Assistant</h1>
          <p className="text-amber-200 text-sm mt-1">Legal Research • Drafting • Analysis</p>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 bg-opacity-10 bg-black rounded-2xl">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-6 py-4 rounded-lg shadow-md text-base leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-accent to-orange-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <p>{message.content}</p>
                <span
                  className={`flex text-xs mt-2 ${
                    message.role === 'user' ? 'text-amber-100 justify-end' : 'text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}

          {/* Thinking State */}
          {isLoading && (
            <div className="flex justify-start">
              <div
                className="px-6 py-4 rounded-lg bg-white border border-gray-200 shadow-md flex items-center gap-3"
                style={{ borderRadius: '8px' }}
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-gray-700 font-medium">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className=" border-gray-300 bg-midnight rounded-xl">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about case law, draft clauses, or legal strategy..."
              disabled={isLoading}
              className="flex-1 px-5 py-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              style={{ borderRadius: '8px' }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-8 py-4 bg-accent text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
              style={{ borderRadius: '8px' }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}