import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { apiCall } from '../utils/api';
import { WaveLogoFull } from './WaveLogoFull';

interface HomeTabProps {
  onEnterApp: () => void;
}

export function HomeTab({ onEnterApp }: HomeTabProps) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiCall('/profile');
      setUserName(data.profile?.nickname || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  return (
    <div className="h-screen relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-purple-50">
      {/* Animated Wave Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large flowing waves */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-full"
            style={{
              top: `${15 + i * 15}%`,
              opacity: 0.06 - i * 0.008,
            }}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 30 + i * 5,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <svg
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="w-full h-28"
            >
              <path
                d="M0,60 Q360,10 720,60 T1440,60 L1440,120 L0,120 Z"
                fill={i % 2 === 0 ? '#3b82f6' : '#a855f7'}
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        {/* Logo and Brand */}
        <div className="text-center mb-12">
          {/* Full Logo with Text */}
          <div className="mb-6 flex justify-center">
            <WaveLogoFull size="large" animated />
          </div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xl text-gray-600 italic">Ride your inner wave</p>
          </motion.div>
        </div>

        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-12 space-y-3"
        >
          {userName && (
            <p className="text-xl text-gray-700">
              환영합니다, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{userName}</span>님
            </p>
          )}
          <p className="text-lg text-gray-600 leading-relaxed">
            오늘의 감정 파도를<br />
            함께 타볼 준비가 되셨나요?
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnterApp}
            className="px-12 py-3.5 bg-black text-white border-2 border-black transition-all duration-200"
            style={{
              fontFamily: '"Arial Black", "Helvetica Bold", sans-serif',
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Enter
          </motion.button>
        </motion.div>

        {/* Feature Highlights */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-3 gap-4 text-center max-w-lg"
        >
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-gray-700">AI 채팅</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <BookText className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-gray-700">감정 일기</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-100">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-gray-700">감정 분석</p>
          </div>
        </motion.div> */}

        {/* Bottom Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="absolute bottom-20 left-0 right-0 text-center px-6"
        >
          <p className="text-sm text-gray-500 italic leading-relaxed">
            "당신의 감정은 파도처럼 흐릅니다.<br />
            Wave I와 함께 그 흐름을 타세요."
          </p>
        </motion.div>
      </div>
    </div>
  );
}
