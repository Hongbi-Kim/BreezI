import { motion } from 'framer-motion';

interface WaveLogoFullProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export function WaveLogoFull({ size = 'medium', animated = false }: WaveLogoFullProps) {
  const sizes = {
    small: { 
      circleSize: 30,
      fontSize: '16px',
      letterSpacing: '0.025em',
      gap: 6,
    },
    medium: { 
      circleSize: 50,
      fontSize: '32px',
      letterSpacing: '0em',
      gap: 10,
    },
    large: { 
      circleSize: 80,
      fontSize: '64px',
      letterSpacing: '0em',
      gap: 15,
    },
  };

  const config = sizes[size];
  const Component = animated ? motion.div : 'div';
  
  const animationProps = animated ? {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  } : {};

  return (
    <Component
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${config.gap}px`,
      }}
      {...animationProps}
    >
      {/* Wave Logo SVG */}
      <svg
        width={config.circleSize}
        height={config.circleSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle */}
        <motion.circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill="url(#waveGradientFull)"
          animate={animated ? {
            scale: [1, 1.05, 1],
          } : undefined}
          transition={animated ? {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          } : undefined}
        />
        
        {/* Wave Layers */}
        <motion.path
          d="M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z"
          fill="rgba(255, 255, 255, 0.3)"
          animate={animated ? {
            d: [
              "M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z",
              "M20 49 Q30 45, 40 49 T60 49 Q70 45, 80 49 L80 75 L20 75 Z",
              "M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z",
            ]
          } : undefined}
          transition={animated ? {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          } : undefined}
        />
        
        <motion.path
          d="M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z"
          fill="rgba(255, 255, 255, 0.5)"
          animate={animated ? {
            d: [
              "M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z",
              "M20 57 Q30 52, 40 57 T60 57 Q70 52, 80 57 L80 75 L20 75 Z",
              "M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z",
            ]
          } : undefined}
          transition={animated ? {
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          } : undefined}
        />
        
        <motion.path
          d="M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z"
          fill="rgba(255, 255, 255, 0.8)"
          animate={animated ? {
            d: [
              "M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z",
              "M20 63 Q30 59, 40 63 T60 63 Q70 59, 80 63 L80 75 L20 75 Z",
              "M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z",
            ]
          } : undefined}
          transition={animated ? {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          } : undefined}
        />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="waveGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
      </svg>

      {/* "wave i" Text */}
      <div
        style={{
          fontFamily: '"Arial Black", "Helvetica Bold", sans-serif',
          fontSize: config.fontSize,
          fontWeight: 900,
          letterSpacing: config.letterSpacing,
          color: '#000',
          // textTransform: 'lowercase',
          lineHeight: 1,
          transform: 'skew(-5deg)',
        }}
      >
        wave I
      </div>
    </Component>
  );
}
