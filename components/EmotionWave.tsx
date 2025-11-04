import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface EmotionWaveProps {
  emotions?: string[]; // AI 분석된 감정들 (여러 개 가능, 없으면 랜덤)
}

// 일기 emotion 값을 한국어로 매핑
const emotionMapping: Record<string, string> = {
  happy: '행복',
  sad: '슬픔',
  anxious: '불안',
  calm: '평온',
  excited: '기쁨',
  angry: '분노',
  tired: '중립',
  neutral: '중립',
};

// 감정별 색상 매핑 (메인 색 + 다양한 톤)
const emotionColors: Record<string, string[]> = {
  행복: ['#FFD700', '#FFA500', '#FFB84D', '#FF8C00', '#FFCC66', '#F4A460'],
  기쁨: ['#FFD700', '#FFA500', '#FFB84D', '#FF8C00', '#FFCC66', '#F4A460'],
  즐거움: ['#FFD700', '#FFA500', '#FFB84D', '#FF8C00', '#FFCC66', '#F4A460'],
  설레: ['#FF69B4', '#FFB6C1', '#FF1493', '#C71585', '#DB7093', '#FFA0C0'],
  
  슬픔: ['#4169E1', '#5B9BD5', '#1E90FF', '#00BFFF', '#6CA6CD', '#87CEEB'],
  우울: ['#4169E1', '#5B9BD5', '#1E90FF', '#6495ED', '#87CEEB', '#B0C4DE'],
  외로움: ['#6495ED', '#7B9FC7', '#4682B4', '#5F9EA0', '#8AABC1', '#A4BDD4'],
  슬퍼: ['#4169E1', '#5B9BD5', '#1E90FF', '#00BFFF', '#6CA6CD', '#87CEEB'],
  
  분노: ['#DC143C', '#FF4500', '#FF6347', '#CD5C5C', '#E9967A', '#FA8072'],
  짜증: ['#FF4500', '#FF6347', '#FF7F50', '#FFA07A', '#FF8C69', '#FFB090'],
  화: ['#DC143C', '#FF4500', '#FF6347', '#CD5C5C', '#E9967A', '#FA8072'],
  화나: ['#DC143C', '#FF4500', '#FF6347', '#CD5C5C', '#E9967A', '#FA8072'],
  
  불안: ['#9370DB', '#8A2BE2', '#9932CC', '#BA55D3', '#B88BD6', '#C9A0DC'],
  두려움: ['#8B7D9B', '#9B8FAA', '#7B68A0', '#6A5ACD', '#8875B3', '#A094C4'],
  걱정: ['#9370DB', '#BA55D3', '#DA70D6', '#B88BD6', '#C9A0DC', '#D8BFD8'],
  불안해: ['#9370DB', '#8A2BE2', '#9932CC', '#BA55D3', '#B88BD6', '#C9A0DC'],
  
  평온: ['#3CB371', '#2E8B57', '#20B2AA', '#5DBB7F', '#66CDAA', '#7DD99A'],
  차분: ['#48D1CC', '#40E0D0', '#00CED1', '#5FD8D3', '#7FDFDB', '#AFEEEE'],
  안정: ['#66CDAA', '#7FFFD4', '#AFEEEE', '#8FD9BA', '#98E0C6', '#B0E7D3'],
  평온해: ['#3CB371', '#2E8B57', '#20B2AA', '#5DBB7F', '#66CDAA', '#7DD99A'],
  
  중립: ['#A9A9A9', '#B8B8B8', '#C0C0C0', '#BEBEBE', '#D3D3D3', '#DCDCDC'],
  보통: ['#B0B0B0', '#BABABA', '#C8C8C8', '#D0D0D0', '#D8D8D8', '#E0E0E0'],
  피곤: ['#A9A9A9', '#B8B8B8', '#C0C0C0', '#BEBEBE', '#D3D3D3', '#DCDCDC'],
  피곤해: ['#A9A9A9', '#B8B8B8', '#C0C0C0', '#BEBEBE', '#D3D3D3', '#DCDCDC'],
};

// 감정별 문구
const emotionMessages: Record<string, string[]> = {
  행복: [
    '행복은 파도처럼 밀려옵니다',
    '기쁨의 물결이 당신을 감싸고 있어요',
    '환한 빛이 마음에 스며듭니다',
  ],
  기쁨: [
    '즐거운 에너지가 흐르고 있어요',
    '웃음이 파도처럼 번져갑니다',
    '기쁨의 물결에 몸을 맡겨보세요',
  ],
  슬픔: [
    '슬픔도 흘러갑니다',
    '눈물도 언젠가 마르고, 파도는 다시 밀려옵니다',
    '감정의 물결은 멈추지 않아요',
  ],
  우울: [
    '깊은 바다도 언젠가 잔잔해집니다',
    '어두운 파도 뒤엔 빛이 기다려요',
    '이 감정도 흐를 거예요',
  ],
  분노: [
    '격한 물결도 시간이 지나면 가라앉습니다',
    '감정의 파도에 휩쓸리지 마세요',
    '분노도 흐르는 물결일 뿐이에요',
  ],
  불안: [
    '불안한 물결 너머로 고요함이 있어요',
    '이 파도도 지나갈 거예요',
    '감정은 흐르고 변화합니다',
  ],
  평온: [
    '고요한 물결이 마음을 감싸고 있어요',
    '평화로운 파도가 당신과 함께합니다',
    '차분한 물결에 몸을 맡겨보세요',
  ],
  중립: [
    '고요한 물결 속에서 자신을 발견하세요',
    '모든 감정은 흘러갑니다',
    '감정의 파도는 계속 움직입니다',
  ],
};

// 기본 색상 (랜덤 선택용) - 더 다채로운 그라데이션
const defaultColors = [
  ['#87CEEB', '#9DD5ED', '#6CA6CD', '#B2D9F0', '#4A708B', '#A8C8E1'], // 하늘색
  ['#FFB6C1', '#FFC8D3', '#FF69B4', '#FF85C1', '#FF1493', '#FF96C7'], // 핑크
  ['#98FB98', '#ADFCAD', '#90EE90', '#B0F5B0', '#00FA9A', '#7FFCB8'], // 연두색
  ['#DDA0DD', '#E6B3E6', '#DA70D6', '#E589E5', '#BA55D3', '#D896D8'], // 보라
  ['#F0E68C', '#F5ECA3', '#FFD700', '#FFE033', '#FFA500', '#FFCC66'], // 노랑
];

const defaultMessages = [
  '감정은 머무는 게 아니라 흐릅니다',
  '오늘의 파도를 타고 흘러가세요',
  '내면의 물결을 느껴보세요',
  '당신의 감정은 아름다운 파도입니다',
  '모든 감정은 흐르고 변화합니다',
];

// 복합 감정 메시지
const mixedEmotionMessages = [
  '여러 감정이 섞여 흐르고 있어요',
  '복잡한 마음도 괜찮아요, 모두 흘러갑니다',
  '다양한 감정의 물결이 공존하고 있네요',
  '감정은 하나가 아니어도 돼요',
  '여러 색의 파도가 어우러지고 있어요',
];

export function EmotionWave({ emotions }: EmotionWaveProps) {
  // localStorage에서 마지막 감정 상태 가져오기
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem('emotionWaveState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          colors: parsed.colors || ['#87CEEB', '#6CA6CD', '#4A708B'],
          message: parsed.message || '감정은 머무는 게 아니라 흐릅니다',
        };
      }
    } catch (e) {
      console.error('Failed to load emotion wave state:', e);
    }
    return {
      colors: ['#87CEEB', '#6CA6CD', '#4A708B'],
      message: '감정은 머무는 게 아니라 흐릅니다',
    };
  };

  const initialState = getInitialState();
  const [colors, setColors] = useState<string[]>(initialState.colors);
  const [message, setMessage] = useState(initialState.message);
  const [lastEmotions, setLastEmotions] = useState<string[]>([]);

  useEffect(() => {
    // 감정이 이전과 같으면 업데이트하지 않음
    if (emotions && emotions.length > 0) {
      const emotionsStr = JSON.stringify(emotions.sort());
      const lastEmotionsStr = JSON.stringify(lastEmotions.sort());
      
      if (emotionsStr === lastEmotionsStr) {
        return;
      }
      
      setLastEmotions(emotions);
      // 여러 감정을 매칭 (일기 emotion 값을 한국어로 변환)
      const matchedEmotions = emotions
        .map(emotion => {
          // 일기 emotion 값인 경우 한국어로 변환
          const koreanEmotion = emotionMapping[emotion] || emotion;
          return Object.keys(emotionColors).find(key => 
            koreanEmotion.includes(key) || key.includes(koreanEmotion)
          );
        })
        .filter(Boolean) as string[];

      if (matchedEmotions.length > 0) {
        let newColors: string[];
        let newMessage: string;
        
        if (matchedEmotions.length === 1) {
          // 단일 감정
          newColors = emotionColors[matchedEmotions[0]];
          const messages = emotionMessages[matchedEmotions[0]] || defaultMessages;
          newMessage = messages[Math.floor(Math.random() * messages.length)];
        } else {
          // 여러 감정 - 색상 혼합
          const allColors: string[] = [];
          matchedEmotions.forEach(emotion => {
            allColors.push(...emotionColors[emotion]);
          });
          
          // 감정 개수만큼 색상 선택 (최대 6개)
          const selectedColors: string[] = [];
          const step = Math.max(1, Math.floor(allColors.length / 6));
          for (let i = 0; i < allColors.length && selectedColors.length < 6; i += step) {
            selectedColors.push(allColors[i]);
          }
          
          // 최소 3개 색상 보장
          while (selectedColors.length < 3) {
            selectedColors.push(allColors[Math.floor(Math.random() * allColors.length)]);
          }
          
          newColors = selectedColors;
          newMessage = mixedEmotionMessages[Math.floor(Math.random() * mixedEmotionMessages.length)];
        }
        
        setColors(newColors);
        setMessage(newMessage);
        
        // localStorage에 저장
        try {
          localStorage.setItem('emotionWaveState', JSON.stringify({
            colors: newColors,
            message: newMessage,
          }));
        } catch (e) {
          console.error('Failed to save emotion wave state:', e);
        }
      } else {
        // 매칭되는 감정이 없으면 랜덤
        const randomColorSet = defaultColors[Math.floor(Math.random() * defaultColors.length)];
        const randomMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
        
        setColors(randomColorSet);
        setMessage(randomMessage);
        
        // localStorage에 저장
        try {
          localStorage.setItem('emotionWaveState', JSON.stringify({
            colors: randomColorSet,
            message: randomMessage,
          }));
        } catch (e) {
          console.error('Failed to save emotion wave state:', e);
        }
      }
    } else {
      // AI 분석이 없으면 이전 상태 유지 (localStorage에서 로드한 상태)
      // 아무것도 하지 않음
    }
  }, [emotions]);

  return (
    <div className="relative w-full h-24 sm:h-32 overflow-hidden rounded-lg">
      {/* 배경 그라데이션 */}
      <div 
        className="absolute inset-0"
        style={{
          background: colors.length > 3
            ? `linear-gradient(to right, ${colors.slice(0, Math.min(colors.length, 6)).join(', ')})`
            : `linear-gradient(to right, ${colors[0]}, ${colors[1]}, ${colors[2] || colors[0]})`,
          opacity: 0.3,
        }}
      />
      
      {/* 파도 애니메이션 레이어들 */}
      {[0, 1, 2].map((index) => {
        const colorIndex1 = index % colors.length;
        const colorIndex2 = (index + 1) % colors.length;
        const colorIndex3 = (index + 2) % colors.length;
        
        return (
          <motion.div
            key={index}
            className="absolute inset-0"
            style={{
              background: colors.length > 3
                ? `linear-gradient(to right, ${colors[colorIndex1]}, ${colors[colorIndex2]}, ${colors[colorIndex3]})`
                : `linear-gradient(to right, ${colors[colorIndex1]}, ${colors[colorIndex2]})`,
              opacity: 0.4 - index * 0.1,
            }}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 15 + index * 3,
              repeat: Infinity,
              ease: 'linear',
              delay: index * 0.8,
            }}
          >
            <svg
              className="absolute bottom-0 w-[200%] h-full"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M0,60 Q150,20 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z"
                fill="currentColor"
                style={{ color: colors[colorIndex1] }}
                animate={{
                  d: [
                    "M0,60 Q150,20 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z",
                    "M0,60 Q150,100 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z",
                    "M0,60 Q150,20 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z",
                  ],
                }}
                transition={{
                  duration: 6 + index * 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </svg>
          </motion.div>
        );
      })}
      
      {/* 메시지 */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <motion.p
          className="text-white text-sm sm:text-base px-4 py-2 rounded-full backdrop-blur-sm bg-black/20 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}
