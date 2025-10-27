import { useState, useEffect } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface TutorialStep {
  title: string;
  description: string;
  image?: string;
  emoji: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    emoji: '👋',
    title: 'BreezI에 오신 것을 환영해요!',
    description: '마음을 나누고 감정을 관리하는 AI 심리 케어 서비스입니다.',
  },
  {
    emoji: '💬',
    title: 'AI 캐릭터와 대화하세요',
    description: '곰, 토끼, 강아지 중 마음에 드는 캐릭터를 선택하고 일상을 나눠보세요. 최대 3개의 채팅방을 만들 수 있어요.',
  },
  {
    emoji: '📔',
    title: '한 줄 일기를 작성하세요',
    description: '채팅 내용을 바탕으로 자동 초안이 생성돼요. 직접 작성할 수도 있습니다.',
  },
  {
    emoji: '📊',
    title: '감정 리포트를 확인하세요',
    description: '주간·월간 감정 패턴을 그래프로 확인하고, 나의 마음 상태를 파악해보세요.',
  },
  {
    emoji: '📅',
    title: '캘린더로 일정을 관리하세요',
    description: '할일과 일정을 등록하고, 감정과 일기를 함께 볼 수 있어요.',
  },
  {
    emoji: '🌸',
    title: '커뮤니티에서 마음을 공유하세요',
    description: '익명으로 마음을 나누고, 다른 사람들의 이야기에 공감해보세요.',
  },
];

interface OnboardingTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 온보딩 튜토리얼 (Controlled Component)
 */
export function OnboardingTutorial({ open, onOpenChange }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // 다이얼로그가 닫힐 때 현재 스텝 리셋
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const handleComplete = () => {
    onOpenChange(false);
  };

  const currentTutorial = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" aria-describedby="tutorial-description">
        <VisuallyHidden.Root>
          <DialogTitle>온보딩 튜토리얼</DialogTitle>
          <DialogDescription id="tutorial-description">
            BreezI 서비스 사용 방법을 안내합니다
          </DialogDescription>
        </VisuallyHidden.Root>
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-400 to-pink-400 p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-6xl mb-3">{currentTutorial.emoji}</div>
          <h2 className="text-xl mb-2">{currentTutorial.title}</h2>
          <p className="text-white/90 text-sm">{currentTutorial.description}</p>
        </div>

        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex gap-1 mb-6">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {!isLastStep && (
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              건너뛰기
            </Button>
          )}
          <Button
            onClick={handleNext}
            className={`${isLastStep ? 'w-full' : 'flex-1'} bg-orange-500 hover:bg-orange-600`}
          >
            {isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                시작하기
              </>
            ) : (
              <>
                다음
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Step counter */}
        <div className="text-center pb-4 text-xs text-gray-500">
          {currentStep + 1} / {TUTORIAL_STEPS.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 튜토리얼 다시 보기 버튼 (설정 페이지 등에서 사용)
 */
export function ResetTutorialButton() {
  const handleReset = () => {
    localStorage.removeItem('hasSeenTutorial');
    window.location.reload();
  };

  return (
    <Button onClick={handleReset} variant="outline" size="sm">
      튜토리얼 다시 보기
    </Button>
  );
}
