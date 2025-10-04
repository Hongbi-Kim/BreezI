import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ArrowLeft, Info, RefreshCw, Calendar, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Message {
  id: string;
  message: string;
  type: 'user' | 'ai';
  timestamp: string;
  emotion?: string;
  warning?: boolean;
  characterId?: string;
  characterName?: string;
  characterEmoji?: string;
}

interface ChatPageProps {
  accessToken: string;
  characterId?: string;
  chatRoomId?: string;
  onBackToSelection?: () => void;
}

interface Character {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  specialty: string;
  greeting: string;
  avatar: string;
}

const characters: Record<string, Character> = {
  fox: {
    id: 'fox',
    name: '여우',
    emoji: '🦊',
    description: '동기부여와 의욕 향상을 도와주는 친구',
    personality: '활발하고 긍정적이며, 항상 앞으로 나아갈 수 있도록 격려해줍니다',
    specialty: '의욕 부족, 동기 부여, 목표 설정, 자신감 향상',
    greeting: '안녕! 나는 여우야! 오늘도 멋진 하루를 만들어보자! 🌟',
    avatar: 'https://images.unsplash.com/photo-1604916287784-c324202b3205?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  rabbit: {
    id: 'rabbit',
    name: '토끼',
    emoji: '🐰',
    description: '따뜻한 공감과 위로를 전해주는 친구',
    personality: '따뜻하고 배려심이 많으며, 항상 당신의 마음을 이해하고 공감해줍니다',
    specialty: '감정 공유, 위로, 스트레스 해소, 마음의 안정',
    greeting: '안녕하세요~ 저는 토끼예요. 무엇이든 편하게 이야기해주세요 💕',
    avatar: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  dog: {
    id: 'dog',
    name: '강아지',
    emoji: '🐕',
    description: '차분하고 신중한 조언을 해주는 친구',
    personality: '침착하고 지혜로우며, 깊이 있는 대화와 현실적인 조언을 제공합니다',
    specialty: '문제 해결, 논리적 사고, 계획 수립, 현실적 조언',
    greeting: '안녕하세요. 저는 강아지입니다. 천천히 이야기를 들어보겠습니다.',
    avatar: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  bear: {
    id: 'bear',
    name: '곰',
    emoji: '🐻',
    description: '구글 캘린더 연동으로 일정 관리와 심리 케어',
    personality: '체계적이고 계획적이며, 일상 분석을 통해 더 나은 생활을 돕습니다',
    specialty: '일정 관리, 생활 패턴 분석, 시간 관리, 루틴 형성',
    greeting: '안녕하세요! 구글 캘린더와 연동하여 더 체계적인 케어를 도와드릴게요!',
    avatar: 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
};

export function ChatPage({ accessToken, characterId, chatRoomId, onBackToSelection }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentCharacterId, setCurrentCharacterId] = useState(characterId);
  const [warningAnimation, setWarningAnimation] = useState(false);
  const [chatRoomTitle, setChatRoomTitle] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
    loadChatRoomInfo();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    if (!chatRoomId || chatRoomId === 'calendar-integration') {
      setLoadingHistory(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        chatRoomId: chatRoomId
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/history?${params}`,
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

  const loadChatRoomInfo = async () => {
    if (!chatRoomId || chatRoomId === 'calendar-integration') {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/rooms`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const room = data.chatRooms?.find((r: any) => r.id === chatRoomId);
        if (room) {
          setChatRoomTitle(room.title || '');
        }
      }
    } catch (error) {
      console.error('Failed to load chat room info:', error);
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
            characterId: currentCharacterId || characterId,
            chatRoomId: chatRoomId && chatRoomId !== 'calendar-integration' ? chatRoomId : undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Handle warning animation
        if (data.warning) {
          setWarningAnimation(true);
          setTimeout(() => setWarningAnimation(false), 3000);
        }
        
        // Add user message
        const userTimestamp = Date.now();
        const userMsg: Message = {
          id: `user-${userTimestamp}`,
          message: userMessage,
          type: 'user',
          timestamp: new Date().toISOString(),
          warning: data.warning
        };

        // Add AI response with current character info
        const aiMsg: Message = {
          id: `ai-${userTimestamp + 1}`,
          message: data.aiResponse,
          type: 'ai',
          timestamp: new Date().toISOString(),
          warning: data.warning,
          characterId: currentCharacterId || characterId,
          characterName: currentCharacter.name,
          characterEmoji: currentCharacter.emoji
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

  // If no character is selected, show character selection
  if (!characterId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Heart className="w-12 h-12 text-purple-300 mx-auto mb-4" />
          <p className="text-gray-600">대화할 친구를 선택해주세요</p>
        </div>
      </div>
    );
  }

  // Special handling for bear (Google Calendar integration)
  if (characterId === 'bear' && chatRoomId === 'calendar-integration') {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center mb-6">
          {onBackToSelection && (
            <Button variant="ghost" size="sm" onClick={onBackToSelection} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
          )}
          <div className="text-6xl mb-4">🐻</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">구글 캘린더 연동</h1>
          <p className="text-gray-600">일정 관리를 통한 맞춤형 심리 케어</p>
        </div>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Calendar className="w-5 h-5" />
              서비스 준비중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  구글 캘린더 연동 기능은 현재 개발 중입니다. 곧 만나보실 수 있습니다!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 text-sm text-gray-700">
                <h4 className="font-medium text-orange-800">예정된 기능:</h4>
                <ul className="space-y-2 pl-4">
                  <li>• 구글 캘린더 일정 자동 분석</li>
                  <li>• 일정 패턴 기반 스트레스 지수 측정</li>
                  <li>• 맞춤형 휴식 시간 추천</li>
                  <li>• 건강한 일정 관리 조언</li>
                  <li>• 워라밸 개선 가이드</li>
                </ul>
              </div>
              
              <Button 
                disabled 
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                구글 캘린더 연동하기 (준비중)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCharacter = characters[currentCharacterId || characterId];
  if (!currentCharacter) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600">캐릭터를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

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
    <div className={`flex flex-col h-[calc(100vh-8rem)] ${warningAnimation ? 'animate-pulse bg-red-100' : ''}`}>
      {/* Chat header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 p-4">
        <div className="flex items-center gap-3">
          {onBackToSelection && (
            <Button variant="ghost" size="sm" onClick={onBackToSelection}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            <img 
              src={currentCharacter.avatar}
              alt={currentCharacter.name}
              className="w-full h-full object-cover rounded-full"
            />
            <AvatarFallback className="bg-purple-100 text-purple-600">
              {currentCharacter.emoji}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">
                {chatRoomTitle || currentCharacter.name}
              </h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span className="text-2xl">{currentCharacter.emoji}</span>
                      {currentCharacter.name}
                    </DialogTitle>
                    <DialogDescription>
                      {currentCharacter.description}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">성격</h4>
                      <p className="text-sm text-gray-600">{currentCharacter.personality}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">전문 분야</h4>
                      <p className="text-sm text-gray-600">{currentCharacter.specialty}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-gray-600">
              {chatRoomTitle ? `${currentCharacter.name} - ${currentCharacter.description}` : currentCharacter.description}
            </p>
          </div>
          
          {/* Character change dropdown */}
          <Select value={currentCharacterId || characterId} onValueChange={(value) => {
            setCurrentCharacterId(value);
            // 캐릭터 변경 시 메시지에 알림 추가
            const changeMessage: Message = {
              id: `system-${Date.now()}`,
              message: `${characters[value]?.name}(${characters[value]?.emoji})로 캐릭터가 변경되었습니다.`,
              type: 'ai',
              timestamp: new Date().toISOString(),
              characterId: value,
              characterName: characters[value]?.name,
              characterEmoji: characters[value]?.emoji
            };
            setMessages(prev => [...prev, changeMessage]);
          }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(characters).slice(0, 3).map((char) => (
                <SelectItem key={char.id} value={char.id}>
                  <span className="flex items-center gap-2">
                    <span>{char.emoji}</span>
                    <span>{char.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">{currentCharacter.emoji}</div>
            <p className="text-gray-600 mb-2">안녕하세요! 저는 {currentCharacter.name}예요.</p>
            <p className="text-gray-500 text-sm">{currentCharacter.greeting}</p>
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
              
              // Warning message styling
              const isWarning = message.warning;
              const userBubbleClass = isWarning 
                ? 'bg-red-500 text-white border-2 border-red-600' 
                : 'bg-purple-600 text-white';
              const aiBubbleClass = isWarning 
                ? 'bg-yellow-100 border-2 border-yellow-400 text-gray-800' 
                : 'bg-white border border-gray-200 text-gray-800';
              
              return (
                <div key={message.id} className="space-y-1">
                  <div className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <Avatar className="h-8 w-8 mb-1">
                        <img 
                          src={message.characterId && characters[message.characterId] ? characters[message.characterId].avatar : currentCharacter.avatar}
                          alt={message.characterName || currentCharacter.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {message.characterEmoji || currentCharacter.emoji}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-2 ${
                        message.type === 'user'
                          ? `${userBubbleClass} ${isWarning ? 'rounded-lg' : 'rounded-2xl'}`
                          : `${aiBubbleClass} ${isWarning ? 'rounded-lg' : 'rounded-2xl'}`
                      } ${isWarning ? 'shadow-lg' : ''}`}
                    >
                      <p className="text-sm">{message.message}</p>
                      {isWarning && message.type === 'ai' && (
                        <div className="mt-2 text-xs text-yellow-700 font-medium">
                          ⚠️ 위급상황 감지됨
                        </div>
                      )}
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
            placeholder={`${currentCharacter.name}에게 이야기해보세요...`}
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