import { motion } from 'framer-motion';
import { Cloud, Plane } from 'lucide-react';

interface WaveLoopAnimationProps {
  className?: string;
  showPlane?: boolean;
  showCloud?: boolean;
}

export function WaveLoopAnimation({ 
  className = '', 
  showPlane = true,
  showCloud = true 
}: WaveLoopAnimationProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Clouds - 정적 */}
      {showCloud && (
        <>
          {/* 큰 구름 - lucide icon */}
          <div className="absolute top-0 left-2 text-gray-300">
            <Cloud className="w-8 h-8" />
          </div>
          
          {/* 작은 구름 - 커스텀 SVG (다른 모양) */}
          <div className="absolute top-5 left-12">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 6.5C15.5 6.5 15.8 4 14 3C12.2 2 11 3 11 3C11 3 10.5 1 8.5 1C6.5 1 6 3 6 3C6 3 4 2.5 3 4C2 5.5 3 7 3 7C3 7 1 7 1 9C1 11 3 11 3 11H16C16 11 19 11 19 8.5C19 6 16.5 6.5 15.5 6.5Z" 
                    fill="#D1D5DB" 
                    stroke="#D1D5DB" 
                    strokeWidth="1" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"/>
            </svg>
          </div>
        </>
      )}

      {/* Airplane */}
      {showPlane && (
        <motion.div
          className="absolute top-2 left-0 text-blue-400"
          animate={{
            x: [0, 60],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Plane className="w-4 h-4" />
        </motion.div>
      )}
    </div>
  );
}
