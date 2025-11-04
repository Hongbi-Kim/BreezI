import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall } from "../utils/api";
import { logUserAction } from "../utils/logUserAction";
import { Sprout, Sparkles, Download, Info } from "lucide-react";
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { SubscriptionDialog } from "./SubscriptionDialog";

// Load Google Font for cute handwriting (supports Korean)
if (typeof document !== 'undefined' && !document.querySelector('link[href*="Gamja+Flower"]')) {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Gamja+Flower&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

interface EmotionData {
  emotion: string;
  date: string;
  x: number; // 랜덤 위치 x
  y: number; // 랜덤 위치 y
}

interface UnlockedItem {
  id: string;
  name: string;
  type: "flower" | "pet" | "decoration" | "background";
  description: string;
  icon: string;
  unlockCondition: string;
  isPremium?: boolean; // 프리미엄 아이템 여부
}

const AVAILABLE_ITEMS: UnlockedItem[] = [
  // 꽃들
  {
    id: "happy",
    name: "행복 꽃",
    type: "flower",
    description: "밝�� 노란색 잎으로 행복한 마음을 표현합니다.",
    icon: "🌻",
    unlockCondition: "행복한 감정 1건 기록"
  },
  {
    id: "sad",
    name: "슬픔 꽃",
    type: "flower",
    description: "파란 꽃잎으로 슬픈 마음을 위로합니다.",
    icon: "💙",
    unlockCondition: "슬픈 감정 1건 기록"
  },
  {
    id: "excited",
    name: "설렘 꽃",
    type: "flower",
    description: "분홍빛 벚꽃처럼 설레는 마음을 담았습니다.",
    icon: "🌸",
    unlockCondition: "설레는 감정 1건 기록"
  },
  {
    id: "calm",
    name: "평온 식물",
    type: "flower",
    description: "초록빛 잎으로 평온한 마음을 표현합니다.",
    icon: "🌿",
    unlockCondition: "평온한 감정 1건 기록"
  },
  {
    id: "anxious",
    name: "불안 꽃",
    type: "flower",
    description: "보라색 꽃으로 불안한 마음을 이해합니다.",
    icon: "💜",
    unlockCondition: "불안한 감정 1건 기록"
  },
  {
    id: "angry",
    name: "분노 열매",
    type: "flower",
    description: "붉은 열매로 화난 감정을 표현합니다.",
    icon: "🍒",
    unlockCondition: "화난 감정 1건 ���록"
  },
  {
    id: "tired",
    name: "피곤 식물",
    type: "flower",
    description: "시든 잎����로 피곤한 마음을 위로합니다.",
    icon: "🍂",
    unlockCondition: "피곤한 감정 1건 기록"
  },
  {
    id: "neutral",
    name: "평범 꽃",
    type: "flower",
    description: "하얀 꽃으로 평범한 하루를 기록합니다.",
    icon: "🤍",
    unlockCondition: "평범���� 감정 1건 기록"
  },
  // 동물들
  {
    id: "dog",
    name: "강아지",
    type: "pet",
    description: "정원을 뛰어다니는 귀여운 강아지입니다. 매일의 감정을 함께 기록하면 당신의 친구가 되어줍니다.",
    icon: "🐕",
    unlockCondition: "지난주에 7일 연속 일기 작성"
  },
  {
    id: "cat",
    name: "고양이",
    type: "pet",
    description: "나른하게 정원을 거니는 우아한 고양이입니다. 다양한 감정을 경험하면 나타납니다.",
    icon: "🐈",
    unlockCondition: "지난주에 3가지 이상 다른 감정 기록"
  },
  {
    id: "butterfly",
    name: "나비",
    type: "decoration",
    description: "정원 위를 우아하게 날아다니는 나비입니다. 긍정적인 마음을 가지면 찾아옵니다.",
    icon: "🦋",
    unlockCondition: "지난주에 긍정적 감정(행복/설렘/평온) 4회 이상 기록"
  },
  {
    id: "default_sun",
    name: "해",
    type: "decoration",
    description: "밝게 빛나는 기본 해입니다. 정원을 환하게 비춰줍니다.",
    icon: "☀️",
    unlockCondition: "기본 제공",
    isPremium: false
  },
  
  // 🌟 프리미엄 펫 - 강아지 종류
  {
    id: "maltese",
    name: "말티즈",
    type: "pet",
    description: "새하얀 털을 가진 사랑스러운 말티즈입니다. 당신의 정원을 더욱 포근하게 만들어줍니다.",
    icon: "🐩",
    unlockCondition: "프리미엄 펫 패키지",
    isPremium: true
  },
  {
    id: "retriever",
    name: "골든 리트리버",
    type: "pet",
    description: "충성스럽고 따뜻한 골든 리트리버입니다. 항상 당신 곁에서 함께합니다.",
    icon: "🦮",
    unlockCondition: "프리미엄 펫 패키지",
    isPremium: true
  },
  
  // 🌟 프리미엄 펫 - 고양이 종류
  {
    id: "spotted_cat",
    name: "점박이",
    type: "pet",
    description: "신비로운 점무늬를 가진 고양이입니다. 정원 곳곳을 우아하게 누비며 다닙니다.",
    icon: "🐈‍⬛",
    unlockCondition: "프리미엄 펫 패키지",
    isPremium: true
  },
  {
    id: "white_cat",
    name: "스노우",
    type: "pet",
    description: "눈처럼 하얀 털을 가진 귀여운 고양이입니다. 정원에 평화로운 분위기를 더해줍니다.",
    icon: "🐱",
    unlockCondition: "프리미엄 펫 패키지",
    isPremium: true
  },
  
  // 🌟 프리미엄 배경
  {
    id: "rainy_bg",
    name: "비내리는 정원",
    type: "background",
    description: "잔잔한 빗소리가 들리는 차분한 정원입니다. 감성을 한껏 끌어올려줍니다.",
    icon: "🌧️",
    unlockCondition: "날씨 테마 패키지",
    isPremium: true
  },
  {
    id: "rainbow_bg",
    name: "무지개 정원",
    type: "background",
    description: "비 갠 뒤 나타난 아름다운 무지개가 정원을 감싸줍니다. 희망과 행복이 가득합니다.",
    icon: "🌈",
    unlockCondition: "날씨 테마 패키지",
    isPremium: true
  },
  {
    id: "thunder_bg",
    name: "천둥번개 정원",
    type: "background",
    description: "강렬한 천둥번개가 치는 극적인 정원입니다. 내면의 강한 감정을 표현하세요.",
    icon: "⛈️",
    unlockCondition: "날씨 테마 패키지",
    isPremium: true
  },
  {
    id: "snow_bg",
    name: "눈꽃 정원",
    type: "background",
    description: "하얀 눈이 소복이 내리는 고요한 정원입니다. 마음이 차분하게 정화됩니다.",
    icon: "❄️",
    unlockCondition: "날씨 테마 패키지",
    isPremium: true
  },
  {
    id: "starry_bg",
    name: "별빛 정원",
    type: "background",
    description: "반짝이는 별들이 가득한 밤의 정원입니다. 당신의 꿈과 희망을 비춰줍니다.",
    icon: "✨",
    unlockCondition: "시간 테마 패키지",
    isPremium: true
  },
  {
    id: "sunset_bg",
    name: "석양 정원",
    type: "background",
    description: "따뜻한 석양이 물드는 감성적인 정원입니다. 하루를 아름답게 마무리하세요.",
    icon: "🌅",
    unlockCondition: "시간 테마 패키지",
    isPremium: true
  },
  {
    id: "aurora_bg",
    name: "오로라 정원",
    type: "background",
    description: "신비로운 오로라가 춤추는 환상적인 정원입니다. 마법 같은 순간을 경험하세요.",
    icon: "🌌",
    unlockCondition: "스페셜 테마 패키지",
    isPremium: true
  },
  {
    id: "sakura_bg",
    name: "벚꽃 정원",
    type: "background",
    description: "만개한 벚꽃이 흩날리는 봄의 정원입니다. 설렘과 새로운 시작을 느껴보세요.",
    icon: "🌸",
    unlockCondition: "계절 테마 패키지",
    isPremium: true
  },
  
  // 🌟 프리미엄 장식품
  {
    id: "fountain",
    name: "분수대",
    type: "decoration",
    description: "물소리가 시원한 아름다운 분수대입니다. 정원에 생기를 불어넣어줍니다.",
    icon: "⛲",
    unlockCondition: "정원 인테리어 패키지",
    isPremium: true
  },
  {
    id: "fairy",
    name: "요정",
    type: "decoration",
    description: "정원을 지켜주는 마법 같은 요정입니다. 당신의 마음을 치유해줍니다.",
    icon: "🧚",
    unlockCondition: "판타지 테마 패키지",
    isPremium: true
  },
  {
    id: "firefly",
    name: "반딧불이",
    type: "decoration",
    description: "밤하늘을 수놓는 반짝이는 반딧불이입니다. 로맨틱한 분위기를 연출합니다.",
    icon: "✨",
    unlockCondition: "판타지 테마 패키지",
    isPremium: true
  },
  {
    id: "golden_sun",
    name: "황금 해",
    type: "decoration",
    description: "따스한 황금빛을 발산하는 해입니다. 정원에 활력을 불어넣어줍니다.",
    icon: "☀️",
    unlockCondition: "시간 테마 패키지",
    isPremium: true
  },
  {
    id: "smiling_sun",
    name: "미소 짓는 해",
    type: "decoration",
    description: "밝게 웃는 얼굴의 귀여운 해입니다. 당신의 하루를 행복하게 만들어줍니다.",
    icon: "🌞",
    unlockCondition: "스페셜 테마 패키지",
    isPremium: true
  }
];

// 감정별 식물 컴포넌트
function EmotionPlant({
  emotion,
  onClick,
  isGrowing,
}: {
  emotion: string;
  onClick: () => void;
  isGrowing: boolean;
}) {
  const [isShaking, setIsShaking] = useState(false);

  const handleClick = () => {
    setIsShaking(true);
    onClick();
    setTimeout(() => setIsShaking(false), 500);
  };

  // 감정별 식물 디자인
  const getPlantSVG = () => {
    switch (emotion) {
      case "sad": // 파란 꽃
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            {/* 줄기 */}
            <motion.path
              d="M 50 120 Q 48 100 50 80 L 50 60"
              stroke="#4ade80"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 48 100 50 80 L 50 60",
                        "M 50 120 Q 52 100 50 80 L 50 60",
                        "M 50 120 Q 48 100 50 80 L 50 60",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 잎 */}
            <motion.ellipse
              cx="40"
              cy="80"
              rx="8"
              ry="4"
              fill="#22c55e"
              animate={isShaking ? { rotate: [-5, 5, -5] } : {}}
              style={{ transformOrigin: "40px 80px" }}
            />
            <motion.ellipse
              cx="60"
              cy="90"
              rx="8"
              ry="4"
              fill="#22c55e"
              animate={isShaking ? { rotate: [5, -5, 5] } : {}}
              style={{ transformOrigin: "60px 90px" }}
            />
            {/* 파란 꽃 */}
            <motion.g
              animate={isShaking ? { rotate: [-3, 3, -3] } : {}}
              style={{ transformOrigin: "50px 50px" }}
            >
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <ellipse
                  key={i}
                  cx={
                    50 + 12 * Math.cos((angle * Math.PI) / 180)
                  }
                  cy={
                    50 + 12 * Math.sin((angle * Math.PI) / 180)
                  }
                  rx="8"
                  ry="12"
                  fill="#60a5fa"
                  transform={`rotate(${angle} 50 50)`}
                />
              ))}
              <circle cx="50" cy="50" r="6" fill="#3b82f6" />
            </motion.g>
          </svg>
        );

      case "happy": // 노란 잎
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 Q 48 100 50 80 L 50 40"
              stroke="#4ade80"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 48 100 50 80 L 50 40",
                        "M 50 120 Q 52 100 50 80 L 50 40",
                        "M 50 120 Q 48 100 50 80 L 50 40",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 노란 잎들 */}
            {[35, 50, 65, 80].map((y, i) => (
              <motion.g
                key={i}
                animate={
                  isShaking
                    ? {
                        rotate: [
                          i % 2 ? -10 : 10,
                          i % 2 ? 10 : -10,
                          i % 2 ? -10 : 10,
                        ],
                      }
                    : {}
                }
                style={{ transformOrigin: `50px ${y}px` }}
              >
                <ellipse
                  cx={i % 2 ? "35" : "65"}
                  cy={y}
                  rx="15"
                  ry="8"
                  fill="#fbbf24"
                />
                <ellipse
                  cx={i % 2 ? "65" : "35"}
                  cy={y + 5}
                  rx="15"
                  ry="8"
                  fill="#f59e0b"
                />
              </motion.g>
            ))}
            {/* 꼭대기 큰 잎 */}
            <motion.ellipse
              cx="50"
              cy="30"
              rx="20"
              ry="12"
              fill="#facc15"
              animate={isShaking ? { scale: [1, 1.1, 1] } : {}}
              style={{ transformOrigin: "50px 30px" }}
            />
          </svg>
        );

      case "angry": // 붉은 열매
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 Q 48 100 50 70 L 50 50"
              stroke="#4ade80"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 48 100 50 70 L 50 50",
                        "M 50 120 Q 52 100 50 70 L 50 50",
                        "M 50 120 Q 48 100 50 70 L 50 50",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 잎 */}
            <motion.ellipse
              cx="35"
              cy="70"
              rx="10"
              ry="5"
              fill="#22c55e"
              animate={
                isShaking ? { rotate: [-10, 10, -10] } : {}
              }
              style={{ transformOrigin: "35px 70px" }}
            />
            <motion.ellipse
              cx="65"
              cy="75"
              rx="10"
              ry="5"
              fill="#22c55e"
              animate={
                isShaking ? { rotate: [10, -10, 10] } : {}
              }
              style={{ transformOrigin: "65px 75px" }}
            />
            {/* 붉은 열매들 */}
            {[
              [45, 45],
              [55, 40],
              [50, 52],
            ].map(([x, y], i) => (
              <motion.g
                key={i}
                animate={isShaking ? { y: [-2, 2, -2] } : {}}
                transition={{ delay: i * 0.1 }}
              >
                <circle cx={x} cy={y} r="8" fill="#ef4444" />
                <ellipse
                  cx={x - 2}
                  cy={y - 2}
                  rx="2"
                  ry="3"
                  fill="#fca5a5"
                  opacity="0.6"
                />
              </motion.g>
            ))}
          </svg>
        );

      case "calm": // 초록 식물 - 연꽃 스타일
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 L 50 65"
              stroke="#16a34a"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 L 50 65",
                        "M 48 120 L 52 65",
                        "M 50 120 L 50 65",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 연꽃 잎들 */}
            <motion.g
              animate={isShaking ? { rotate: [-3, 3, -3] } : {}}
              style={{ transformOrigin: "50px 55px" }}
            >
              {/* 외곽 잎 */}
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <ellipse
                  key={i}
                  cx={50 + 18 * Math.cos((angle * Math.PI) / 180)}
                  cy={55 + 10 * Math.sin((angle * Math.PI) / 180)}
                  rx="12"
                  ry="8"
                  fill="#34d399"
                  transform={`rotate(${angle} 50 55)`}
                />
              ))}
              {/* 내부 잎 */}
              {[36, 108, 180, 252, 324].map((angle, i) => (
                <ellipse
                  key={i}
                  cx={50 + 10 * Math.cos((angle * Math.PI) / 180)}
                  cy={55 + 6 * Math.sin((angle * Math.PI) / 180)}
                  rx="8"
                  ry="6"
                  fill="#10b981"
                  transform={`rotate(${angle} 50 55)`}
                />
              ))}
              {/* 중앙부 */}
              <circle cx="50" cy="55" r="6" fill="#059669" />
            </motion.g>
            {/* 줄기 잎 */}
            <motion.ellipse
              cx="35"
              cy="85"
              rx="14"
              ry="7"
              fill="#22c55e"
              opacity="0.8"
              animate={isShaking ? { rotate: [-5, 5, -5] } : {}}
              style={{ transformOrigin: "35px 85px" }}
            />
            <motion.ellipse
              cx="65"
              cy="90"
              rx="14"
              ry="7"
              fill="#22c55e"
              opacity="0.8"
              animate={isShaking ? { rotate: [5, -5, 5] } : {}}
              style={{ transformOrigin: "65px 90px" }}
            />
          </svg>
        );

      case "anxious": // 보라 꽃
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 Q 48 100 50 80 L 50 60"
              stroke="#4ade80"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 48 100 50 80 L 50 60",
                        "M 50 120 Q 52 100 50 80 L 50 60",
                        "M 50 120 Q 48 100 50 80 L 50 60",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 보라 꽃 */}
            <motion.g
              animate={isShaking ? { rotate: [-5, 5, -5] } : {}}
              style={{ transformOrigin: "50px 45px" }}
            >
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <ellipse
                  key={i}
                  cx={
                    50 + 10 * Math.cos((angle * Math.PI) / 180)
                  }
                  cy={
                    45 + 10 * Math.sin((angle * Math.PI) / 180)
                  }
                  rx="6"
                  ry="10"
                  fill="#a855f7"
                  transform={`rotate(${angle} 50 45)`}
                />
              ))}
              <circle cx="50" cy="45" r="5" fill="#7c3aed" />
            </motion.g>
            {/* 잎 */}
            <motion.ellipse
              cx="38"
              cy="75"
              rx="10"
              ry="5"
              fill="#22c55e"
              animate={isShaking ? { rotate: [-8, 8, -8] } : {}}
              style={{ transformOrigin: "38px 75px" }}
            />
          </svg>
        );

      case "excited": // 분홍 꽃
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 Q 48 100 50 80 L 50 60"
              stroke="#4ade80"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 48 100 50 80 L 50 60",
                        "M 50 120 Q 52 100 50 80 L 50 60",
                        "M 50 120 Q 48 100 50 80 L 50 60",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 분홍 꽃 - 벚꽃 모양 */}
            <motion.g
              animate={
                isShaking
                  ? { rotate: [-4, 4, -4], scale: [1, 1.05, 1] }
                  : {}
              }
              style={{ transformOrigin: "50px 48px" }}
            >
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <g key={i}>
                  <circle
                    cx={
                      50 +
                      14 * Math.cos((angle * Math.PI) / 180)
                    }
                    cy={
                      48 +
                      14 * Math.sin((angle * Math.PI) / 180)
                    }
                    r="7"
                    fill="#f472b6"
                  />
                </g>
              ))}
              <circle cx="50" cy="48" r="5" fill="#ec4899" />
            </motion.g>
            {/* 잎 */}
            <motion.ellipse
              cx="40"
              cy="75"
              rx="9"
              ry="4"
              fill="#22c55e"
              animate={isShaking ? { rotate: [-6, 6, -6] } : {}}
              style={{ transformOrigin: "40px 75px" }}
            />
          </svg>
        );

      case "tired": // 회색 식물
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 Q 55 100 48 80 L 45 60"
              stroke="#6b7280"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 55 100 48 80 L 45 60",
                        "M 50 120 Q 52 100 50 80 L 50 60",
                        "M 50 120 Q 55 100 48 80 L 45 60",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 시든 잎 */}
            <motion.ellipse
              cx="35"
              cy="80"
              rx="12"
              ry="5"
              fill="#9ca3af"
              opacity="0.7"
              animate={isShaking ? { rotate: [-8, 8, -8] } : {}}
              style={{ transformOrigin: "35px 80px" }}
            />
            <motion.ellipse
              cx="55"
              cy="70"
              rx="10"
              ry="4"
              fill="#6b7280"
              opacity="0.6"
              animate={isShaking ? { rotate: [8, -8, 8] } : {}}
              style={{ transformOrigin: "55px 70px" }}
            />
            {/* 작은 꽃 */}
            <motion.circle
              cx="45"
              cy="55"
              r="6"
              fill="#d1d5db"
              animate={isShaking ? { scale: [1, 1.1, 1] } : {}}
              style={{ transformOrigin: "45px 55px" }}
            />
          </svg>
        );

      case "neutral": // 흰색/밝은 꽃
      default:
        return (
          <svg viewBox="0 0 100 120" className="w-full h-full">
            <motion.path
              d="M 50 120 Q 48 100 50 80 L 50 60"
              stroke="#4ade80"
              strokeWidth="3"
              fill="none"
              animate={
                isShaking
                  ? {
                      d: [
                        "M 50 120 Q 48 100 50 80 L 50 60",
                        "M 50 120 Q 52 100 50 80 L 50 60",
                        "M 50 120 Q 48 100 50 80 L 50 60",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            />
            {/* 흰색 꽃 */}
            <motion.g
              animate={isShaking ? { rotate: [-3, 3, -3] } : {}}
              style={{ transformOrigin: "50px 48px" }}
            >
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <ellipse
                  key={i}
                  cx={
                    50 + 12 * Math.cos((angle * Math.PI) / 180)
                  }
                  cy={
                    48 + 12 * Math.sin((angle * Math.PI) / 180)
                  }
                  rx="7"
                  ry="11"
                  fill="#f3f4f6"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  transform={`rotate(${angle} 50 48)`}
                />
              ))}
              <circle cx="50" cy="48" r="5" fill="#fef08a" />
            </motion.g>
            {/* 잎 */}
            <motion.ellipse
              cx="38"
              cy="75"
              rx="9"
              ry="4"
              fill="#22c55e"
              animate={isShaking ? { rotate: [-7, 7, -7] } : {}}
              style={{ transformOrigin: "38px 75px" }}
            />
          </svg>
        );
    }
  };

  return (
    <motion.div
      className="cursor-pointer"
      onClick={handleClick}
      initial={{ scale: 0, y: 20 }}
      animate={{
        scale: isGrowing ? [0, 1.2, 1] : 1,
        y: isGrowing ? [20, -5, 0] : 0,
      }}
      transition={{
        duration: isGrowing ? 0.8 : 0.3,
        ease: "easeOut",
      }}
      whileHover={{ scale: 1.1 }}
    >
      {getPlantSVG()}
    </motion.div>
  );
}

// 강아지 컴포넌트
function GardenDog({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-20 h-20"
      animate={isStatic ? {} : {
        x: [0, 100, 200, 100, 0],
        y: [0, -10, 0, -8, 0],
        scaleX: [1, 1, -1, -1, 1],
      }}
      transition={isStatic ? {} : {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 강아지 몸통 */}
      <ellipse cx="50" cy="65" rx="25" ry="20" fill="#d97706" />
      {/* 머리 */}
      <circle cx="50" cy="45" r="18" fill="#d97706" />
      {/* 귀 */}
      <ellipse cx="38" cy="35" rx="8" ry="15" fill="#92400e" />
      <ellipse cx="62" cy="35" rx="8" ry="15" fill="#92400e" />
      {/* 눈 */}
      <circle cx="44" cy="43" r="3" fill="#000" />
      <circle cx="56" cy="43" r="3" fill="#000" />
      {/* 코 */}
      <circle cx="50" cy="50" r="3" fill="#000" />
      {/* 꼬리 */}
      <motion.path
        d="M 25 65 Q 15 60 12 50"
        stroke="#d97706"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ transformOrigin: "25px 65px" }}
      />
      {/* 다리 */}
      <rect
        x="35"
        y="80"
        width="6"
        height="15"
        rx="3"
        fill="#d97706"
      />
      <rect
        x="59"
        y="80"
        width="6"
        height="15"
        rx="3"
        fill="#d97706"
      />
    </motion.svg>
  );
}

// 말티즈 컴포넌트 (하얀 털, 귀여운 작은 강아지)
function GardenMaltese({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-20 h-20"
      animate={isStatic ? {} : {
        x: [0, 80, 160, 80, 0],
        y: [0, -5, 0, -3, 0],
        scaleX: [1, 1, -1, -1, 1],
      }}
      transition={isStatic ? {} : {
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 몸통 - 하얀 털뭉치 */}
      <ellipse cx="50" cy="68" rx="20" ry="16" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* 머리 - 둥글둥글 */}
      <circle cx="50" cy="42" r="15" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* 귀 - 작고 귀여운 */}
      <ellipse cx="38" cy="32" rx="6" ry="10" fill="#fef3c7" stroke="#e5e7eb" strokeWidth="1" />
      <ellipse cx="62" cy="32" rx="6" ry="10" fill="#fef3c7" stroke="#e5e7eb" strokeWidth="1" />
      {/* 눈 - 반짝이는 */}
      <circle cx="44" cy="40" r="3" fill="#1f2937" />
      <circle cx="45" cy="39" r="1" fill="#ffffff" />
      <circle cx="56" cy="40" r="3" fill="#1f2937" />
      <circle cx="57" cy="39" r="1" fill="#ffffff" />
      {/* 코 - 작고 귀여운 */}
      <ellipse cx="50" cy="47" rx="2.5" ry="2" fill="#fb923c" />
      {/* 리본 장식 */}
      <motion.path
        d="M 45 28 Q 50 25 55 28"
        fill="#fbbf24"
        animate={isStatic ? {} : { scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: "50px 28px" }}
      />
      <circle cx="50" cy="28" r="3" fill="#fbbf24" />
      {/* 꼬리 - 폭신폭신 */}
      <motion.circle
        cx="30"
        cy="68"
        r="8"
        fill="#ffffff"
        stroke="#e5e7eb"
        strokeWidth="1"
        animate={isStatic ? {} : { y: [-2, 2, -2] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {/* 다리 - 작고 통통 */}
      <rect x="38" y="80" width="5" height="12" rx="2.5" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
      <rect x="57" y="80" width="5" height="12" rx="2.5" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
    </motion.svg>
  );
}

// 골든 리트리버 컴포넌트 (큰 강아지, 골든색)
function GardenRetriever({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-24 h-24"
      animate={isStatic ? {} : {
        x: [0, 120, 240, 120, 0],
        y: [0, -8, 0, -6, 0],
        scaleX: [1, 1, -1, -1, 1],
      }}
      transition={isStatic ? {} : {
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 몸통 - 크고 든든 */}
      <ellipse cx="50" cy="65" rx="28" ry="22" fill="#fbbf24" />
      {/* 머리 - 큰 머리 */}
      <circle cx="50" cy="40" r="20" fill="#fbbf24" />
      {/* 귀 - 늘어진 귀 */}
      <ellipse cx="32" cy="38" rx="9" ry="18" fill="#f59e0b" />
      <ellipse cx="68" cy="38" rx="9" ry="18" fill="#f59e0b" />
      {/* 눈 - 따뜻한 눈빛 */}
      <circle cx="42" cy="38" r="3.5" fill="#1f2937" />
      <circle cx="43" cy="37" r="1.5" fill="#ffffff" />
      <circle cx="58" cy="38" r="3.5" fill="#1f2937" />
      <circle cx="59" cy="37" r="1.5" fill="#ffffff" />
      {/* 코 - 큰 코 */}
      <ellipse cx="50" cy="48" rx="4" ry="3" fill="#1f2937" />
      {/* 입 - 웃는 얼굴 */}
      <path d="M 42 52 Q 50 56 58 52" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 혀 */}
      <motion.path
        d="M 50 56 Q 52 60 50 62"
        fill="#ef4444"
        animate={isStatic ? {} : { d: ["M 50 56 Q 52 60 50 62", "M 50 56 Q 52 58 50 60", "M 50 56 Q 52 60 50 62"] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* 꼬리 - 활발하게 흔들기 */}
      <motion.path
        d="M 22 65 Q 10 60 5 50"
        stroke="#fbbf24"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        animate={isStatic ? {} : { rotate: [0, 20, -20, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        style={{ transformOrigin: "22px 65px" }}
      />
      {/* 다리 - 튼튼한 다리 */}
      <rect x="33" y="82" width="7" height="16" rx="3.5" fill="#fbbf24" />
      <rect x="60" y="82" width="7" height="16" rx="3.5" fill="#fbbf24" />
    </motion.svg>
  );
}

// 점박이 고양이 컴포넌트 (회색 바탕에 검은 점)
function GardenSpottedCat({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-20 h-20"
      animate={isStatic ? {} : {
        x: [0, -70, -140, -70, 0],
        scaleX: [1, 1, -1, -1, 1],
      }}
      transition={isStatic ? {} : {
        duration: 14,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 몸통 - 회색 */}
      <ellipse cx="50" cy="70" rx="24" ry="19" fill="#9ca3af" />
      {/* 점무늬 */}
      <circle cx="42" cy="68" r="3" fill="#1f2937" opacity="0.8" />
      <circle cx="58" cy="72" r="2.5" fill="#1f2937" opacity="0.8" />
      <circle cx="50" cy="75" r="2" fill="#1f2937" opacity="0.8" />
      {/* 머리 */}
      <circle cx="50" cy="43" r="17" fill="#9ca3af" />
      {/* 머리 점무늬 */}
      <circle cx="56" cy="38" r="2" fill="#1f2937" opacity="0.8" />
      <circle cx="44" cy="42" r="1.5" fill="#1f2937" opacity="0.8" />
      {/* 귀 - 뾰족 */}
      <path d="M 34 33 L 28 18 L 40 28 Z" fill="#9ca3af" />
      <path d="M 66 33 L 72 18 L 60 28 Z" fill="#9ca3af" />
      {/* 귀 안쪽 */}
      <path d="M 34 30 L 30 22 L 38 28 Z" fill="#fca5a5" />
      <path d="M 66 30 L 70 22 L 62 28 Z" fill="#fca5a5" />
      {/* 눈 - 신비로운 초록 눈 */}
      <ellipse cx="42" cy="42" rx="3" ry="5" fill="#10b981" />
      <ellipse cx="42" cy="42" rx="1" ry="3" fill="#000" />
      <ellipse cx="58" cy="42" rx="3" ry="5" fill="#10b981" />
      <ellipse cx="58" cy="42" rx="1" ry="3" fill="#000" />
      {/* 코 */}
      <path d="M 50 48 L 48 51 L 52 51 Z" fill="#ef4444" />
      {/* 수염 */}
      <line x1="34" y1="48" x2="22" y2="46" stroke="#1f2937" strokeWidth="1" />
      <line x1="34" y1="50" x2="22" y2="50" stroke="#1f2937" strokeWidth="1" />
      <line x1="66" y1="48" x2="78" y2="46" stroke="#1f2937" strokeWidth="1" />
      <line x1="66" y1="50" x2="78" y2="50" stroke="#1f2937" strokeWidth="1" />
      {/* 꼬리 - 우아하게 */}
      <motion.path
        d="M 26 70 Q 15 65 8 55 Q 5 50 4 45"
        stroke="#9ca3af"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        animate={isStatic ? {} : { d: [
          "M 26 70 Q 15 65 8 55 Q 5 50 4 45",
          "M 26 70 Q 15 68 8 60 Q 5 55 4 50",
          "M 26 70 Q 15 65 8 55 Q 5 50 4 45"
        ]}}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* 다리 */}
      <rect x="38" y="85" width="6" height="13" rx="3" fill="#9ca3af" />
      <rect x="56" y="85" width="6" height="13" rx="3" fill="#9ca3af" />
    </motion.svg>
  );
}

// 눈송이 고양이 컴포넌트 (새하얀 고양이)
function GardenWhiteCat({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-20 h-20"
      animate={isStatic ? {} : {
        x: [0, -50, -100, -50, 0],
        y: [0, -3, 0, -2, 0],
        scaleX: [1, 1, -1, -1, 1],
      }}
      transition={isStatic ? {} : {
        duration: 11,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 몸통 - 새하얀 */}
      <ellipse cx="50" cy="72" rx="22" ry="18" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* 머리 */}
      <circle cx="50" cy="44" r="16" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* 귀 - 뾰족 */}
      <path d="M 35 34 L 29 20 L 40 29 Z" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      <path d="M 65 34 L 71 20 L 60 29 Z" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* 귀 안쪽 - 연한 핑크 */}
      <path d="M 35 32 L 31 24 L 38 30 Z" fill="#fce7f3" />
      <path d="M 65 32 L 69 24 L 62 30 Z" fill="#fce7f3" />
      {/* 눈 - 파란 눈 */}
      <ellipse cx="42" cy="43" rx="3" ry="5" fill="#60a5fa" />
      <ellipse cx="42" cy="43" rx="1.5" ry="3" fill="#1e3a8a" />
      <circle cx="43" cy="41" r="1" fill="#ffffff" opacity="0.8" />
      <ellipse cx="58" cy="43" rx="3" ry="5" fill="#60a5fa" />
      <ellipse cx="58" cy="43" rx="1.5" ry="3" fill="#1e3a8a" />
      <circle cx="59" cy="41" r="1" fill="#ffffff" opacity="0.8" />
      {/* 코 - 핑크색 */}
      <path d="M 50 49 L 48 52 L 52 52 Z" fill="#fb7185" />
      {/* 수염 */}
      <line x1="34" y1="49" x2="24" y2="47" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="34" y1="51" x2="24" y2="51" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="34" y1="53" x2="24" y2="55" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="66" y1="49" x2="76" y2="47" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="66" y1="51" x2="76" y2="51" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="66" y1="53" x2="76" y2="55" stroke="#d1d5db" strokeWidth="1.5" />
      {/* 꼬리 - 폭신폭신 */}
      <motion.path
        d="M 28 72 Q 18 70 12 65 Q 8 60 6 54"
        stroke="#ffffff"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
        animate={isStatic ? {} : { rotate: [-5, 5, -5] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{ transformOrigin: "28px 72px" }}
      />
      {/* 다리 */}
      <rect x="39" y="86" width="6" height="12" rx="3" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
      <rect x="55" y="86" width="6" height="12" rx="3" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
      {/* 발바닥 - 핑크 */}
      <ellipse cx="42" cy="96" rx="2" ry="1" fill="#fce7f3" />
      <ellipse cx="58" cy="96" rx="2" ry="1" fill="#fce7f3" />
    </motion.svg>
  );
}

// 고양이 컴포넌트
function GardenCat({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-20 h-20"
      animate={isStatic ? {} : {
        x: [0, -60, -120, -60, 0],
        scaleX: [1, 1, -1, -1, 1],
      }}
      transition={isStatic ? {} : {
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 고양이 몸통 */}
      <ellipse cx="50" cy="70" rx="22" ry="18" fill="#f97316" />
      {/* 머리 */}
      <circle cx="50" cy="45" r="16" fill="#f97316" />
      {/* 귀 - 뾰족 */}
      <path d="M 35 35 L 30 20 L 40 30 Z" fill="#f97316" />
      <path d="M 65 35 L 70 20 L 60 30 Z" fill="#f97316" />
      {/* 눈 */}
      <ellipse cx="43" cy="43" rx="2" ry="4" fill="#000" />
      <ellipse cx="57" cy="43" rx="2" ry="4" fill="#000" />
      {/* 코 */}
      <path d="M 50 48 L 48 51 L 52 51 Z" fill="#ef4444" />
      {/* 수염 */}
      <line x1="35" y1="48" x2="25" y2="46" stroke="#000" strokeWidth="1" />
      <line x1="35" y1="50" x2="25" y2="50" stroke="#000" strokeWidth="1" />
      <line x1="65" y1="48" x2="75" y2="46" stroke="#000" strokeWidth="1" />
      <line x1="65" y1="50" x2="75" y2="50" stroke="#000" strokeWidth="1" />
      {/* 꼬리 */}
      <motion.path
        d="M 28 70 Q 15 65 10 55"
        stroke="#f97316"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        animate={{ d: ["M 28 70 Q 15 65 10 55", "M 28 70 Q 15 70 10 75", "M 28 70 Q 15 65 10 55"] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* 다��� */}
      <rect x="38" y="85" width="5" height="12" rx="2" fill="#f97316" />
      <rect x="57" y="85" width="5" height="12" rx="2" fill="#f97316" />
    </motion.svg>
  );
}

// 나비 컴포넌트
function GardenButterfly({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 60 60"
      className="w-12 h-12"
      animate={isStatic ? {} : {
        x: [0, 80, 150, 80, 0],
        y: [0, -10, 10, -5, 0],
      }}
      transition={isStatic ? {} : {
        duration: 15,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 왼쪽 날개 */}
      <ellipse
        cx="20"
        cy="25"
        rx="12"
        ry="15"
        fill="#ffffff"
        opacity="0.9"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      <ellipse
        cx="20"
        cy="35"
        rx="12"
        ry="13"
        fill="#f9fafb"
        opacity="0.9"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      {/* 오른쪽 날개 */}
      <ellipse
        cx="40"
        cy="25"
        rx="12"
        ry="15"
        fill="#ffffff"
        opacity="0.9"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      <ellipse
        cx="40"
        cy="35"
        rx="12"
        ry="13"
        fill="#f9fafb"
        opacity="0.9"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      {/* 몸통 */}
      <ellipse cx="30" cy="30" rx="3" ry="12" fill="#9ca3af" />
      {/* 더듬이 */}
      <path
        d="M 28 18 Q 25 12 23 8"
        stroke="#9ca3af"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M 32 18 Q 35 12 37 8"
        stroke="#9ca3af"
        strokeWidth="1"
        fill="none"
      />
    </motion.svg>
  );
}

// 벚꽃 컴포넌트
function SakuraPetal({ size = "w-6 h-6" }: { size?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={size}>
      {/* 꽃잎 5개 */}
      <g>
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <ellipse
            key={i}
            cx={15 + 8 * Math.cos((angle * Math.PI) / 180)}
            cy={15 + 8 * Math.sin((angle * Math.PI) / 180)}
            rx="5"
            ry="8"
            fill="#ffc0cb"
            opacity="0.9"
            transform={`rotate(${angle} 15 15)`}
          />
        ))}
        {/* 꽃 중심 */}
        <circle cx="15" cy="15" r="4" fill="#ffb6c1" />
        {/* 꽃술 */}
        <circle cx="15" cy="15" r="2" fill="#ff69b4" />
        {/* 작은 점들 - 꽃가루 */}
        {[0, 90, 180, 270].map((angle, i) => (
          <circle
            key={`dot-${i}`}
            cx={15 + 1.5 * Math.cos((angle * Math.PI) / 180)}
            cy={15 + 1.5 * Math.sin((angle * Math.PI) / 180)}
            r="0.5"
            fill="#fff"
            opacity="0.8"
          />
        ))}
      </g>
    </svg>
  );
}

// 빗방울 아이콘
function RaindropIcon({ size = "w-4 h-4" }: { size?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={size}>
      <path
        d="M10 2 C8 6, 6 10, 6 13 C6 16, 7.5 18, 10 18 C12.5 18, 14 16, 14 13 C14 10, 12 6, 10 2 Z"
        fill="#60a5fa"
        opacity="0.8"
      />
    </svg>
  );
}

// 무지개 아이콘
function RainbowIcon({ size = "w-6 h-4" }: { size?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={size}>
      {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#8b5cf6"].map((color, i) => (
        <path
          key={i}
          d={`M ${5 + i * 2} ${18 - i} Q 20 ${2 - i} ${35 - i * 2} ${18 - i}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
      ))}
    </svg>
  );
}

// 번개 아이콘
function LightningIcon({ size = "w-4 h-5" }: { size?: string }) {
  return (
    <svg viewBox="0 0 20 24" className={size}>
      <path
        d="M11 1 L3 14 H10 L8 23 L19 9 H11 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
      />
    </svg>
  );
}

// 눈송이 아이콘
function SnowflakeIcon({ size = "w-5 h-5" }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={size}>
      <g stroke="#93c5fd" strokeWidth="1.5" fill="none">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="5" y1="5" x2="19" y2="19" />
        <line x1="5" y1="19" x2="19" y2="5" />
        {/* 작은 가지들 */}
        <line x1="12" y1="2" x2="9" y2="5" />
        <line x1="12" y1="2" x2="15" y2="5" />
        <line x1="12" y1="22" x2="9" y2="19" />
        <line x1="12" y1="22" x2="15" y2="19" />
      </g>
    </svg>
  );
}

// 별 아이콘
function StarIcon({ size = "w-5 h-5" }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={size}>
      <path
        d="M12 2 L14.5 9 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.5 9 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
      />
    </svg>
  );
}

// 석양 아이콘
function SunsetIcon({ size = "w-6 h-4" }: { size?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={size}>
      <circle cx="20" cy="15" r="8" fill="#fb923c" opacity="0.9" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1="20"
          y1="15"
          x2={20 + 12 * Math.cos((angle * Math.PI) / 180)}
          y2={15 + 12 * Math.sin((angle * Math.PI) / 180)}
          stroke="#fdba74"
          strokeWidth="1"
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

// 오로라 아이콘
function AuroraIcon({ size = "w-6 h-4" }: { size?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={size}>
      <path
        d="M 2 15 Q 10 5, 20 10 T 38 8"
        stroke="#34d399"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M 0 18 Q 8 8, 18 13 T 40 10"
        stroke="#a78bfa"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 3 12 Q 12 3, 22 8 T 37 5"
        stroke="#5eead4"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

// 분수대 컴포넌트
function GardenFountain({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 120"
      className="w-24 h-28"
    >
      {/* 물받이 - 아래 */}
      <ellipse cx="50" cy="100" rx="35" ry="8" fill="#60a5fa" opacity="0.6" />
      <ellipse cx="50" cy="100" rx="30" ry="6" fill="#3b82f6" opacity="0.4" />
      
      {/* 물받이 - 중간 */}
      <ellipse cx="50" cy="70" rx="25" ry="6" fill="#60a5fa" opacity="0.6" />
      <ellipse cx="50" cy="70" rx="20" ry="4" fill="#3b82f6" opacity="0.4" />
      
      {/* 분수대 기둥 */}
      <rect x="45" y="70" width="10" height="30" fill="#94a3b8" />
      <ellipse cx="50" cy="70" rx="6" ry="3" fill="#cbd5e1" />
      
      {/* 물줄기 - 중앙 */}
      <motion.path
        d="M 50 70 Q 50 55 50 45"
        stroke="#60a5fa"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
        animate={isStatic ? {} : { 
          d: [
            "M 50 70 Q 50 55 50 45",
            "M 50 70 Q 50 52 50 40",
            "M 50 70 Q 50 55 50 45"
          ],
          opacity: [0.7, 0.5, 0.7]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* 물줄기 - 좌우 */}
      {[-8, 8].map((offset, i) => (
        <motion.path
          key={i}
          d={`M ${50 + offset} 70 Q ${50 + offset * 1.5} 60 ${50 + offset * 2} 52`}
          stroke="#60a5fa"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
          animate={isStatic ? {} : { 
            d: [
              `M ${50 + offset} 70 Q ${50 + offset * 1.5} 60 ${50 + offset * 2} 52`,
              `M ${50 + offset} 70 Q ${50 + offset * 1.5} 58 ${50 + offset * 2} 48`,
              `M ${50 + offset} 70 Q ${50 + offset * 1.5} 60 ${50 + offset * 2} 52`
            ],
            opacity: [0.6, 0.4, 0.6]
          }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      
      {/* 물방울 */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={50 + (i - 1) * 8}
          cy={45}
          r="2"
          fill="#60a5fa"
          opacity="0.8"
          animate={isStatic ? {} : { 
            y: [0, 30, 0],
            opacity: [0.8, 0.3, 0]
          }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      
      {/* 기둥 장식 */}
      <circle cx="50" cy="85" r="3" fill="#e2e8f0" />
      <circle cx="50" cy="95" r="3" fill="#e2e8f0" />
    </motion.svg>
  );
}

// 요정 컴포넌트
function GardenFairy({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 60 80"
      className="w-16 h-20"
      animate={isStatic ? {} : {
        y: [-5, 5, -5],
        x: [0, 30, 60, 30, 0],
      }}
      transition={isStatic ? {} : {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 날개 - 반짝이는 */}
      <motion.g
        animate={isStatic ? {} : { 
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* 왼쪽 날개 */}
        <path
          d="M 25 35 Q 10 25 8 20 Q 6 15 10 12 Q 15 10 20 15 Q 22 20 25 30 Z"
          fill="url(#fairyGradient)"
          opacity="0.9"
          stroke="#fbbf24"
          strokeWidth="0.5"
        />
        {/* 오른쪽 날개 */}
        <path
          d="M 35 35 Q 50 25 52 20 Q 54 15 50 12 Q 45 10 40 15 Q 38 20 35 30 Z"
          fill="url(#fairyGradient)"
          opacity="0.9"
          stroke="#fbbf24"
          strokeWidth="0.5"
        />
      </motion.g>
      
      {/* 그라데이션 정의 */}
      <defs>
        <linearGradient id="fairyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      
      {/* 머리 */}
      <circle cx="30" cy="35" r="8" fill="#fef3c7" />
      
      {/* 머리카락 */}
      <path d="M 25 30 Q 20 28 22 35" fill="#fbbf24" />
      <path d="M 30 28 Q 28 25 30 32" fill="#fbbf24" />
      <path d="M 35 30 Q 38 28 36 35" fill="#fbbf24" />
      
      {/* 눈 */}
      <circle cx="27" cy="35" r="1.5" fill="#1f2937" />
      <circle cx="33" cy="35" r="1.5" fill="#1f2937" />
      
      {/* 미소 */}
      <path d="M 26 38 Q 30 40 34 38" stroke="#f59e0b" strokeWidth="1" fill="none" strokeLinecap="round" />
      
      {/* 몸통 - 드레스 */}
      <path
        d="M 30 43 Q 25 50 22 60 L 38 60 Q 35 50 30 43 Z"
        fill="#fcd34d"
        stroke="#fbbf24"
        strokeWidth="0.5"
      />
      
      {/* 팔 */}
      <path d="M 26 45 Q 20 48 18 52" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
      <path d="M 34 45 Q 40 48 42 52" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
      
      {/* 다리 */}
      <line x1="26" y1="60" x2="26" y2="68" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="60" x2="34" y2="68" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
      
      {/* 마법 지팡이 */}
      <motion.g
        animate={isStatic ? {} : { rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: "42px 52px" }}
      >
        <line x1="42" y1="52" x2="48" y2="45" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
        <motion.circle
          cx="48"
          cy="45"
          r="3"
          fill="#fbbf24"
          animate={isStatic ? {} : { 
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        {/* 반짝임 */}
        <motion.path
          d="M 48 42 L 48 48 M 45 45 L 51 45"
          stroke="#fef3c7"
          strokeWidth="1"
          strokeLinecap="round"
          animate={isStatic ? {} : { 
            opacity: [0, 1, 0],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ transformOrigin: "48px 45px" }}
        />
      </motion.g>
    </motion.svg>
  );
}

// 반딧불이 컴포넌트
function GardenFirefly({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 80 80"
      className="w-16 h-16"
      animate={isStatic ? {} : {
        x: [0, 50, 100, 50, 0],
        y: [0, -20, 10, -15, 0],
      }}
      transition={isStatic ? {} : {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* 빛나는 후광 */}
      <motion.circle
        cx="40"
        cy="40"
        r="15"
        fill="#fef3c7"
        opacity="0.4"
        animate={isStatic ? {} : { 
          scale: [1, 1.5, 1],
          opacity: [0.4, 0.2, 0.4]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="40"
        cy="40"
        r="10"
        fill="#fcd34d"
        opacity="0.6"
        animate={isStatic ? {} : { 
          scale: [1, 1.3, 1],
          opacity: [0.6, 0.3, 0.6]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* 반딧불이 몸 */}
      <ellipse cx="40" cy="40" rx="4" ry="6" fill="#4ade80" />
      
      {/* 빛나는 꼬리 */}
      <motion.ellipse
        cx="40"
        cy="44"
        rx="3"
        ry="4"
        fill="#fbbf24"
        animate={isStatic ? {} : { 
          opacity: [1, 0.5, 1],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      
      {/* 날개 */}
      <motion.g
        animate={isStatic ? {} : { 
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 0.3, repeat: Infinity }}
        style={{ transformOrigin: "40px 38px" }}
      >
        <ellipse cx="36" cy="38" rx="6" ry="3" fill="#ffffff" opacity="0.7" />
        <ellipse cx="44" cy="38" rx="6" ry="3" fill="#ffffff" opacity="0.7" />
      </motion.g>
      
      {/* 더듬이 */}
      <path d="M 38 34 Q 36 30 35 28" stroke="#4ade80" strokeWidth="0.5" fill="none" />
      <path d="M 42 34 Q 44 30 45 28" stroke="#4ade80" strokeWidth="0.5" fill="none" />
      <circle cx="35" cy="28" r="0.8" fill="#fbbf24" />
      <circle cx="45" cy="28" r="0.8" fill="#fbbf24" />
      
      {/* 반짝이는 빛 입자 */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={40 + (i - 1) * 15}
          cy={40 + (i - 1) * 10}
          r="1.5"
          fill="#fef3c7"
          animate={isStatic ? {} : { 
            opacity: [0, 1, 0],
            y: [(i - 1) * 10, (i - 1) * 10 - 10, (i - 1) * 10],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
    </motion.svg>
  );
}

// 황금 해 컴포넌트
function GardenGoldenSun({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-24 h-24"
      animate={isStatic ? {} : {
        rotate: [0, 360],
        scale: [1, 1.05, 1],
      }}
      transition={isStatic ? {} : {
        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      {/* 외곽 광선 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <motion.path
          key={i}
          d={`M ${50 + 28 * Math.cos((angle * Math.PI) / 180)} ${50 + 28 * Math.sin((angle * Math.PI) / 180)} L ${50 + 38 * Math.cos((angle * Math.PI) / 180)} ${50 + 38 * Math.sin((angle * Math.PI) / 180)}`}
          stroke="url(#goldenGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          animate={isStatic ? {} : {
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
      
      {/* 중간 광선 */}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => (
        <motion.path
          key={`mid-${i}`}
          d={`M ${50 + 25 * Math.cos((angle * Math.PI) / 180)} ${50 + 25 * Math.sin((angle * Math.PI) / 180)} L ${50 + 33 * Math.cos((angle * Math.PI) / 180)} ${50 + 33 * Math.sin((angle * Math.PI) / 180)}`}
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}
      
      {/* 태양 본체 */}
      <circle cx="50" cy="50" r="20" fill="url(#goldenGradient)" />
      
      {/* 내부 광채 */}
      <circle cx="50" cy="50" r="20" fill="url(#goldenGlow)" opacity="0.8" />
      
      {/* 하이라이트 */}
      <circle cx="45" cy="45" r="6" fill="#fef9c3" opacity="0.9" />
      <circle cx="43" cy="43" r="3" fill="white" opacity="0.7" />
      
      <defs>
        <radialGradient id="goldenGradient">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <radialGradient id="goldenGlow">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="70%" stopColor="#fbbf24" opacity="0.5" />
          <stop offset="100%" stopColor="#f59e0b" opacity="0" />
        </radialGradient>
      </defs>
    </motion.svg>
  );
}

// 미소 짓는 해 컴포넌트
function GardenSmilingSun({ isStatic = false }: { isStatic?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-24 h-24"
      animate={isStatic ? {} : {
        rotate: [0, 10, -10, 0],
        y: [0, -5, 0],
      }}
      transition={isStatic ? {} : {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* 광선들 - 삼각형 모양 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <motion.path
          key={i}
          d={`M 50 50 L ${50 + 32 * Math.cos(((angle - 8) * Math.PI) / 180)} ${50 + 32 * Math.sin(((angle - 8) * Math.PI) / 180)} L ${50 + 32 * Math.cos(((angle + 8) * Math.PI) / 180)} ${50 + 32 * Math.sin(((angle + 8) * Math.PI) / 180)} Z`}
          fill="#fbbf24"
          animate={isStatic ? {} : {
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          style={{ transformOrigin: "50px 50px" }}
        />
      ))}
      
      {/* 태양 얼굴 */}
      <circle cx="50" cy="50" r="22" fill="url(#smilingGradient)" />
      
      {/* 뺨 홍조 */}
      <circle cx="38" cy="52" r="4" fill="#ff9aa2" opacity="0.6" />
      <circle cx="62" cy="52" r="4" fill="#ff9aa2" opacity="0.6" />
      
      {/* 눈 */}
      <motion.path
        d="M 42 46 Q 44 48 46 46"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        animate={isStatic ? {} : {
          d: [
            "M 42 46 Q 44 48 46 46",
            "M 42 47 Q 44 47 46 47",
            "M 42 46 Q 44 48 46 46"
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.path
        d="M 54 46 Q 56 48 58 46"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        animate={isStatic ? {} : {
          d: [
            "M 54 46 Q 56 48 58 46",
            "M 54 47 Q 56 47 58 47",
            "M 54 46 Q 56 48 58 46"
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      {/* 미소 */}
      <motion.path
        d="M 40 54 Q 50 60 60 54"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* 반짝임 */}
      <motion.g
        animate={isStatic ? {} : {
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <path d="M 70 30 L 72 35 L 77 37 L 72 39 L 70 44 L 68 39 L 63 37 L 68 35 Z" fill="white" opacity="0.9" />
      </motion.g>
      
      <defs>
        <radialGradient id="smilingGradient">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
      </defs>
    </motion.svg>
  );
}

export function EmotionGarden() {
  const [emotions, setEmotions] = useState<EmotionData[]>([]);
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [activePremiumItems, setActivePremiumItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPlantEmotion, setNewPlantEmotion] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<UnlockedItem | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemFilter, setItemFilter] = useState<"all" | "flower" | "pet" | "decoration" | "background">("all");
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const gardenRef = useRef<HTMLDivElement>(null);

  // 이번 주 시작일 계산 (월요일)
  const getThisWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0(일) ~ 6(토)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 월요일 기준
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - daysFromMonday);
    lastMonday.setHours(0, 0, 0, 0);
    return lastMonday;
  };

  // 이번 주 종료일 계산 (일요일)
  const getThisWeekEnd = () => {
    const weekStart = getThisWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  };

  // 지난주 시작/종료일 계산
  const getLastWeekRange = () => {
    const thisWeekStart = getThisWeekStart();
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
    lastWeekStart.setHours(0, 0, 0, 0);
    
    return { start: lastWeekStart, end: lastWeekEnd };
  };

  // 겹치지 않는 위치 생성 함수 - 모바일 안전 범위 개선
  const generateNonOverlappingPosition = (existingPositions: { x: number; y: number }[]) => {
    const minDistance = 12; // 퍼센트 단위로 변경
    
    // 안전한 범위 설정 (퍼센트 기준)
    // X: 15% ~ 85% (좌우 충분한 여백)
    // Y: 45% ~ 58% (땅 위 영역만)
    const minX = 15;
    const maxX = 85;
    const minY = 45; // 정원 높이의 45%부터 (땅 시작 전)
    const maxY = 58; // 정원 높이의 58%까지 (땅에 뿌리가 닿도록)
    
    let attempts = 0;
    const maxAttempts = 200;
  
    while (attempts < maxAttempts) {
      // 퍼센트 단위로 랜덤 위치 생성
      const newX = minX + Math.random() * (maxX - minX);
      const newY = minY + Math.random() * (maxY - minY);
  
      let hasOverlap = false;
      for (const pos of existingPositions) {
        // 퍼센트 단위로 거리 계산
        const distance = Math.sqrt(Math.pow(newX - pos.x, 2) + Math.pow(newY - pos.y, 2));
        
        if (distance < minDistance) {
          hasOverlap = true;
          break;
        }
      }
  
      if (!hasOverlap) {
        return { x: newX, y: newY };
      }
  
      attempts++;
    }
  
    // 실패시 그리드 배치
    const cols = 5;
    const gridIndex = existingPositions.length;
    const col = gridIndex % cols;
    const row = Math.floor(gridIndex / cols);
    
    const gridX = minX + col * ((maxX - minX) / (cols - 1));
    const gridY = minY + row * 8; // 퍼센트 단위 간격
    
    return { 
      x: Math.min(gridX, maxX), 
      y: Math.min(gridY, maxY) 
    };
  };
  

  useEffect(() => {
    loadGardenData();
  }, []);

  const loadGardenData = async () => {
    try {
      // 일기에서 감정 데이터 가져오기
      const diaryData = await apiCall("/diaries");
      const diaries = diaryData.diaries || [];
      
      // 프로필 데이터 가져오기 (관리자 및 아이템 패키지 체크용)
      const profileResponse = await apiCall("/profile");
      const userEmail = profileResponse?.profile?.email;
      const hasItemPackage = profileResponse?.profile?.hasItemPackage;
      const isAdmin = userEmail === 'khb1620@naver.com';

      // 이번 주 범위 (월~일)
      const weekStart = getThisWeekStart();
      const weekEnd = getThisWeekEnd();
      
      // 이번 주 일기만 필터링 (월~일)
      const thisWeekDiaries = diaries.filter((diary: any) => {
        const diaryDate = new Date(diary.date);
        return diaryDate >= weekStart && diaryDate <= weekEnd;
      });

      // 각 일기를 개별 식물로 변환 (동일 감정도 여러 개 가능)
      const emotionArray: EmotionData[] = [];
      const positions: { x: number; y: number }[] = [];

      thisWeekDiaries.forEach((diary: any) => {
        if (diary.emotion) {
          const pos = generateNonOverlappingPosition(positions);
          positions.push(pos);
          emotionArray.push({
            emotion: diary.emotion,
            date: diary.date,
            x: pos.x,
            y: pos.y,
          });
        }
      });

      setEmotions(emotionArray);

      // 해금 조건 확인
      const unlocked: string[] = [];

      // 기본 해는 모든 사용자에게 기본 제공
      unlocked.push('default_sun');

      // 꽃 해금 (각 감정을 1회 이상 기록 - 전체 기간 기준)
      const recordedEmotions = new Set(diaries.map((d: any) => d.emotion).filter(Boolean));
      recordedEmotions.forEach((emotion: string) => {
        unlocked.push(emotion);
      });
      
      // 관리자 또는 아이템 패키지 구매자는 모든 프리미엄 아이템 자동 해금
      if (isAdmin || hasItemPackage) {
        // 프리미엄 펫
        unlocked.push('maltese', 'retriever', 'spotted_cat', 'white_cat');
        // 프리미엄 배경
        unlocked.push('rainy_bg', 'rainbow_bg', 'thunder_bg', 'snow_bg', 'starry_bg', 'sunset_bg', 'aurora_bg', 'sakura_bg');
        // 프리미엄 장식
        unlocked.push('fountain', 'fairy', 'firefly', 'golden_sun', 'smiling_sun');
      }
      
      // 활성화된 프리미엄 아이템 로드
      const premiumData = await apiCall("/garden/premium-items");
      setActivePremiumItems(premiumData.activePremiumItems || []);

      // 동물/나비 해금: 지난주에 미션 달성하면 이번주에 표시
      const lastWeek = getLastWeekRange();
      const lastWeekDiaries = diaries.filter((diary: any) => {
        const diaryDate = new Date(diary.date);
        return diaryDate >= lastWeek.start && diaryDate <= lastWeek.end;
      });

      // 1. 강아지: 지난주에 7일 연속 일기 작성
      const lastWeekConsecutiveDays = checkConsecutiveDaysInRange(diaries, lastWeek.start, lastWeek.end);
      if (lastWeekConsecutiveDays >= 7) {
        unlocked.push("dog");
      }

      // 2. 고양이: 지난주에 5가지 이상 다른 감정 기록
      const lastWeekEmotions = new Set(lastWeekDiaries.map((d: any) => d.emotion).filter(Boolean));
      if (lastWeekEmotions.size >= 3) {
        unlocked.push("cat");
      }

      // 3. 나비: 지난주에 긍정적 감정 4회 이상
      const lastWeekPositiveCount = lastWeekDiaries.filter((d: any) => 
        ["happy", "excited", "calm"].includes(d.emotion)
      ).length;
      if (lastWeekPositiveCount >= 4) {
        unlocked.push("butterfly");
      }

      setUnlockedItems(unlocked);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load garden data:", error);
      setIsLoading(false);
    }
  };

  // 특정 기간 내 연속 일기 작성일 확인
  const checkConsecutiveDaysInRange = (diaries: any[], rangeStart: Date, rangeEnd: Date) => {
    // 해당 기간의 일��만 필터링
    const rangeDiaries = diaries.filter((diary: any) => {
      const diaryDate = new Date(diary.date);
      return diaryDate >= rangeStart && diaryDate <= rangeEnd;
    });

    if (rangeDiaries.length === 0) return 0;
    
    // 날짜별로 그룹화 (하루에 여러 일기가 있을 수 있으므로)
    const uniqueDates = [...new Set(rangeDiaries.map((d: any) => d.date))].sort().reverse();
    
    let consecutive = 1;
    let maxConsecutive = 1;
    
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = new Date(uniqueDates[i]);
      const next = new Date(uniqueDates[i + 1]);
      const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else {
        consecutive = 1;
      }
    }
    
    return maxConsecutive;
  };

  const handlePlantClick = (emotion: string) => {
    console.log(`Clicked plant: ${emotion}`);
  };

  const handleItemClick = async (item: UnlockedItem) => {
    // 기본 해 또는 프리미엄 아이템이고 해금되어 있으면 토글
    if ((item.id === 'default_sun' || (item.isPremium && unlockedItems.includes(item.id)))) {
      try {
        const response = await apiCall("/garden/premium-items/toggle", {
          method: 'POST',
          body: JSON.stringify({
            itemId: item.id,
            itemType: item.type
          })
        });
        setActivePremiumItems(response.activePremiumItems);
        
        const isActive = response.activePremiumItems.includes(item.id);
        toast.success(isActive ? `${item.name} 활성화!` : `${item.name} 비활성화`);
      } catch (error) {
        console.error('Failed to toggle premium item:', error);
        toast.error('아이템 토글에 실패했습니다.');
      }
    } else {
      // 일반 아이템이거나 잠금 해제되지 않은 아이템은 다이얼로그 표시
      setSelectedItem(item);
      setIsItemDialogOpen(true);
    }
  };

  const handleSaveImage = async () => {
    if (!gardenRef.current) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(gardenRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        filter: (node) => {
          // Skip external stylesheets that cause CORS issues
          if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') {
            return false;
          }
          return true;
        },
      });
      
      const link = document.createElement('a');
      link.download = `emotion-garden-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to save image:', error);
      toast.error('이미지 저장에 실패했습니다.');
    }
  };

  const getEmotionLabel = (emotion: string) => {
    const labels: { [key: string]: string } = {
      happy: "행복",
      sad: "슬픔",
      anxious: "불안",
      calm: "평온",
      excited: "설렘",
      angry: "분노",
      tired: "피곤",
      neutral: "평범",
    };
    return labels[emotion] || emotion;
  };

  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-green-600" />
              감정 정원 🌱
            </CardTitle>
            <CardDescription>
              매일 기록한 감정이 식물로 자라요. 감정은 나쁜 게
              아니라 성장의 일부예요 🌸
            </CardDescription>
            <p className="text-xs text-gray-500 mt-1">
              ⏰ 매주 일요일 자정에 정원이 초기화됩니다
            </p>
          </div>
          {/* <Button
            onClick={handleSaveImage}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            저장
          </Button> */}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <div>
        {/* 정원 배경 - 고정 높이로 변경 */}
        <div 
          ref={gardenRef}
          className={`relative rounded-xl p-6 overflow-hidden ${
            activePremiumItems.includes('rainy_bg') ? 'bg-gradient-to-b from-gray-400 via-slate-300 to-green-200' :
            activePremiumItems.includes('rainbow_bg') ? 'bg-gradient-to-b from-pink-200 via-purple-200 to-blue-200' :
            activePremiumItems.includes('thunder_bg') ? 'bg-gradient-to-b from-slate-700 via-gray-600 to-slate-500' :
            activePremiumItems.includes('snow_bg') ? 'bg-gradient-to-b from-blue-100 via-white to-slate-100' :
            activePremiumItems.includes('starry_bg') ? 'bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900' :
            activePremiumItems.includes('sunset_bg') ? 'bg-gradient-to-b from-orange-300 via-pink-300 to-purple-300' :
            activePremiumItems.includes('aurora_bg') ? 'bg-gradient-to-b from-teal-400 via-green-300 to-purple-400' :
            activePremiumItems.includes('sakura_bg') ? 'bg-gradient-to-b from-pink-100 via-rose-100 to-green-100' :
            'bg-gradient-to-b from-sky-200 via-green-100 to-green-200'
          }`}
          style={{
            height: '400px', // min-h 대신 고정 높이 사용
            width: '100%',
          }}
        >
          {/* 태양 - 기본 해를 항상 표시 (다른 해가 선택되지 않은 경우) */}
          {(!activePremiumItems.includes("golden_sun") && !activePremiumItems.includes("smiling_sun")) && (
            <motion.div
              className="absolute top-4 right-4 z-20"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <div className="w-16 h-16 bg-yellow-300 rounded-full shadow-lg" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-6 h-1 bg-yellow-200"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(20px)`,
                    transformOrigin: "center",
                  }}
                />
              ))}
            </motion.div>
          )}
        
          {/* 구름 */}
          <motion.div
            className="absolute top-8 left-4 flex gap-2 z-20"
            animate={{ x: [0, 50, 0] }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-8 h-6 bg-white/80 rounded-full" />
            <div className="w-10 h-7 bg-white/80 rounded-full -ml-3" />
            <div className="w-8 h-6 bg-white/80 rounded-full -ml-3" />
          </motion.div>
        
          {/* 땅 - 하단에 고정 */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-700/40 to-amber-900/60 rounded-b-xl z-0">
            {/* 풀 텍스처 */}
            {/* <div className="absolute inset-0 opacity-30">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-2 bg-green-600"
                  style={{
                    left: `${Math.random() * 100}%`,
                    bottom: `${Math.random() * 30}%`,
                    transform: `rotate(${Math.random() * 30 - 15}deg)`,
                  }}
                />
              ))}
            </div> */}
          </div>
        
          {/* 식물들 - 절대 위치 */}
          <div className="absolute inset-0 z-10">
            {emotions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4 text-green-600">
                    🌿
                  </div>
                  <p className="text-gray-600 mb-2">
                    아직 정원이 비어있어요
                  </p>
                  <p className="text-sm text-gray-500">
                    일기를 작성하면 감정이 식물로 자라나요
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {emotions.map((emotionData, index) => (
                  <motion.div
                    key={`${emotionData.emotion}-${emotionData.date}-${index}`}
                    className="absolute"
                    style={{
                      left: `${emotionData.x}%`,
                      top: `${emotionData.y}%`,
                      transform: 'translate(-50%, -100%)', // 하단 중앙을 기준점으로
                    }}
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ delay: index * 0.15 }}
                  >
                    <div className="w-10 h-16 sm:w-12 sm:h-20 md:w-14 md:h-22 relative">
                      <EmotionPlant
                        emotion={emotionData.emotion}
                        onClick={() => handlePlantClick(emotionData.emotion)}
                        isGrowing={newPlantEmotion === emotionData.emotion}
                      />
                    </div>
                    {/* 반짝임 효과 */}
                    {/* <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.5,
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div> */}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        
          {/* 해금된 동물들 - z-index 조정 */}
          <div className="absolute bottom-20 left-0 w-full h-20 z-15">
            {/* 기본 강아지 */}
            {unlockedItems.includes("dog") && (
              <div className="absolute bottom-0 left-2 sm:left-4 md:left-8 scale-75 sm:scale-90 md:scale-100">
                <GardenDog />
              </div>
            )}
            {/* 기본 고양이 */}
            {unlockedItems.includes("cat") && (
              <div className="absolute bottom-0 right-2 sm:right-4 md:right-8 scale-75 sm:scale-90 md:scale-100">
                <GardenCat />
              </div>
            )}
            {/* 기본 나비 */}
            {unlockedItems.includes("butterfly") && (
              <div className="absolute -top-25 left-[8%] sm:left-[12%] md:left-[20%] scale-75 sm:scale-90 md:scale-100">
                <GardenButterfly />
              </div>
            )}
            
            {/* 프리미엄 펫 - 말티즈 */}
            {activePremiumItems.includes("maltese") && (
              <div className="absolute bottom-0 left-[15%] sm:left-[18%] md:left-[22%] scale-75 sm:scale-90 md:scale-100">
                <GardenMaltese />
              </div>
            )}
            {/* 프리미엄 펫 - 리트리버 */}
            {activePremiumItems.includes("retriever") && (
              <div className="absolute bottom-0 left-[28%] sm:left-[32%] md:left-[38%] scale-80 sm:scale-95 md:scale-105">
                <GardenRetriever />
              </div>
            )}
            {/* 프리미엄 펫 - 점박이 고양이 */}
            {activePremiumItems.includes("spotted_cat") && (
              <div className="absolute bottom-0 right-[15%] sm:right-[18%] md:right-[22%] scale-75 sm:scale-90 md:scale-100">
                <GardenSpottedCat />
              </div>
            )}
            {/* 프리미엄 펫 - 눈송이 고양이 */}
            {activePremiumItems.includes("white_cat") && (
              <div className="absolute bottom-0 right-[28%] sm:right-[32%] md:right-[38%] scale-75 sm:scale-90 md:scale-100">
                <GardenWhiteCat />
              </div>
            )}
          </div>
          
          {/* 프리미엄 장식 */}
          <div className="absolute inset-0 z-12">
            {/* 분수대 */}
            {activePremiumItems.includes("fountain") && (
              <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 scale-75 sm:scale-90 md:scale-100">
                <GardenFountain />
              </div>
            )}
            {/* 요정 */}
            {activePremiumItems.includes("fairy") && (
              <div className="absolute top-24 right-[15%] sm:right-[20%] md:right-[25%] scale-75 sm:scale-90 md:scale-100">
                <GardenFairy />
              </div>
            )}
            {/* 반딧불이 */}
            {activePremiumItems.includes("firefly") && (
              <div className="absolute top-20 left-[15%] sm:left-[20%] md:left-[25%] scale-75 sm:scale-90 md:scale-100">
                <GardenFirefly />
              </div>
            )}
            {/* 황금 해 - 기본 해 위치에 표시 */}
            {activePremiumItems.includes("golden_sun") && (
              <div className="absolute top-4 right-4 scale-75 sm:scale-90 md:scale-100">
                <GardenGoldenSun />
              </div>
            )}
            {/* 미소 짓는 해 - 기본 해 위치에 표시 */}
            {activePremiumItems.includes("smiling_sun") && (
              <div className="absolute top-4 right-4 scale-75 sm:scale-90 md:scale-100">
                <GardenSmilingSun />
              </div>
            )}
          </div>
          
          {/* 무지개 배경일 때 무지개 추가 */}
          {activePremiumItems.includes("rainbow_bg") && (
            <motion.svg
              className="absolute top-0 left-1/2 transform -translate-x-1/2 z-5"
              viewBox="0 0 400 200"
              style={{ width: '100%', height: '50%', maxHeight: '200px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <defs>
                <linearGradient id="rainbowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="16.67%" stopColor="#f97316" />
                  <stop offset="33.33%" stopColor="#facc15" />
                  <stop offset="50%" stopColor="#4ade80" />
                  <stop offset="66.67%" stopColor="#3b82f6" />
                  <stop offset="83.33%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              {/* 무지개 arc들 */}
              <motion.path
                d="M 20 180 Q 200 20 380 180"
                stroke="url(#rainbowGradient1)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <motion.path
                d="M 30 180 Q 200 35 370 180"
                stroke="#f97316"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 2, delay: 0.1, ease: "easeInOut" }}
              />
              <motion.path
                d="M 40 180 Q 200 50 360 180"
                stroke="#facc15"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 2, delay: 0.2, ease: "easeInOut" }}
              />
              <motion.path
                d="M 50 180 Q 200 65 350 180"
                stroke="#4ade80"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.75 }}
                transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
              />
              <motion.path
                d="M 60 180 Q 200 80 340 180"
                stroke="#3b82f6"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 2, delay: 0.4, ease: "easeInOut" }}
              />
              <motion.path
                d="M 70 180 Q 200 95 330 180"
                stroke="#6366f1"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.65 }}
                transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
              />
              <motion.path
                d="M 80 180 Q 200 110 320 180"
                stroke="#a855f7"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
              />
            </motion.svg>
          )}
          
          {/* 천둥번개 배경일 때 번개 추가 */}
          {activePremiumItems.includes("thunder_bg") && (
            <div className="absolute inset-0 z-5 pointer-events-none">
              {[0, 1, 2].map((i) => (
                <motion.svg
                  key={i}
                  className="absolute"
                  style={{ 
                    left: `${20 + i * 30}%`, 
                    top: '10%',
                    width: '60px',
                    height: '120px'
                  }}
                  viewBox="0 0 60 120"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0, 0, 0],
                  }}
                  transition={{ 
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 3 + i * 1.5,
                    delay: i * 0.8
                  }}
                >
                  <path
                    d="M 30 0 L 20 45 L 35 45 L 25 120 L 45 50 L 30 50 Z"
                    fill="#fbbf24"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </motion.svg>
              ))}
            </div>
          )}
          
          {/* 눈꽃 정원일 때 눈 내리기 */}
          {activePremiumItems.includes("snow_bg") && (
            <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    filter: 'blur(1px)',
                  }}
                  initial={{ 
                    top: -20,
                    opacity: 0.7 + Math.random() * 0.3
                  }}
                  animate={{
                    top: '110%',
                    x: [0, Math.random() * 40 - 20, 0],
                  }}
                  transition={{
                    duration: 5 + Math.random() * 5,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                    ease: "linear"
                  }}
                />
              ))}
            </div>
          )}
          
          {/* 별빛 정원일 때 별 추가 */}
          {activePremiumItems.includes("starry_bg") && (
            <div className="absolute inset-0 z-5 pointer-events-none">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 70}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M 8 0 L 9.5 6.5 L 16 8 L 9.5 9.5 L 8 16 L 6.5 9.5 L 0 8 L 6.5 6.5 Z"
                      fill="#fbbf24"
                    />
                  </svg>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* 석양 정원일 때 석양 추가 */}
          {activePremiumItems.includes("sunset_bg") && (
            <div className="absolute top-0 right-0 z-5 pointer-events-none">
              <motion.div
                className="relative w-40 h-40"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5 }}
              >
                {/* 석양 태양 */}
                <div className="absolute top-8 right-8 w-24 h-24 bg-gradient-to-b from-orange-400 to-red-500 rounded-full opacity-80" />
                {/* 석양 빛 */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute top-8 right-8 w-32 h-1 bg-gradient-to-r from-orange-300/60 to-transparent origin-right"
                    style={{
                      transform: `rotate(${-30 + i * 15}deg) translateX(48px)`,
                      transformOrigin: '0% 50%',
                    }}
                    animate={{
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </motion.div>
            </div>
          )}
          
          {/* 오로라 정원일 때 오로라 추가 */}
          {activePremiumItems.includes("aurora_bg") && (
            <div className="absolute inset-0 z-5 pointer-events-none">
              <motion.svg
                className="absolute top-0 left-0 w-full h-full"
                viewBox="0 0 400 400"
                style={{ opacity: 0.6 }}
              >
                <defs>
                  <linearGradient id="aurora1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="aurora2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 0 80 Q 100 60 200 80 T 400 80"
                  stroke="url(#aurora1)"
                  strokeWidth="40"
                  fill="none"
                  opacity="0.5"
                  animate={{
                    d: [
                      "M 0 80 Q 100 60 200 80 T 400 80",
                      "M 0 100 Q 100 80 200 100 T 400 100",
                      "M 0 80 Q 100 60 200 80 T 400 80",
                    ],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.path
                  d="M 0 120 Q 100 100 200 120 T 400 120"
                  stroke="url(#aurora2)"
                  strokeWidth="35"
                  fill="none"
                  opacity="0.4"
                  animate={{
                    d: [
                      "M 0 120 Q 100 100 200 120 T 400 120",
                      "M 0 140 Q 100 120 200 140 T 400 140",
                      "M 0 120 Q 100 100 200 120 T 400 120",
                    ],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.svg>
            </div>
          )}
          
          {/* 벚꽃 정원일 때 벚꽃 떨어지기 */}
          {activePremiumItems.includes("sakura_bg") && (
            <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
              {Array.from({ length: 25 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                  }}
                  initial={{ 
                    top: -30,
                    rotate: 0,
                  }}
                  animate={{
                    top: '110%',
                    rotate: 360,
                    x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
                  }}
                  transition={{
                    duration: 8 + Math.random() * 4,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                    ease: "linear"
                  }}
                >
                  <SakuraPetal />
                </motion.div>
              ))}
            </div>
          )}
          
          {/* 비오는 정원일 때 빗방울 추가 */}
          {activePremiumItems.includes("rainy_bg") && (
            <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-0.5 h-4 bg-blue-300/60"
                  style={{
                    left: `${Math.random() * 100}%`,
                  }}
                  initial={{ 
                    top: -20,
                  }}
                  animate={{
                    top: '110%',
                  }}
                  transition={{
                    duration: 0.5 + Math.random() * 0.5,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "linear"
                  }}
                />
              ))}
            </div>
          )}
        </div>

            {/* 아이템 정보 테이블 */}
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-800">
                  🎁 정원 아이템 도감
                </p>
              </div>
              
              {/* 필터 버튼 - 제목 아래 오른쪽 */}
              <div className="flex justify-end gap-1 mb-3">
                {[
                  { value: "all", label: "전체", icon: "🌟" },
                  { value: "flower", label: "꽃", icon: "🌸" },
                  { value: "pet", label: "펫", icon: "🐾" },
                  { value: "decoration", label: "장식", icon: "✨" },
                  { value: "background", label: "배경", icon: "🎨" }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setItemFilter(filter.value as any)}
                    className={`px-2 py-1 rounded-md text-xs transition-all ${
                      itemFilter === filter.value
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-gray-600 hover:bg-green-100"
                    }`}
                  >
                    <span className="hidden sm:inline">{filter.icon} {filter.label}</span>
                    <span className="sm:hidden">{filter.icon}</span>
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2">
                {AVAILABLE_ITEMS
                  .filter(item => itemFilter === "all" || item.type === itemFilter)
                  .map((item) => {
                  const isUnlocked = unlockedItems.includes(item.id);
                  // 정원에 실제로 있는지 확인
                  const isInGarden = item.type === 'flower' 
                    ? emotions.some(e => e.emotion === item.id)
                    : (item.isPremium || item.id === 'default_sun')
                      ? activePremiumItems.includes(item.id)
                      : unlockedItems.includes(item.id);
                  
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`relative p-1.5 sm:p-2 md:p-3 rounded-lg border-2 transition-all overflow-hidden ${
                        item.isPremium
                          ? isInGarden
                            ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400 shadow-md"
                            : "bg-gradient-to-br from-gray-50 to-slate-50 border-amber-300 hover:border-amber-400"
                          : isInGarden
                            ? "bg-white border-green-500 shadow-md"
                            : "bg-white border-gray-300 hover:border-gray-400"
                      } ${item.type === 'animal' ? 'min-h-[5.5rem] sm:min-h-[6rem] md:min-h-[6.5rem]' : ''}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`${item.type === 'animal' ? 'mb-1 sm:mb-1.5 h-8 sm:h-9 md:h-10' : 'mb-0.5 sm:mb-1'} flex items-center justify-center overflow-hidden`}>
                        {/* 꽃이면 실제 SVG 표시 */}
                        {item.type === 'flower' ? (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12">
                            <EmotionPlant emotion={item.id} onClick={() => {}} isGrowing={false} />
                          </div>
                        ) : item.id === 'dog' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.55] sm:scale-[0.6] md:scale-[0.65]">
                              <GardenDog isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'maltese' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.55] sm:scale-[0.6] md:scale-[0.65]">
                              <GardenMaltese isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'retriever' ? (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center">
                            <div className="scale-[0.5] sm:scale-[0.55] md:scale-[0.6]">
                              <GardenRetriever isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'cat' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.55] sm:scale-[0.6] md:scale-[0.65]">
                              <GardenCat isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'spotted_cat' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.55] sm:scale-[0.6] md:scale-[0.65]">
                              <GardenSpottedCat isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'white_cat' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.55] sm:scale-[0.6] md:scale-[0.65]">
                              <GardenWhiteCat isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'butterfly' ? (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                            <div className="scale-[0.65] sm:scale-75 md:scale-[0.85]">
                              <GardenButterfly isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'fountain' ? (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center">
                            <div className="scale-[0.45] sm:scale-[0.5] md:scale-[0.55]">
                              <GardenFountain isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'fairy' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.6] sm:scale-[0.65] md:scale-[0.7]">
                              <GardenFairy isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'firefly' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.5] sm:scale-[0.55] md:scale-[0.6]">
                              <GardenFirefly isStatic={true} />
                            </div>
                          </div>
                        ) : item.id === 'default_sun' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center relative">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-yellow-300 rounded-full shadow-md" />
                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                              <div
                                key={i}
                                className="absolute top-1/2 left-1/2 w-3 h-0.5 sm:w-3.5 sm:h-0.5 md:w-4 md:h-0.5 bg-yellow-200"
                                style={{
                                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${angle % 90 === 0 ? '10px' : '8px'})`,
                                  transformOrigin: "center",
                                }}
                              />
                            ))}
                          </div>
                        ) : item.id === 'golden_sun' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.4] sm:scale-[0.45] md:scale-[0.5]">
                              <GardenGoldenSun />
                            </div>
                          </div>
                        ) : item.id === 'smiling_sun' ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="scale-[0.4] sm:scale-[0.45] md:scale-[0.5]">
                              <GardenSmilingSun />
                            </div>
                          </div>
                        ) : item.id === 'rainy_bg' ? (
                          <div className="flex items-center justify-center">
                            <RaindropIcon size="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                          </div>
                        ) : item.id === 'rainbow_bg' ? (
                          <div className="flex items-center justify-center">
                            <RainbowIcon size="w-8 h-5 sm:w-10 sm:h-6 md:w-12 md:h-7" />
                          </div>
                        ) : item.id === 'thunder_bg' ? (
                          <div className="flex items-center justify-center">
                            <LightningIcon size="w-5 h-6 sm:w-6 sm:h-7 md:w-7 md:h-8" />
                          </div>
                        ) : item.id === 'snow_bg' ? (
                          <div className="flex items-center justify-center">
                            <SnowflakeIcon size="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                          </div>
                        ) : item.id === 'starry_bg' ? (
                          <div className="flex items-center justify-center">
                            <StarIcon size="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                          </div>
                        ) : item.id === 'sunset_bg' ? (
                          <div className="flex items-center justify-center">
                            <SunsetIcon size="w-8 h-5 sm:w-10 sm:h-6 md:w-12 md:h-7" />
                          </div>
                        ) : item.id === 'aurora_bg' ? (
                          <div className="flex items-center justify-center">
                            <AuroraIcon size="w-8 h-5 sm:w-10 sm:h-6 md:w-12 md:h-7" />
                          </div>
                        ) : item.id === 'sakura_bg' ? (
                          <div className="flex items-center justify-center">
                            <SakuraPetal size="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9" />
                          </div>
                        ) : item.type === 'background' ? (
                          <div className="text-2xl sm:text-3xl md:text-4xl">{item.icon}</div>
                        ) : (
                          <div className="text-xl sm:text-2xl md:text-3xl">{item.icon}</div>
                        )}
                      </div>
                      <div className="text-[0.65rem] sm:text-xs md:text-sm text-gray-700 truncate font-handwriting px-0.5 text-center">
                        {item.name}
                      </div>
                      {/* 프리미엄 배지 */}
                      {item.isPremium && (
                        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full px-1 py-0.5 sm:px-1.5 sm:py-0.5 shadow-sm">
                            <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                      {/* 활성화 표시 - 기본 해 포함 */}
                      {(item.isPremium || item.id === 'default_sun') && isInGarden && (
                        <div className="absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1">
                          <div className="bg-green-500 rounded-full p-0.5 sm:p-1 shadow-sm">
                            <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* 아이템 상세 정보 다이얼로그 */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-3xl">{selectedItem?.icon}</span>
              {selectedItem?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* 프리미엄 아이템 배지 */}
            {selectedItem?.isPremium && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-900 font-medium">
                    ✨ 프리미엄 아이템
                  </p>
                </div>
                <p className="text-xs text-amber-700">
                  {selectedItem.type === 'background' 
                    ? '정원의 배경을 특별하게 꾸며줍니다'
                    : selectedItem.type === 'pet'
                    ? '당신만의 특별한 반려동물입니다'
                    : '정원을 더욱 아름답게 꾸며줍니다'}
                </p>
              </div>
            )}
            
            <div className={`p-3 rounded-lg ${selectedItem?.isPremium ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50'}`}>
              <p className={`text-sm mb-1 ${selectedItem?.isPremium ? 'text-amber-800' : 'text-blue-800'}`}>
                🔓 획득 방법
              </p>
              <p className={`text-xs ${selectedItem?.isPremium ? 'text-amber-700' : 'text-blue-600'}`}>
                {selectedItem?.unlockCondition}
              </p>
            </div>
            {selectedItem && unlockedItems.includes(selectedItem.id) ? (
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-green-800">
                  ✅ 이미 잠금 해제되었습니다!
                </p>
              </div>
            ) : selectedItem?.isPremium ? (
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-center">
                <p className="text-sm text-purple-800 mb-2">
                  💎 아이템 패키지 구매하기
                </p>
                <Button 
                  onClick={() => {
                    setIsItemDialogOpen(false);
                    setIsSubscriptionDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white gap-2"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4" />
                  구매하기
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <p className="text-sm text-yellow-800">
                  {selectedItem?.type === 'pet' ||  selectedItem?.type === 'decoration' 
                    ? '💡 미션에 성공하면 다음 주 월요일부터 정원에 나타납니다'
                    : '💡 해당 감정을 기록하면 정원에 나타납니다'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 아이템 패키지 구매 다이얼로그 */}
      <SubscriptionDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
        initialProductType="item-package"
        onSuccess={() => {
          loadGardenData(); // 구매 후 정원 데이터 새로고침
        }}
      />
    </Card>
  );
}
