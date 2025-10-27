import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * 앱 시작 시 표시되는 스플래시 스크린
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      // 애니메이션 완료 후 콜백 실행
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600"
    >
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-white blur-3xl"
        />
      </div>

      {/* 메인 컨텐츠 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 text-center"
      >
        {/* 아이콘 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.4
          }}
          className="mb-6"
        >
          <div className="relative">
            <motion.div
              animate={{ 
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-white/30 to-transparent blur-xl"
            />
            <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-8 border-2 border-white/30">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-7xl"
              >
                🌊
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 로고 텍스트 */}
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-5xl font-bold text-white mb-3"
        >
          BreezI
        </motion.h1>

        {/* 서브 텍스트 */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-lg text-white/90"
        >
          마음을 위한 따뜻한 공간
        </motion.p>

        {/* 로딩 인디케이터 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-8 flex justify-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 rounded-full bg-white"
            />
          ))}
        </motion.div>
      </motion.div>

      {/* 하단 장식 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="absolute bottom-12 text-white/60 text-sm"
      >
        AI 심리 케어 서비스
      </motion.div>
    </motion.div>
  );
}
