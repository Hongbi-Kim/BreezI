import { motion } from 'motion/react';

// Custom emotion sticker components with unique SVG designs
interface StickerProps {
  className?: string;
}

export const HappySticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Happy sun-like face */}
    <circle cx="50" cy="50" r="35" fill="#FFD93D" />
    <circle cx="38" cy="42" r="4" fill="#2D3748" />
    <circle cx="62" cy="42" r="4" fill="#2D3748" />
    <path d="M 35 58 Q 50 68 65 58" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Sun rays */}
    <circle cx="50" cy="50" r="42" fill="none" stroke="#FFD93D" strokeWidth="4" opacity="0.3" />
  </svg>
);

export const SadSticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Sad teardrop face */}
    <circle cx="50" cy="50" r="35" fill="#93C5FD" />
    <circle cx="38" cy="42" r="4" fill="#2D3748" />
    <circle cx="62" cy="42" r="4" fill="#2D3748" />
    <path d="M 35 62 Q 50 54 65 62" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Tear */}
    <ellipse cx="68" cy="55" rx="4" ry="8" fill="#60A5FA" opacity="0.7" />
  </svg>
);

export const AnxiousSticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Anxious spiral face */}
    <circle cx="50" cy="50" r="35" fill="#C4B5FD" />
    <circle cx="38" cy="42" r="3" fill="#2D3748" />
    <circle cx="62" cy="42" r="3" fill="#2D3748" />
    <path d="M 40 58 L 60 58" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" />
    {/* Swirl lines */}
    <path d="M 25 30 Q 20 25 15 25" stroke="#A78BFA" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M 75 30 Q 80 25 85 25" stroke="#A78BFA" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

export const CalmSticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Calm wave face */}
    <circle cx="50" cy="50" r="35" fill="#6EE7B7" />
    <path d="M 35 42 Q 36 40 38 42" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M 62 42 Q 63 40 65 42" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M 38 58 Q 50 60 62 58" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Wave */}
    <path d="M 15 65 Q 25 60 35 65 Q 45 70 55 65 Q 65 60 75 65 Q 85 70 90 65" 
          stroke="#10B981" strokeWidth="2" fill="none" opacity="0.4" />
  </svg>
);

export const ExcitedSticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Excited sparkle face */}
    <circle cx="50" cy="50" r="35" fill="#FCA5A5" />
    <circle cx="38" cy="42" r="5" fill="#2D3748" />
    <circle cx="62" cy="42" r="5" fill="#2D3748" />
    <ellipse cx="50" cy="60" rx="8" ry="12" fill="#2D3748" />
    {/* Sparkles */}
    <path d="M 20 25 L 22 30 L 27 28 L 23 32 L 25 37 L 20 34 L 15 37 L 17 32 L 13 28 L 18 30 Z" 
          fill="#FEF3C7" opacity="0.8" />
    <path d="M 78 70 L 80 75 L 85 73 L 81 77 L 83 82 L 78 79 L 73 82 L 75 77 L 71 73 L 76 75 Z" 
          fill="#FEF3C7" opacity="0.8" />
  </svg>
);

export const AngrySticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Angry flame face */}
    <circle cx="50" cy="50" r="35" fill="#FCA5A5" />
    <path d="M 32 38 L 38 44 L 44 38" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M 56 38 L 62 44 L 68 38" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M 35 62 L 65 62" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" />
    {/* Flames */}
    <path d="M 25 15 Q 20 20 25 28 Q 22 24 25 15" fill="#F87171" opacity="0.6" />
    <path d="M 75 15 Q 70 20 75 28 Q 72 24 75 15" fill="#F87171" opacity="0.6" />
  </svg>
);

export const TiredSticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Tired moon face */}
    <circle cx="50" cy="50" r="35" fill="#D1D5DB" />
    <path d="M 35 42 L 45 42" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" />
    <path d="M 55 42 L 65 42" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" />
    <path d="M 40 60 Q 50 56 60 60" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Zzz */}
    <text x="70" y="30" fontSize="12" fill="#9CA3AF" fontWeight="bold">Z</text>
    <text x="75" y="22" fontSize="10" fill="#9CA3AF" fontWeight="bold">z</text>
    <text x="78" y="16" fontSize="8" fill="#9CA3AF" fontWeight="bold">z</text>
  </svg>
);

export const NeutralSticker = ({ className = '' }: StickerProps) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Neutral simple face */}
    <circle cx="50" cy="50" r="35" fill="#F3F4F6" />
    <circle cx="38" cy="42" r="3" fill="#2D3748" />
    <circle cx="62" cy="42" r="3" fill="#2D3748" />
    <line x1="40" y1="60" x2="60" y2="60" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

interface EmotionStickerProps {
  emotion: string;
  size?: 'small' | 'normal' | 'large';
}

export const EmotionSticker = ({ emotion, size = 'normal' }: EmotionStickerProps) => {
  const sizeClasses = {
    small: 'w-6 h-6 sm:w-8 sm:h-8',
    normal: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const StickerComponent = {
    happy: HappySticker,
    sad: SadSticker,
    anxious: AnxiousSticker,
    calm: CalmSticker,
    excited: ExcitedSticker,
    angry: AngrySticker,
    tired: TiredSticker,
    neutral: NeutralSticker
  }[emotion] || NeutralSticker;

  return (
    <motion.div
      whileHover={{ 
        scale: 1.2,
        rotate: [0, -10, 10, -10, 0],
        y: [0, -5, 0, -3, 0]
      }}
      whileTap={{ scale: 0.9 }}
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 10
      }}
    >
      <StickerComponent className={sizeClasses[size]} />
    </motion.div>
  );
};
