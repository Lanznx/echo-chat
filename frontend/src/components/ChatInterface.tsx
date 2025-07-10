'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ChatRequest, ChatResponse } from '@/types';
import { SettingsModal } from './SettingsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Replaced by ProviderSelector
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Settings, Send, Bot, User, Loader2 } from 'lucide-react';
import { appConfig } from '@/config/app';
import { useLlmProviders } from '@/hooks/useProviders';
import { ProviderSelector } from './ProviderSelector';

interface ChatInterfaceProps {
  transcript: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ transcript }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [idCounter, setIdCounter] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('你是一個聰明的 AI 參與會議者. 我需要你用繁體中文，並且根據會議的前後文回答問題.');
  const [userRole, setUserRole] = useState('');
  // Dynamic LLM provider management
  const llmProviders = useLlmProviders();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createUserMessage = (query: string): ChatMessage => {
    const id = `user-${idCounter}`;
    setIdCounter(prev => prev + 1);
    return {
      id,
      content: query,
      type: 'user',
      timestamp: new Date()
    };
  };

  const createAssistantMessage = (): ChatMessage => {
    const id = `assistant-${idCounter}`;
    setIdCounter(prev => prev + 1);
    return {
      id,
      content: '',
      type: 'assistant',
      timestamp: new Date()
    };
  };

  const buildChatRequest = (query: string): ChatRequest => ({
    context: transcript,
    query: query,
    provider: llmProviders.selectedProvider,
    system_prompt: systemPrompt,
    user_role: userRole
  });

  const updateMessageContent = (messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: newContent }
          : msg
      )
    );
  };

  const appendMessageChunk = (messageId: string, chunk: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: msg.content + chunk }
          : msg
      )
    );
  };

  const processStreamLine = (line: string, assistantMessageId: string): boolean => {
    if (!line.startsWith('data: ')) return false;

    try {
      const data = JSON.parse(line.slice(6));
      console.log('Received streaming data:', data);

      if (data.chunk) {
        appendMessageChunk(assistantMessageId, data.chunk);
        return false;
      } else if (data.done) {
        console.log('Stream completed');
        return true;
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (e) {
      console.error('Error parsing streaming data:', e, 'Line:', line);
    }
    return false;
  };

  const handleStreamingResponse = async (response: Response, assistantMessageId: string) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader!.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        streamDone = processStreamLine(line, assistantMessageId);
        if (streamDone) break;
      }
    }
  };

  const sendChatRequest = async (chatRequest: ChatRequest): Promise<Response> => {
    const apiUrl = `${appConfig.apiBaseUrl}/api/chat/stream`;
    console.log('Sending streaming request to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to get response: ${response.status}`);
    }

    return response;
  };

  const handleChatError = (error: unknown, assistantMessageId: string) => {
    console.error('Error sending message:', error);
    updateMessageContent(
      assistantMessageId,
      'Sorry, there was an error processing your request. Please try again.'
    );
  };

  const sendMessage = async (query: string) => {
    if (!query.trim()) return;

    const userMessage = createUserMessage(query);
    const assistantMessage = createAssistantMessage();

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const chatRequest = buildChatRequest(query);
      const response = await sendChatRequest(chatRequest);
      await handleStreamingResponse(response, assistantMessage.id);
    } catch (error) {
      handleChatError(error, assistantMessage.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <Card className="flex-1 flex flex-col h-full border-0 rounded-none">
        <CardHeader className="border-b px-4 py-4">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg mb-1">
                <Bot className="h-5 w-5" />
                Chat with AI
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ask questions about your transcript or chat naturally
              </p>
            </div>
            <div className="flex items-start gap-2 flex-shrink-0">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  AI Provider
                </label>
                <div className="min-w-[180px]">
                  <ProviderSelector
                    providers={llmProviders.providers}
                    selectedProvider={llmProviders.selectedProvider}
                    selectedModel={llmProviders.selectedModel}
                    onProviderChange={llmProviders.selectProvider}
                    onModelChange={llmProviders.selectModel}
                    isLoading={llmProviders.isLoading}
                    error={llmProviders.error}
                    onRefresh={llmProviders.refreshProviders}
                    showModels={false}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex flex-col items-end pt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                  title="AI 角色設定"
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full max-h-full">
            <div className="p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-lg mb-2">👋 Welcome to EchoChat!</div>
                  <p className="text-muted-foreground max-w-md mx-auto">Start recording to generate a transcript, then ask me anything about it.</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex gap-2 max-w-[75%]">
                    {message.type === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                      </div>
                    )}

                    <Card className={`${message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                      } min-w-0 break-words p-0`}>
                      <CardContent className="px-3 py-2">
                        <div className="prose prose-sm max-w-none dark:prose-invert break-words [&>*]:my-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="break-words whitespace-pre-wrap my-0">{children}</p>,
                              code: ({ children }) => <code className="break-words">{children}</code>,
                              pre: ({ children }) => <pre className="break-words overflow-x-auto my-0">{children}</pre>
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <div className={`text-xs mt-1 ${message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>

                    {message.type === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                    </div>
                    <Card className="bg-muted min-w-0 break-words p-0">
                      <CardContent className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">AI is thinking...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="self-end px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemPrompt={systemPrompt}
        userRole={userRole}
        onSystemPromptChange={setSystemPrompt}
        onUserRoleChange={setUserRole}
      />
    </div>
  );
};