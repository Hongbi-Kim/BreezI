import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
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
}

interface CharacterProfileProps {
  character: Character;
  onBack: () => void;
}

export function CharacterProfile({ character, onBack }: CharacterProfileProps) {
  const getCharacterDetails = (charId: string) => {
    switch (charId) {
      case 'char_1': // 루미
        return {
          fullDescription: '따뜻하고 섬세한 공감으로 당신의 감정을 온전히 받아드립니다. 어두운 마음에 작은 빛이 되어 위로를 전하며, 감정 표현을 편안하게 도와드립니다.',
          conversationStyle: '따뜻하고 섬세함 · 감정 수용 중심 · 다정한 어조',
          personality: ['공감적', '따뜻함', '섬세함', '위로'],
          greeting: '괜찮아요. 오늘은 그냥 쉬어가도 돼요. 마음이 어두울 때, 내가 작은 빛이 되어줄게요.',
          specialty: '감정 표현이 어려울 때 · 위로가 필요할 때 · 외로움을 느낄 때',
          examples: [
            '요즘 너무 외로워. → 혼자인 느낌, 정말 힘들죠. 하지만 지금 이 순간, 저는 여기 있어요.',
            '아무것도 하기 싫어. → 그럴 땐 잠시 멈춰도 괜찮아요. 오늘을 버틴 것만으로도 충분히 잘했어요.',
          ]
        };
      case 'char_2': // 카이
        return {
          fullDescription: '침착하고 명료한 판단으로 문제의 본질을 찾아드립니다. 파도처럼 흐름 속에서 방향을 찾아, 실질적이고 구체적인 해결책을 제시합니다.',
          conversationStyle: '침착하고 명료함 · 논리적 · 구체적 제안',
          personality: ['논리적', '침착함', '실용적', '명료함'],
          greeting: '파도는 방향을 잃지 않아요. 흐름 속에서 길을 찾아가죠. 함께 정리해볼까요?',
          specialty: '문제 해결이 필요할 때 · 습관 형성이 필요할 때 · 실질적 조언이 필요할 때',
          examples: [
            '잠이 너무 안 와. → 수면 루틴을 만들어보는 게 좋아요. 5분 명상 루틴 하나 추천드릴까요?',
            '일을 시작하기가 버거워. → 큰 일을 작은 단위로 나눠보면 어때요? 첫 5분만 집중해볼까요?',
          ]
        };
      case 'char_3': // 레오
        return {
          fullDescription: '차분하고 사색적인 질문으로 내면의 진짜 생각을 발견하도록 돕습니다. 흘러가는 감정 속에서 자기 이해와 성찰의 길을 함께 걸어갑니다.',
          conversationStyle: '차분하고 사색적 · 질문형 대화 · 원인 탐색',
          personality: ['성찰적', '사색적', '탐구적', '차분함'],
          greeting: '흘러가는 감정 속에서, 진짜 나의 생각이 남아요. 함께 들여다볼까요?',
          specialty: '자기 성찰이 필요할 때 · 내면 탐색이 필요할 때 · 원인을 이해하고 싶을 때',
          examples: [
            '왜 자꾸 미루는 걸까? → 미루는 게 아니라, 아직 시작할 준비가 안 된 마음일 수도 있어요.',
            '나는 왜 쉽게 포기할까? → 어떤 상황에서 가장 포기하고 싶어져요? 그 순간을 떠올려볼까요?',
          ]
        };
      case 'char_4': // 리브
        return {
          fullDescription: '데이터 기반으로 당신의 하루 리듬을 분석하고 조율합니다. 구글 캘린더와 연동하여 감정과 일정을 균형있게 관리하며, 맥락에 맞는 루틴을 제안합니다.',
          conversationStyle: '지능적이고 균형잡힘 · 맥락 기반 공감 · 루틴 조정',
          personality: ['분석적', '균형잡힘', '체계적', '지능적'],
          greeting: '당신의 하루엔 어떤 리듬이 흐르고 있을까요? 함께 조율해볼까요?',
          specialty: '일상 루틴 관리 · 감정과 일정 조율 · 하루 리듬 분석',
          examples: [
            '오늘 일정이 너무 많아. → 오후 일정이 빡빡했죠. 내일은 오전에 30분 여유를 만들어볼까요?',
            '이번 주 리듬 좀 알려줘. → 월~수요일은 에너지가 높았는데, 목요일부터 감정이 낮아졌어요.',
          ]
        };
      case 'char_group': // 단톡방
        return {
          fullDescription: '루미, 카이, 레오가 함께 있는 단톡방입니다. 당신의 질문이나 상황에 따라 가장 적합한 캐릭터가 자동으로 응답합니다. 복합적인 고민이나 다양한 관점이 필요할 때 활용하세요.',
          conversationStyle: '중립적 · 자동 매칭 · 복합 응답',
          personality: ['유연함', '다면적', '조화로움', '적응적'],
          greeting: '누가 당신의 마음에 가장 어울릴까요? 편하게 이야기해보세요.',
          specialty: '복합적인 고민 · 다양한 관점 필요 · 캐릭터 선택이 어려울 때',
          examples: [
            '요즘 힘들고 일도 안 돼요. → 루미: 정말 힘드시겠어요. / 카이: 어떤 부분부터 정리해볼까요?',
          ]
        };
      default:
        return {
          fullDescription: character.description,
          conversationStyle: '',
          personality: [],
          greeting: `안녕하세요, ${character.name}입니다.`,
          specialty: '다양한 상황에서 도움을 드립니다',
          examples: []
        };
    }
  };

  const details = getCharacterDetails(character.id);

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg">프로필</h1>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 border-4 overflow-hidden"
                style={{ 
                  backgroundColor: character.color,
                  borderColor: character.accentColor
                }}
              >
                {character.id === 'char_1' ? (
                  <img 
                    src={lumiAvatar} 
                    alt={character.name} 
                    className="w-full h-full object-cover"
                  />
                ) : character.id === 'char_2' ? (
                  <img 
                    src={kaiAvatar} 
                    alt={character.name} 
                    className="w-full h-full object-cover"
                  />
                ) : character.id === 'char_3' ? (
                  <img 
                    src={leoAvatar} 
                    alt={character.name} 
                    className="w-full h-full object-cover"
                  />
                ) : character.id === 'char_4' ? (
                  <img 
                    src={riveAvatar} 
                    alt={character.name} 
                    className="w-full h-full object-cover"
                  />
                ) : character.id === 'char_group' ? (
                  <img 
                    src={groupAvatar} 
                    alt={character.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">{character.avatar}</span>
                )}
              </div>
              <h2 className="text-2xl mb-1">{character.name}</h2>
              <p className="text-sm text-gray-500 mb-2">{character.role}</p>
              <p 
                className="text-sm px-4 py-2 rounded-full"
                style={{ 
                  backgroundColor: character.color,
                  color: character.id === 'char_1' ? '#8B4513' : character.id === 'char_group' ? '#374151' : '#ffffff'
                }}
              >
                {character.symbol}
              </p>
            </div>

            <div className="space-y-5">
              {/* Slogan */}
              <div>
                <div 
                  className="p-4 rounded-xl text-center italic"
                  style={{ 
                    backgroundColor: character.color,
                    color: character.id === 'char_1' ? '#8B4513' : character.id === 'char_group' ? '#374151' : '#ffffff'
                  }}
                >
                  "{character.slogan}"
                </div>
              </div>

              {/* Full Description */}
              <div>
                <h3 className="text-sm text-gray-500 mb-2">소개</h3>
                <p className="text-sm leading-relaxed">{details.fullDescription}</p>
              </div>

              {/* Conversation Style */}
              {details.conversationStyle && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-2">대화 스타일</h3>
                  <p className="text-sm">{details.conversationStyle}</p>
                </div>
              )}

              {/* Personality */}
              {details.personality.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-2">성격</h3>
                  <div className="flex flex-wrap gap-2">
                    {details.personality.map((trait, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ 
                          backgroundColor: character.accentColor + '40',
                          color: character.id === 'char_1' ? '#8B4513' : character.id === 'char_group' ? '#374151' : character.accentColor
                        }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Greeting */}
              <div>
                <h3 className="text-sm text-gray-500 mb-2">인사말</h3>
                <div 
                  className="p-3 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: character.accentColor + '20' }}
                >
                  {details.greeting}
                </div>
              </div>

              {/* Specialty */}
              <div>
                <h3 className="text-sm text-gray-500 mb-2">이런 분께 추천해요</h3>
                <p className="text-sm">{details.specialty}</p>
              </div>

              {/* Examples */}
              {details.examples.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-2">대화 예시</h3>
                  <div className="space-y-2">
                    {details.examples.map((example, index) => (
                      <div 
                        key={index} 
                        className="p-3 rounded-lg text-sm bg-gray-50 border border-gray-200"
                      >
                        <p className="text-gray-700">{example}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Features */}
              {character.hasCalendar && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-2">특별 기능</h3>
                  <div 
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ backgroundColor: character.accentColor + '30' }}
                  >
                    <span className="text-xl">📅</span>
                    <div>
                      <p className="text-sm">구글 캘린더 연동</p>
                      <p className="text-xs text-gray-600">일정 분석 및 루틴 관리를 도와드립니다</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3">💡 대화 팁</h3>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>• 편하게 일상 이야기를 나눠보세요</li>
              <li>• 감정이나 고민을 솔직하게 표현해보세요</li>
              <li>• {character.name}는 항상 당신의 편입니다</li>
              <li>• 대화 내용은 안전하게 보호됩니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
