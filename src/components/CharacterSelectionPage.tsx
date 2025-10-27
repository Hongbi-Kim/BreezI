import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Trash2, Calendar, Info, Users, Edit2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

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

interface ChatRoom {
  id: string;
  characterId: string;
  lastMessage: string;
  timestamp: string;
  title: string;
}

interface CharacterSelectionPageProps {
  accessToken: string;
  onCharacterSelect: (characterId: string, chatRoomId?: string) => void;
  onTokenRefresh?: () => Promise<string | null>;
}

const characters: Character[] = [
  {
    id: 'fox',
    name: '여우',
    emoji: '🦊',
    description: '동기부여와 의욕 향상을 도와주는 친구',
    personality: '활발하고 긍정적이며, 항상 앞으로 나아갈 수 있도록 격려해줍니다',
    specialty: '의욕 부족, 동기 부여, 목표 설정, 자신감 향상',
    greeting: '안녕! 나는 여우야! 오늘도 멋진 하루를 만들어보자! 🌟',
    avatar: 'https://images.unsplash.com/photo-1604916287784-c324202b3205?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'rabbit',
    name: '토끼',
    emoji: '🐰',
    description: '따뜻한 공감과 위로를 전해주는 친구',
    personality: '따뜻하고 배려심이 많으며, 항상 당신의 마음을 이해하고 공감해줍니다',
    specialty: '감정 공유, 위로, 스트레스 해소, 마음의 안정',
    greeting: '안녕하세요~ 저는 토끼예요. 무엇이든 편하게 이야기해주세요 💕',
    avatar: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'dog',
    name: '강아지',
    emoji: '🐕',
    description: '차분하고 신중한 조언을 해주는 친구',
    personality: '침착하고 지혜로우며, 깊이 있는 대화와 현실적인 조언을 제공합니다',
    specialty: '문제 해결, 논리적 사고, 계획 수립, 현실적 조언',
    greeting: '안녕하세요. 저는 강아지입니다. 천천히 이야기를 들어보겠습니다.',
    avatar: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'bear',
    name: '곰',
    emoji: '🐻',
    description: '구글 캘린더 연동으로 일정 관리와 심리 케어',
    personality: '체계적이고 계획적이며, 일상 분석을 통해 더 나은 생활을 돕습니다',
    specialty: '일정 관리, 생활 패턴 분석, 시간 관리, 루틴 형성',
    greeting: '안녕하세요! 구글 캘린더와 연동하여 더 체계적인 케어를 도와드릴게요!',
    avatar: 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHN8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
];

export function CharacterSelectionPage({ accessToken, onCharacterSelect, onTokenRefresh }: CharacterSelectionPageProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [currentToken, setCurrentToken] = useState(accessToken);

  useEffect(() => {
    setCurrentToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    // Only load chat rooms if we have a token
    if (currentToken) {
      console.log('Token available, loading chat rooms');
      loadChatRooms();
    } else {
      console.log('No token available yet, waiting...');
    }
  }, [currentToken]);

  const loadChatRooms = async (retryWithRefresh = true) => {
    try {
      if (!currentToken) {
        console.error('No access token available for loading chat rooms');
        setLoading(false);
        return;
      }
      
      console.log('Loading chat rooms with token:', currentToken ? 'token exists' : 'no token');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/rooms`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      console.log('Chat rooms response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded chat rooms:', data);
        setChatRooms(data.chatRooms || []);
      } else {
        if (response.status === 401) {
          console.log('Authentication required for chat rooms');
          
          if (retryWithRefresh && onTokenRefresh) {
            console.log('Attempting token refresh...');
            const newToken = await onTokenRefresh();
            if (newToken) {
              setCurrentToken(newToken);
              // Retry with new token
              return loadChatRooms(false);
            } else {
              console.log('Token refresh failed, user will be logged out');
            }
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to load chat rooms:', response.status, response.statusText, errorText);
        }
        setChatRooms([]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Chat rooms request timed out');
        setChatRooms([]);
      } else {
        console.error('Failed to load chat rooms:', error);
        setChatRooms([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewChatRoom = async (characterId: string) => {
    if (characterId === 'bear') {
      // 곰 캐릭터는 특별 처리
      onCharacterSelect('bear', 'calendar-integration');
      return;
    }

    try {
      const character = characters.find(c => c.id === characterId);
      const title = `${character?.name || '캐릭터'}와의 대화`;
      
      console.log('Creating chat room with:', { characterId, title });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/rooms/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            characterId,
            title
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Created chat room:', data);
        // Reload chat rooms to include the new one
        await loadChatRooms();
        onCharacterSelect(characterId, data.chatRoomId);
        setShowCharacterSelection(false);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to create chat room:', response.status, errorData);
        
        // Reload chat rooms to sync the state
        await loadChatRooms();
        
        if (response.status === 400 && errorData.error?.includes('Maximum 3 chat rooms')) {
          toast.error('최대 3개의 채팅방만 생성할 수 있습니다. 기존 채팅방을 삭제한 후 새로운 채팅방을 만들어주세요.');
        } else if (false) {
          alert('최대 3개의 채팅방만 생성할 수 있습니다.\n기존 채팅방을 삭제한 후 새로운 채팅방을 만들어주세요.');
        } else {
          toast.error(errorData.error || '채팅방 생성에 실패했습니다. 다시 시도해주세요.');
        }
        
        setShowCharacterSelection(false);
      }
    } catch (error) {
      console.error('Failed to create chat room:', error);
    }
  };

  const deleteChatRoom = async (chatRoomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/rooms/${chatRoomId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        }
      );

      if (response.ok) {
        setChatRooms(prev => prev.filter(room => room.id !== chatRoomId));
      }
    } catch (error) {
      console.error('Failed to delete chat room:', error);
    }
  };

  const startEditingTitle = (roomId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoomId(roomId);
    setEditingTitle(currentTitle);
  };

  const saveRoomTitle = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!editingTitle.trim()) return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/chat/rooms/${roomId}/title`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ title: editingTitle.trim() }),
        }
      );

      if (response.ok) {
        setChatRooms(prev => 
          prev.map(room => 
            room.id === roomId 
              ? { ...room, title: editingTitle.trim() }
              : room
          )
        );
        setEditingRoomId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Failed to update room title:', error);
    }
  };

  const cancelEditingTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoomId(null);
    setEditingTitle('');
  };

  const getCharacterInfo = (characterId: string) => {
    return characters.find(c => c.id === characterId);
  };

  const bearChatRoom = {
    id: 'bear-calendar',
    characterId: 'bear',
    lastMessage: '구글 캘린더 연동 서비스 준비중',
    timestamp: '2000-01-01T00:00:00.000Z', // 항상 맨 아래로 가도록 오래된 시간 설정
    title: '곰과의 일정관리 대화'
  };

  // 곰 채팅방은 항상 맨 아래, 나머지는 최신순 정렬
  const sortedChatRooms = chatRooms.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const allChatRooms = [...sortedChatRooms, bearChatRoom];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">채팅방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (showCharacterSelection) {
    const canCreateRoom = chatRooms.length < 3;
    
    return (
      <div className="p-4 space-y-6 pb-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">캐릭터를 선택해주세요</h1>
          <p className="text-gray-600">각 캐릭터마다 다른 성격과 특성을 가지고 있어요</p>
          {!canCreateRoom && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                최대 3개의 채팅방만 생성할 수 있습니다. 기존 채팅방을 삭제한 후 새로운 채팅방을 만들어주세요.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          {characters.slice(0, 3).map((character) => (
            <Card key={character.id} className={`overflow-hidden ${!canCreateRoom ? 'opacity-60' : ''}`}>
              <CardContent className="p-0">
                <div className="flex items-center p-4">
                  {/* 캐릭터 아바타 */}
                  <div className="relative mr-4">
                    <img 
                      src={character.avatar} 
                      alt={character.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  </div>

                  {/* 캐릭터 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{character.name} {character.emoji}</h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <span className="text-2xl">{character.emoji}</span>
                              {character.name}
                            </DialogTitle>
                            <DialogDescription>
                              {character.description}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-1">성격</h4>
                              <p className="text-sm text-gray-600">{character.personality}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-1">전문 분야</h4>
                              <p className="text-sm text-gray-600">{character.specialty}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-sm font-medium text-purple-800 mb-1">인사말</p>
                              <p className="text-sm text-purple-700">"{character.greeting}"</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{character.description}</p>
                  </div>

                  {/* 선택 버튼 */}
                  <Button
                    onClick={() => createNewChatRoom(character.id)}
                    className="ml-4 bg-purple-600 hover:bg-purple-700"
                    size="sm"
                    disabled={!canCreateRoom}
                  >
                    선택하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          onClick={() => setShowCharacterSelection(false)}
          variant="outline"
          className="w-full"
        >
          취소
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">채팅</h1>
        <p className="text-gray-600">마음을 나누는 따뜻한 대화를 시작해보세요</p>
      </div>



      {/* 새 채팅 만들기 버튼 */}
      <div className="mb-4">
        <Button
          onClick={() => setShowCharacterSelection(true)}
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={chatRooms.length >= 3}
        >
          <Plus className="w-4 h-4 mr-2" />
          새 채팅 만들기 ({chatRooms.length}/3)
        </Button>
        {chatRooms.length >= 3 && (
          <p className="text-xs text-red-600 mt-2 text-center">
            최대 3개까지만 생성 가능합니다. 기존 채팅방을 삭제해주세요.
          </p>
        )}
      </div>

      {/* 채팅방 리스트 */}
      <div className="space-y-3">
        {allChatRooms.map((room) => {
          const character = getCharacterInfo(room.characterId);
          const isBearRoom = room.characterId === 'bear';
          
          return (
            <Card 
              key={room.id} 
              className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${isBearRoom ? 'border-orange-200 bg-orange-50' : ''}`}
              onClick={() => {
                if (isBearRoom) {
                  // 곰 캐릭터는 구글 캘린더 연동 페이지로
                  onCharacterSelect('bear', 'calendar-integration');
                } else {
                  // 채팅방에 입장할 때는 초기 캐릭터로 시작하지만 나중에 변경 가능
                  onCharacterSelect(room.characterId || 'rabbit', room.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 캐릭터 아바타 */}
                    <div className="relative">
                      <img 
                        src={character?.avatar || ''} 
                        alt={character?.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>

                    {/* 채팅방 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {editingRoomId === room.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 text-sm"
                              maxLength={30}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => saveRoomTitle(room.id, e)}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingTitle}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <h3 className="font-medium text-base">{room.title}</h3>
                            <span className="text-lg">{character?.emoji}</span>
                            {!isBearRoom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => startEditingTitle(room.id, room.title, e)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                            {isBearRoom && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                준비중
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{room.lastMessage}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(room.timestamp).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>

                  {/* 삭제 버튼 (곰 캐릭터 제외) */}
                  {!isBearRoom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => deleteChatRoom(room.id, e)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {chatRooms.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">아직 채팅방이 없어요</p>
          <p className="text-sm text-gray-400">위의 "새 채팅 만들기" 버튼을 눌러 대화를 시작해보세요!</p>
        </div>
      )}
    </div>
  );
}