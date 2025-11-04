import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { apiCall } from '../utils/api';
import { EmotionSticker } from './EmotionStickers';
import { toast } from 'sonner';

interface TimeCapsule {
  id: string;
  diaryId: string;
  diaryTitle: string;
  openDate: string;
  createdAt: string;
  isOpen: boolean;
}

export function TimeCapsuleSection() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCapsule, setSelectedCapsule] = useState<TimeCapsule | null>(null);
  const [openedDiary, setOpenedDiary] = useState<any>(null);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [floatingParticles] = useState(() => 
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    }))
  );

  useEffect(() => {
    loadCapsules();
  }, []);

  const loadCapsules = async () => {
    try {
      const result = await apiCall('/timecapsule/list');
      console.log('Loaded time capsules:', result);
      setCapsules(result.capsules || []);
    } catch (error) {
      console.error('Failed to load capsules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapsuleClick = async (capsule: TimeCapsule) => {
    const daysUntil = getDaysUntilOpen(capsule.openDate);
    const canOpen = daysUntil <= 0;

    if (!canOpen) {
      // Just show info
      return;
    }

    // Can open - try to open it
    setIsOpening(true);
    try {
      const result = await apiCall(`/timecapsule/open/${capsule.id}`, {
        method: 'POST',
      });

      if (result.success) {
        setSelectedCapsule(capsule);
        setOpenedDiary(result.diary);
        setIsOpenDialogOpen(true);
        // Reload capsules to update UI
        await loadCapsules();
      }
    } catch (error: any) {
      console.error('Failed to open capsule:', error);
      toast.error(error.message || '캡슐을 여는데 실패했습니다.');
    } finally {
      setIsOpening(false);
    }
  };

  const closedCapsules = capsules.filter(c => !c.isOpen);

  const getDaysUntilOpen = (openDate: string) => {
    // openDate는 "YYYY-MM-DD" 형식
    // 현재 날짜를 로컬 타임존 기준 "YYYY-MM-DD" 형식으로 가져오기
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // 두 날짜를 모두 로컬 타임존의 00:00:00으로 설정해서 비교
    const openDateObj = new Date(openDate + 'T00:00:00');
    const todayDateObj = new Date(todayStr + 'T00:00:00');
    
    const diff = Math.ceil((openDateObj.getTime() - todayDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Time capsule check:', {
      openDate,
      todayStr,
      openDateTime: openDateObj.getTime(),
      todayDateTime: todayDateObj.getTime(),
      diff
    });
    
    return diff;
  };

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 40%, #1e293b 70%, #1e3a8a 100%)' }}>
      {/* 잔잔한 파도 효과 - 첫번째 레이어 (가장 밝고 진함) */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.4) 50%, transparent 100%)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* 잔잔한 파도 효과 - 두번째 레이어 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.35) 50%, transparent 100%)',
        }}
        animate={{
          x: ['100%', '-100%'],
        }}
        transition={{
          duration: 23,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* 세번째 레이어 - 더 느리게 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(30, 58, 138, 0.25) 50%, transparent 100%)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* 매우 은은한 빛 효과 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl text-blue-200 mb-2">🐚 타임캡슐 보관소</h2>
          <p className="text-sm text-blue-300/60">심해에 잠긴 소중한 기억들</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-300 border-t-transparent rounded-full"
            />
          </div>
        ) : closedCapsules.length === 0 ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🐚
            </motion.div>
            <p className="text-blue-300/70">아직 보관된 캡슐이 없어요</p>
            <p className="text-sm text-blue-300/50 mt-2">일기에서 타임캡슐을 만들어보세요</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                보관 중인 캡슐 {closedCapsules.length}개
              </Badge>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {closedCapsules.map((capsule, index) => {
                const daysUntil = getDaysUntilOpen(capsule.openDate);
                const canOpen = daysUntil <= 0;

                return (
                  <TooltipProvider key={capsule.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ 
                            scale: 1.1,
                            transition: { duration: 0.2 }
                          }}
                          onClick={() => handleCapsuleClick(capsule)}
                          className="cursor-pointer"
                        >
                          <ClamShell canOpen={canOpen} />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-slate-900 border-blue-500/30"
                      >
                        <div className="text-center">
                          {canOpen ? (
                            <p className="text-xs text-green-400">✨ 지금 열어볼 수 있어요!</p>
                          ) : (
                            <p className="text-xs text-blue-300">
                              {daysUntil}일 후 열림 ({capsule.openDate})
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Opened Capsule Dialog */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🐚 타임캡슐을 열었습니다!
            </DialogTitle>
            <DialogDescription>
              {selectedCapsule && `${selectedCapsule.createdAt.split('T')[0]}에 담아둔 소중한 기억`}
            </DialogDescription>
          </DialogHeader>

          {openedDiary && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <EmotionSticker emotion={openedDiary.emotion} size="normal" />
                  <div>
                    <CardTitle>{openedDiary.title}</CardTitle>
                    <CardDescription>{openedDiary.date}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{openedDiary.content}</p>
                </div>

                {openedDiary.praise && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-800 mb-1">✨ 잘한 일</p>
                    <p className="text-sm text-green-900">{openedDiary.praise}</p>
                  </div>
                )}

                {openedDiary.regret && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-800 mb-1">💭 아쉬운 점</p>
                    <p className="text-sm text-blue-900">{openedDiary.regret}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setIsOpenDialogOpen(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 조개껍질 컴포넌트 - 안에 일기 종이가 들어있음
function ClamShell({ canOpen }: { canOpen: boolean }) {
  return (
    <div className="relative w-full aspect-square flex items-center justify-center">
      <svg viewBox="0 0 80 80" className="w-1/2 h-1/2 drop-shadow-xl">
        <defs>
          {/* 조개 그라디언트 */}
          <radialGradient id={`shellGrad-${canOpen}`} cx="50%" cy="30%">
            <stop offset="0%" stopColor={canOpen ? "#fef3c7" : "#dbeafe"} />
            <stop offset="50%" stopColor={canOpen ? "#fde68a" : "#bfdbfe"} />
            <stop offset="100%" stopColor={canOpen ? "#fbbf24" : "#93c5fd"} />
          </radialGradient>
          
          {/* 종이 그라디언트 */}
          <linearGradient id={`paper-${canOpen}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fefce8" />
            <stop offset="50%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
          
          {/* 글로우 효과 */}
          <filter id={`glow-${canOpen}`}>
            <feGaussianBlur stdDeviation={canOpen ? "3" : "1"} result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 조개 하단 */}
        <ellipse
          cx="40"
          cy="50"
          rx="28"
          ry="18"
          fill={`url(#shellGrad-${canOpen})`}
          opacity="0.9"
        />
        
        {/* 조개 무늬 */}
        {[20, 28, 36, 44, 52, 60].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="32"
            x2={40}
            y2="50"
            stroke={canOpen ? "#f59e0b" : "#3b82f6"}
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}

        {/* 일기 종이 (말려있는 모양) */}
        <motion.g
          animate={{
            opacity: canOpen ? [0.7, 0.9, 0.7] : [0.5, 0.6, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* 종이 본체 */}
          <rect
            x="30"
            y="36"
            width="20"
            height="10"
            rx="2"
            fill={`url(#paper-${canOpen})`}
            opacity="0.9"
          />
          
          {/* 종이 텍스트 라인 */}
          <line x1="32" y1="39" x2="46" y2="39" stroke="#d97706" strokeWidth="0.5" opacity="0.4" />
          <line x1="32" y1="41" x2="48" y2="41" stroke="#d97706" strokeWidth="0.5" opacity="0.4" />
          <line x1="32" y1="43" x2="44" y2="43" stroke="#d97706" strokeWidth="0.5" opacity="0.4" />
          
          {/* 종이 왼쪽 말린 부분 */}
          <ellipse
            cx="30"
            cy="41"
            rx="2"
            ry="5"
            fill="#fef3c7"
            opacity="0.8"
          />
          
          {/* 종이 오른쪽 말린 부분 */}
          <ellipse
            cx="50"
            cy="41"
            rx="2"
            ry="5"
            fill="#fef3c7"
            opacity="0.8"
          />
        </motion.g>

        {/* 조개 상단 (열림 애니메이션) */}
        <motion.ellipse
          cx="40"
          cy={canOpen ? "28" : "32"}
          rx="28"
          ry="16"
          fill={`url(#shellGrad-${canOpen})`}
          opacity="0.95"
          animate={canOpen ? {
            cy: [32, 28, 30, 28],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* 반짝임 효과 (열릴 때) */}
        {canOpen && (
          <>
            <motion.circle
              cx="40"
              cy="40"
              r="18"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.5, 0.8],
                opacity: [0, 0.7, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
            <motion.circle
              cx="40"
              cy="40"
              r="22"
              fill="none"
              stroke="#fef3c7"
              strokeWidth="1"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: [0.9, 1.6, 0.9],
                opacity: [0, 0.5, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.4
              }}
            />
          </>
        )}
      </svg>
    </div>
  );
}
