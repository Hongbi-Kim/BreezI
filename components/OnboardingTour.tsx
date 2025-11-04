import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  targetTab?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Wave I에 오신 것을 환영합니다! 🌊',
    description: 'AI 캐릭터와 대화하며 감정을 기록하고, 마음을 관리하는 여정을 시작해보세요.',
    icon: '👋'
  },
  {
    title: 'Wave 탭에서 시작하세요',
    description: '홈 화면에서 감정정원, 미션, 타임캡슐 등 다양한 기능을 한눈에 확인할 수 있어요.',
    icon: '🏠',
    targetTab: 'wave'
  },
  {
    title: 'AI 캐릭터와 대화하기',
    description: '루미, 카이, 레오, 리브와 대화하며 마음을 털어놓아보세요. 각 캐릭터마다 특별한 역할이 있어요.',
    icon: '💬',
    targetTab: 'chat'
  },
  {
    title: '감정 일기 작성하기',
    description: '하루를 마무리하며 감정을 기록해보세요. 타임캡슐에 넣어 미래의 나에게 전달할 수도 있어요.',
    icon: '📖',
    targetTab: 'diary'
  },
  {
    title: '감정 리포트 확인하기',
    description: '주간/월간 감정 패턴을 분석하고, 나만의 감정 흐름을 이해해보세요.',
    icon: '📊',
    targetTab: 'report'
  },
  {
    title: '준비 완료!',
    description: '이제 Wave I와 함께 내면의 파도를 타며 성장하는 여정을 시작해보세요. Ride your inner wave! 🌊',
    icon: '🎉'
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkipNow = () => {
    setIsVisible(false);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
          >
            {/* Close button */}
            <button
              onClick={handleSkipNow}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="text-center mb-6">
              <motion.div
                key={currentStep}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-6xl mb-4"
              >
                {step.icon}
              </motion.div>

              <motion.h2
                key={`title-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl mb-3"
              >
                {step.title}
              </motion.h2>

              <motion.p
                key={`desc-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-600 text-sm leading-relaxed"
              >
                {step.description}
              </motion.p>
            </div>

            {/* Progress indicators */}
            <div className="flex justify-center gap-2 mb-6">
              {onboardingSteps.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-blue-600 w-8'
                      : index < currentStep
                      ? 'bg-blue-300 w-2'
                      : 'bg-gray-300 w-2'
                  }`}
                  initial={false}
                  animate={{
                    width: index === currentStep ? 32 : 8,
                  }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                {isLastStep ? '시작하기' : '다음'}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>

            {/* Skip button */}
            {!isLastStep && (
              <button
                onClick={handleSkipNow}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4 transition-colors"
              >
                건너뛰기
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
