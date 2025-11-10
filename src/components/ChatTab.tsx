import { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Crown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useDataCache } from '../utils/dataCache';
import { logUserAction } from '../utils/logUserAction';
import { apiCall } from '../utils/api';
import { ChatRoom } from './ChatRoom';
import { CharacterProfile } from './CharacterProfile';
import lumiAvatar from '../assets/bb838f8b452a418707049fd37137f29785a32e3b.png';
import kaiAvatar from '../assets/fd812fd1d4483c3de83fd3b6669e7dbb28ec2697.png';
import leoAvatar from '../assets/247a0132ddfa67d748af8ab8f8273ee53080b2f7.png';
import riveAvatar from '../assets/c62b5ca0dd103dd3c28b979c87d5445da9da9daf.png';
import groupAvatar from '../assets/b63574b0ffb0d2e889062b6b150de38522b3ec9b.png';

interface Character {
  id: string;
  name: string;
  role: string;
  slogan: string;
  description: string;
  avatar: string;
  color: string;
  accentColor: string;
  symbol: string;
  hasCalendar?: boolean;
  isGroup?: boolean;
  isPro?: boolean; // Pro 전용 캐릭터
}

interface ChatListItem {
  character: Character;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

type ViewMode = 'list' | 'chat' | 'profile';

export function ChatTab() {
  const { chatListData, loadChatList, profileData, loadProfile } = useDataCache();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [fromList, setFromList] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showProDialog, setShowProDialog] = useState(false);

  useEffect(() => {
    console.log('[ChatTab] 🟢 Component MOUNTED');
    
    // Load user's Pro status from cache (no API call if cached)
    const loadProStatus = async () => {
      try {
        const data = await loadProfile(); // Uses cache if available
        setIsPro(data?.profile?.isPro || false);
      } catch (error) {
        console.error('[ChatTab] Failed to load pro status:', error);
      }
    };
    
    loadProStatus();
    
    return () => {
      console.log('[ChatTab] 🔴 Component UNMOUNTED');
    };
    // Empty deps - only run on mount. loadProfile causes infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewMode === 'list') {
      // Load from cache or fetch new data
      loadChatList().then((data) => {
        if (data && data.characters) {
          console.log('[ChatTab] Chat list loaded:', data.characters.length, 'characters');
          const summaries = data.summaries || [];
          const characters = data.characters || [];

          // Create a map for quick lookup
          const summaryMap = new Map(
            summaries.map((s: any) => [s.characterId, s])
          );

          const list: ChatListItem[] = characters.map((char: Character) => {
            const summary = summaryMap.get(char.id);
            
            let lastMessage = summary?.lastMessage || '아직 대화가 없습니다';
            if (lastMessage && lastMessage.length > 30) {
              lastMessage = lastMessage.substring(0, 30) + '...';
            }

            return {
              character: char,
              lastMessage,
              lastMessageTime: summary?.lastMessageTime || '',
              unreadCount: summary?.unreadCount || 0
            };
          });

          setChatList(list);
        } else {
          console.warn('[ChatTab] No chat list data received');
        }
      }).catch((error: any) => {
        console.error('[ChatTab] Failed to load chat list:', error);
        // Don't clear existing chat list on error
      });
    }
    // Only depend on viewMode. loadChatList causes infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const handleChatClick = (char: Character) => {
    // Check if character is Pro-only (group chat)
    if (char.isPro && !isPro) {
      setSelectedChar(char);
      setShowProDialog(true);
      return;
    }

    setSelectedChar(char);
    setFromList(false);
    setViewMode('chat');
    // Log chat interaction
    logUserAction('click', 'chat', { characterId: char.id, characterName: char.name });
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedChar(null);
    setFromList(false);
  };

  const handleProfileClick = () => {
    setViewMode('profile');
  };

  const handleBackFromProfile = () => {
    if (fromList) {
      setViewMode('list');
      setFromList(false);
    } else {
      setViewMode('chat');
    }
  };

  const handleAvatarClick = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    setSelectedChar(char);
    setFromList(true);
    setViewMode('profile');
  };

  if (viewMode === 'chat' && selectedChar) {
    return (
      <ChatRoom 
        character={selectedChar} 
        onBack={handleBackToList}
        onProfileClick={handleProfileClick}
      />
    );
  }

  if (viewMode === 'profile' && selectedChar) {
    return (
      <CharacterProfile 
        character={selectedChar} 
        onBack={handleBackFromProfile}
      />
    );
  }

  // Chat List View
  return (
    <>
      <div className="h-full bg-white flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-4 py-4">
          <h1 className="text-xl">채팅</h1>
        </header>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chatListData.loading ? (
          <div className="divide-y">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : chatList.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full p-8 text-center">
            <span className="text-6xl mb-4">💬</span>
            <p className="text-gray-500 mb-2">아직 채팅이 없습니다</p>
            <p className="text-sm text-gray-400">AI 캐릭터와 대화를 시작해보세요</p>
          </div>
        ) : (
          <div className="divide-y">
            {chatList.map((item) => (
              <div
                key={item.character.id}
                className="w-full p-4 flex items-center gap-3"
              >
                {/* Avatar */}
                <div
                  onClick={(e) => handleAvatarClick(e, item.character)}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border-2 hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer overflow-hidden"
                  style={{ 
                    backgroundColor: item.character.color,
                    borderColor: item.character.accentColor 
                  }}
                >
                  {item.character.id === 'char_1' ? (
                    <img 
                      src={lumiAvatar} 
                      alt={item.character.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : item.character.id === 'char_2' ? (
                    <img 
                      src={kaiAvatar} 
                      alt={item.character.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : item.character.id === 'char_3' ? (
                    <img 
                      src={leoAvatar} 
                      alt={item.character.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : item.character.id === 'char_4' ? (
                    <img 
                      src={riveAvatar} 
                      alt={item.character.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : item.character.id === 'char_group' ? (
                    <img 
                      src={groupAvatar} 
                      alt={item.character.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{item.character.avatar}</span>
                  )}
                </div>

                {/* Content - Clickable area for chat */}
                <button
                  onClick={() => handleChatClick(item.character)}
                  className="flex-1 min-w-0 text-left flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg -m-2 p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.character.name}</h3>
                        {item.character.isPro && (
                          <Crown className="w-3.5 h-3.5 text-purple-500 fill-purple-500" />
                        )}
                        {item.character.hasCalendar && (
                          <Calendar className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      {item.unreadCount > 0 && (
                        <Badge 
                          className="flex-shrink-0"
                          style={{ backgroundColor: item.character.accentColor }}
                        >
                          {item.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate pr-2">
                        {item.lastMessage}
                      </p>
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Pro Dialog */}
    <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-purple-500 fill-purple-500" />
            <DialogTitle>Pro 전용 기능</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              <span className="font-semibold text-purple-600">{selectedChar?.name}</span>은 Pro 구독자만 이용할 수 있는 특별한 기능입니다.
            </p>
            <div className="bg-purple-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-purple-600">✨</span>
                <div>
                  <p className="font-semibold text-sm text-purple-900">3인 단톡방</p>
                  <p className="text-xs text-purple-700">루미, 카이, 레오와 함께 대화하세요</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">🎯</span>
                <div>
                  <p className="font-semibold text-sm text-purple-900">자동 캐릭터 매칭</p>
                  <p className="text-xs text-purple-700">상황에 맞는 캐릭터가 자동으로 답변</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600">💬</span>
                <div>
                  <p className="font-semibold text-sm text-purple-900">다각도 조언</p>
                  <p className="text-xs text-purple-700">여러 관점에서 풍부한 인사이트 제공</p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={() => {
              setShowProDialog(false);
              // Navigate to profile tab to show subscription dialog
              window.dispatchEvent(new CustomEvent('openSubscription'));
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Crown className="w-4 h-4 mr-2" />
            Pro 구독하기
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowProDialog(false)}
            className="w-full"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
