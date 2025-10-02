import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Message {
  id: string;
  message: string;
  type: 'user' | 'ai';
  timestamp: string;
  emotion?: string;
}

interface ChatPageProps {
  accessToken: string;
}

export function ChatPage({ accessToken }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/history`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Add unique IDs to messages that don't have them
        const messagesWithIds = (data.messages || []).map((msg: any, index: number) => ({
          ...msg,
          id: msg.id || `${msg.type}-${msg.timestamp}-${index}`
        }));
        setMessages(messagesWithIds);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    const userMessage = newMessage;
    setNewMessage('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: userMessage,
            emotion: '',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Add user message
        const userTimestamp = Date.now();
        const userMsg: Message = {
          id: `user-${userTimestamp}`,
          message: userMessage,
          type: 'user',
          timestamp: new Date().toISOString(),
        };

        // Add AI response
        const aiMsg: Message = {
          id: `ai-${userTimestamp + 1}`,
          message: data.aiResponse,
          type: 'ai',
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg, aiMsg]);
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대화 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Chat header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-purple-100 text-purple-600">
              <Heart className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-gray-800">마음이</h2>
            <p className="text-sm text-gray-600">당신의 마음을 들어줄게요</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">안녕하세요! 저는 마음이에요.</p>
            <p className="text-gray-500 text-sm">오늘 어떤 하루를 보내셨나요?</p>
          </div>
        ) : (
          (() => {
            const messagesWithDates: (Message | { type: 'date'; date: string; id: string })[] = [];
            let lastDate = '';

            messages.forEach((message) => {
              const messageDate = new Date(message.timestamp);
              const dateString = messageDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              });

              if (dateString !== lastDate) {
                messagesWithDates.push({
                  type: 'date',
                  date: dateString,
                  id: `date-${messageDate.toISOString().split('T')[0]}`
                });
                lastDate = dateString;
              }

              messagesWithDates.push(message);
            });

            return messagesWithDates.map((item) => {
              if (item.type === 'date') {
                return (
                  <div key={item.id} className="flex justify-center my-6">
                    <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                      {item.date}
                    </div>
                  </div>
                );
              }

              const message = item as Message;
              return (
                <div key={message.id} className="space-y-1">
                  <div className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <Avatar className="h-8 w-8 mb-1">
                        <AvatarImage 
                          src="https://images.unsplash.com/photo-1614583224978-f05ce51ef5fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwQUklMjByb2JvdCUyMGNoYXJhY3RlciUyMGNhcnRvb258ZW58MXx8fHwxNzU5Mzg1NjM2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                          alt="마음이"
                        />
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          <Heart className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.type === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                  <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p className={`text-xs ${message.type === 'user' ? 'mr-10' : 'ml-10'} text-gray-500`}>
                      {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            });
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-purple-100">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="마음이에게 이야기해보세요..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}