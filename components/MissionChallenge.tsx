import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Trash2, Plus, CheckCircle2, Circle, Trophy, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { apiCall } from '../utils/api';
import { logUserAction } from '../utils/logUserAction';
import { toast } from 'sonner';

interface Mission {
  id: string;
  title: string;
  duration: 7 | 10 | 14 | 30;
  createdAt: string;
  checks: string[]; // Array of timestamps when checked
  completed: boolean;
  failed?: boolean;
  failedAt?: string;
  completedAt?: string;
}

// Sticker Board Designs for different durations
function StickerBoard({ 
  mission, 
  onCheck 
}: { 
  mission: Mission; 
  onCheck: () => void;
}) {
  const { duration, checks, failed } = mission;
  
  // Format today's date as yyyy-mm-dd to match server format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  const hasCheckedToday = checks.some(check => check.startsWith(today));
  const progress = checks.length;
  const isDisabled = failed || hasCheckedToday;

  // 7-day: Grape Bunch
  if (duration === 7) {
    return (
      <div className="relative py-8">
        <svg viewBox="0 0 200 250" className="w-full max-w-[200px] mx-auto">
          {/* Stem */}
          <path d="M 100 10 Q 95 20 100 30" stroke="#8B4513" strokeWidth="3" fill="none" />
          <path d="M 100 10 L 90 5 M 100 10 L 110 5" stroke="#228B22" strokeWidth="2" fill="none" />
          
          {/* Grapes - 7 grapes in bunch formation: 3-2-2 pattern */}
          {/* Row 1 - 3 grapes */}
          <GrapeCircle cx={75} cy={60} checked={progress >= 1} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 0} checkDate={checks[0]} />
          <GrapeCircle cx={100} cy={60} checked={progress >= 2} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 1} checkDate={checks[1]} />
          <GrapeCircle cx={125} cy={60} checked={progress >= 3} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 2} checkDate={checks[2]} />
          
          {/* Row 2 - 2 grapes */}
          <GrapeCircle cx={87} cy={90} checked={progress >= 4} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 3} checkDate={checks[3]} />
          <GrapeCircle cx={113} cy={90} checked={progress >= 5} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 4} checkDate={checks[4]} />
          
          {/* Row 3 - 2 grapes */}
          <GrapeCircle cx={87} cy={120} checked={progress >= 6} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 5} checkDate={checks[5]} />
          <GrapeCircle cx={113} cy={120} checked={progress >= 7} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 6} checkDate={checks[6]} />
        </svg>
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">{progress} / {duration}일 완료</p>
        </div>
      </div>
    );
  }

  // 10-day: Cute Stickers Collection
  if (duration === 10) {
    return (
      <div className="relative py-8">
        <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
          <CuteSticker type="heart" checked={progress >= 1} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 0} checkDate={checks[0]} />
          <CuteSticker type="star" checked={progress >= 2} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 1} checkDate={checks[1]} />
          <CuteSticker type="sun" checked={progress >= 3} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 2} checkDate={checks[2]} />
          <CuteSticker type="cloud" checked={progress >= 4} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 3} checkDate={checks[3]} />
          <CuteSticker type="dog" checked={progress >= 5} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 4} checkDate={checks[4]} />
          <CuteSticker type="cat" checked={progress >= 6} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 5} checkDate={checks[5]} />
          <CuteSticker type="fairy" checked={progress >= 7} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 6} checkDate={checks[6]} />
          <CuteSticker type="icecream" checked={progress >= 8} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 7} checkDate={checks[7]} />
          <CuteSticker type="bear" checked={progress >= 9} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 8} checkDate={checks[8]} />
          <CuteSticker type="clover" checked={progress >= 10} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 9} checkDate={checks[9]} />
        </div>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">{progress} / {duration}일 완료</p>
        </div>
      </div>
    );
  }

  // 14-day: Gemini Constellation (쌍둥이자리)
  if (duration === 14) {
    return (
      <div className="relative py-8">
        <svg viewBox="0 0 300 320" className="w-full max-w-[300px] mx-auto">
          {/* Constellation lines */}
          <g stroke="#94a3b8" strokeWidth="2" opacity="0.5">
            {/* Left twin - Pollux */}
            <line x1="70" y1="60" x2="70" y2="100" />
            <line x1="70" y1="100" x2="70" y2="140" />
            <line x1="70" y1="140" x2="50" y2="180" />
            <line x1="70" y1="140" x2="90" y2="180" />
            <line x1="50" y1="180" x2="50" y2="220" />
            <line x1="90" y1="180" x2="90" y2="220" />
            <line x1="50" y1="220" x2="40" y2="260" />
            
            {/* Right twin - Castor */}
            <line x1="230" y1="60" x2="230" y2="100" />
            <line x1="230" y1="100" x2="230" y2="140" />
            <line x1="230" y1="140" x2="210" y2="180" />
            <line x1="230" y1="140" x2="250" y2="180" />
            <line x1="210" y1="180" x2="210" y2="220" />
            <line x1="250" y1="180" x2="250" y2="220" />
            <line x1="250" y1="220" x2="260" y2="260" />
            
            {/* Connection line */}
            <line x1="70" y1="100" x2="230" y2="100" />
          </g>
          
          {/* Left twin stars (Pollux - 7 stars) */}
          <StarSticker x={70} y={60} checked={progress >= 1} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 0} checkDate={checks[0]} />
          <StarSticker x={70} y={100} checked={progress >= 2} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 1} checkDate={checks[1]} />
          <StarSticker x={70} y={140} checked={progress >= 3} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 2} checkDate={checks[2]} />
          <StarSticker x={50} y={180} checked={progress >= 4} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 3} checkDate={checks[3]} />
          <StarSticker x={90} y={180} checked={progress >= 5} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 4} checkDate={checks[4]} />
          <StarSticker x={50} y={220} checked={progress >= 6} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 5} checkDate={checks[5]} />
          <StarSticker x={40} y={260} checked={progress >= 7} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 6} checkDate={checks[6]} />
          
          {/* Right twin stars (Castor - 7 stars) */}
          <StarSticker x={230} y={60} checked={progress >= 8} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 7} checkDate={checks[7]} />
          <StarSticker x={230} y={100} checked={progress >= 9} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 8} checkDate={checks[8]} />
          <StarSticker x={230} y={140} checked={progress >= 10} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 9} checkDate={checks[9]} />
          <StarSticker x={210} y={180} checked={progress >= 11} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 10} checkDate={checks[10]} />
          <StarSticker x={250} y={180} checked={progress >= 12} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 11} checkDate={checks[11]} />
          <StarSticker x={210} y={220} checked={progress >= 13} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 12} checkDate={checks[12]} />
          <StarSticker x={260} y={260} checked={progress >= 14} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 13} checkDate={checks[13]} />
        </svg>
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">{progress} / {duration}일 완료</p>
        </div>
      </div>
    );
  }

  // 30-day: Growing Tree Garden
  if (duration === 30) {
    return (
      <div className="relative py-8">
        <svg viewBox="0 0 300 320" className="w-full max-w-[300px] mx-auto">
          {/* Ground */}
          <rect x="40" y="295" width="220" height="25" fill="#d4a574" opacity="0.3" />
          <line x1="40" y1="295" x2="260" y2="295" stroke="#8B7355" strokeWidth="3" strokeLinecap="round" />
          
          {/* Roots (days 1-3) */}
          <TreeRoot x={150} y={280} checked={progress >= 1} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 0} checkDate={checks[0]} />
          <TreeRoot x={135} y={285} checked={progress >= 2} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 1} checkDate={checks[1]} />
          <TreeRoot x={165} y={285} checked={progress >= 3} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 2} checkDate={checks[2]} />
          
          {/* Trunk (days 4-9) */}
          <TreeTrunk x={150} y={270} checked={progress >= 4} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 3} checkDate={checks[3]} />
          <TreeTrunk x={150} y={250} checked={progress >= 5} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 4} checkDate={checks[4]} />
          <TreeTrunk x={150} y={230} checked={progress >= 6} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 5} checkDate={checks[5]} />
          <TreeTrunk x={150} y={210} checked={progress >= 7} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 6} checkDate={checks[6]} />
          <TreeTrunk x={150} y={190} checked={progress >= 8} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 7} checkDate={checks[7]} />
          <TreeTrunk x={150} y={170} checked={progress >= 9} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 8} checkDate={checks[8]} />
          
          {/* Bottom foliage layer - dark green (days 10-12) */}
          <TreeLeafCluster x={95} y={180} size="large" color="dark" checked={progress >= 10} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 9} checkDate={checks[9]} />
          <TreeLeafCluster x={150} y={185} size="large" color="dark" checked={progress >= 11} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 10} checkDate={checks[10]} />
          <TreeLeafCluster x={205} y={180} size="large" color="dark" checked={progress >= 12} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 11} checkDate={checks[11]} />
          
          {/* Middle foliage layer - medium green (days 13-15) */}
          <TreeLeafCluster x={130} y={150} size="large" color="green" checked={progress >= 13} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 12} checkDate={checks[12]} />
          <TreeLeafCluster x={150} y={145} size="large" color="green" checked={progress >= 14} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 13} checkDate={checks[13]} />
          <TreeLeafCluster x={170} y={150} size="large" color="green" checked={progress >= 15} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 14} checkDate={checks[14]} />
          
          {/* Flowers on middle foliage (days 16-17) */}
          <TreeFlower x={135} y={135} color="pink" checked={progress >= 16} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 15} checkDate={checks[15]} />
          <TreeFlower x={165} y={135} color="yellow" checked={progress >= 17} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 16} checkDate={checks[16]} />
          
          {/* Top foliage layer - light green (days 18-20) */}
          <TreeLeafCluster x={120} y={105} size="large" color="light" checked={progress >= 18} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 17} checkDate={checks[17]} />
          <TreeLeafCluster x={180} y={105} size="large" color="light" checked={progress >= 19} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 18} checkDate={checks[18]} />
          <TreeLeafCluster x={150} y={90} size="large" color="light" checked={progress >= 20} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 19} checkDate={checks[19]} />
          
          {/* Flowers on top foliage (days 21-23) */}
          <TreeFlower x={110} y={90} color="purple" checked={progress >= 21} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 20} checkDate={checks[20]} />
          <TreeFlower x={190} y={90} color="red" checked={progress >= 22} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 21} checkDate={checks[21]} />
          <TreeFlower x={150} y={75} color="pink" checked={progress >= 23} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 22} checkDate={checks[22]} />
          
          {/* Garden decorations (days 24-30) */}
          <GardenDecoration type="cloud" x={60} y={70} checked={progress >= 24} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 23} checkDate={checks[23]} />
          <GardenDecoration type="sun" x={240} y={60} checked={progress >= 25} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 24} checkDate={checks[24]} />
          <GardenDecoration type="butterfly" x={210} y={120} checked={progress >= 26} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 25} checkDate={checks[25]} />
          <GardenDecoration type="dog" x={60} y={280} checked={progress >= 27} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 26} checkDate={checks[26]} />
          <GardenDecoration type="cat" x={200} y={283} checked={progress >= 28} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 27} checkDate={checks[27]} />
          <GardenDecoration type="rabbit" x={230} y={283} checked={progress >= 29} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 28} checkDate={checks[28]} />
          <GardenDecoration type="happy-flower" x={130} y={280} checked={progress >= 30} onClick={() => !isDisabled && onCheck()} disabled={isDisabled || progress !== 29} checkDate={checks[29]} />
        </svg>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">{progress} / {duration}일 완료</p>
        </div>
      </div>
    );
  }

  return null;
}

// Mission Card Component
function MissionCard({ mission, onClick }: { mission: Mission; onClick: () => void }) {
  const getDurationLabel = (duration: number) => {
    switch (duration) {
      case 7: return '7일 챌린지';
      case 10: return '10일 챌린지';
      case 14: return '2주 챌린지';
      case 30: return '한 달 챌린지';
      default: return `${duration}일 챌린지`;
    }
  };

  const getDurationIcon = (duration: number) => {
    switch (duration) {
      case 7: return '🍇';
      case 10: return '🎨';
      case 14: return '♊';
      case 30: return '🌳';
      default: return '🎯';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <Card
      className={`bg-white/90 backdrop-blur cursor-pointer transition-all hover:shadow-lg ${
        mission.completed ? 'border-2 border-green-500' : mission.failed ? 'border-2 border-red-400' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>{getDurationIcon(mission.duration)}</span>
            <span className="text-base">{mission.title}</span>
          </span>
          {mission.completed && (
            <Trophy className="w-5 h-5 text-yellow-500" />
          )}
          {mission.failed && (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </CardTitle>
        <CardDescription className="flex flex-col gap-0.5">
          <span>{getDurationLabel(mission.duration)}{mission.failed && ' - 실패'}</span>
          <span className="text-xs text-gray-500">시작: {formatDate(mission.createdAt)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`${mission.failed ? 'bg-red-400' : 'bg-gradient-to-r from-blue-500 to-purple-500'} h-full`}
              initial={{ width: 0 }}
              animate={{ width: `${(mission.checks.length / mission.duration) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-sm whitespace-nowrap">
            {mission.checks.length}/{mission.duration}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Grape Circle Component
function GrapeCircle({ 
  cx, 
  cy, 
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  cx: number; 
  cy: number; 
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.1 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={18}
          fill={checked ? '#9333ea' : disabled ? '#f3f4f6' : '#e9d5ff'}
          stroke={checked ? '#7e22ce' : disabled ? '#d1d5db' : '#c084fc'}
          strokeWidth="2"
          opacity={disabled && !checked ? 0.5 : 1}
        />
        {checked && (
          <motion.g
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <path
              d={`M ${cx - 6} ${cy} L ${cx - 2} ${cy + 5} L ${cx + 6} ${cy - 5}`}
              stroke="white"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={cx} cy={cy - 8} r={1.5} fill="#fbbf24" />
          </motion.g>
        )}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

// Cute Sticker Component (10 different types)
function CuteSticker({ 
  type, 
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  type: 'heart' | 'star' | 'sun' | 'cloud' | 'dog' | 'cat' | 'fairy' | 'icecream' | 'bear' | 'clover';
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const renderSticker = () => {
    switch (type) {
      case 'heart':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Heart body */}
            <path
              d="M30 52 C20 42, 8 34, 8 22 C8 14, 13 8, 20 8 C25 8, 28 11, 30 15 C32 11, 35 8, 40 8 C47 8, 52 14, 52 22 C52 34, 40 42, 30 52 Z"
              fill={checked ? '#ff6b9d' : disabled ? '#fce7f3' : '#ffb3d1'}
              stroke={checked ? '#ec4899' : disabled ? '#e5e7eb' : '#ff6b9d'}
              strokeWidth="2.5"
            />
            {/* Eyes */}
            <circle cx="23" cy="22" r="2.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="37" cy="22" r="2.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="24" cy="21" r="1" fill="#fff" />
                <circle cx="38" cy="21" r="1" fill="#fff" />
              </>
            )}
            {/* Blushing cheeks */}
            <ellipse cx="18" cy="28" rx="3" ry="2" fill="#ff8cb3" opacity={checked ? 0.6 : 0.3} />
            <ellipse cx="42" cy="28" rx="3" ry="2" fill="#ff8cb3" opacity={checked ? 0.6 : 0.3} />
            {/* Smile */}
            <path 
              d="M25 30 Q30 35 35 30" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
          </svg>
        );
      
      case 'star':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Star body */}
            <path
              d="M30 8 L35 23 L51 23 L39 33 L44 48 L30 38 L16 48 L21 33 L9 23 L25 23 Z"
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
              stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
              strokeWidth="2.5"
            />
            {/* Eyes */}
            <circle cx="26" cy="28" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="34" cy="28" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="27" cy="27" r="0.8" fill="#fff" />
                <circle cx="35" cy="27" r="0.8" fill="#fff" />
              </>
            )}
            {/* Happy smile */}
            <path 
              d="M25 34 Q30 38 35 34" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
          </svg>
        );
      
      case 'sun':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Sun body */}
            <circle 
              cx="30" cy="30" r="14" 
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
              stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
              strokeWidth="2.5"
            />
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 30 + Math.cos(rad) * 17;
              const y1 = 30 + Math.sin(rad) * 17;
              const x2 = 30 + Math.cos(rad) * 24;
              const y2 = 30 + Math.sin(rad) * 24;
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity={checked ? 1 : 0.4}
                />
              );
            })}
            {/* Eyes */}
            <circle cx="26" cy="28" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="34" cy="28" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="27" cy="27" r="0.8" fill="#fff" />
                <circle cx="35" cy="27" r="0.8" fill="#fff" />
              </>
            )}
            {/* Blushing cheeks */}
            <ellipse cx="21" cy="32" rx="3" ry="2" fill="#f59e0b" opacity={checked ? 0.4 : 0.2} />
            <ellipse cx="39" cy="32" rx="3" ry="2" fill="#f59e0b" opacity={checked ? 0.4 : 0.2} />
            {/* Big smile */}
            <path 
              d="M24 33 Q30 38 36 33" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
          </svg>
        );
      
      case 'dog':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Dog head */}
            <ellipse 
              cx="30" cy="32" rx="14" ry="16" 
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
              stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
              strokeWidth="2.5"
            />
            {/* Left ear */}
            <ellipse 
              cx="18" cy="22" rx="6" ry="12" 
              fill={checked ? '#f59e0b' : disabled ? '#fef9e7' : '#fbbf24'}
              stroke={checked ? '#d97706' : disabled ? '#e5e7eb' : '#f59e0b'}
              strokeWidth="2"
              transform="rotate(-20 18 22)"
            />
            {/* Right ear */}
            <ellipse 
              cx="42" cy="22" rx="6" ry="12" 
              fill={checked ? '#f59e0b' : disabled ? '#fef9e7' : '#fbbf24'}
              stroke={checked ? '#d97706' : disabled ? '#e5e7eb' : '#f59e0b'}
              strokeWidth="2"
              transform="rotate(20 42 22)"
            />
            {/* Eyes */}
            <circle cx="25" cy="30" r="2.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="35" cy="30" r="2.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="26" cy="29" r="1" fill="#fff" />
                <circle cx="36" cy="29" r="1" fill="#fff" />
              </>
            )}
            {/* Nose */}
            <ellipse 
              cx="30" cy="36" rx="3" ry="2.5" 
              fill="#2d3748" 
              opacity={checked ? 1 : 0.3}
            />
            {/* Mouth */}
            <path 
              d="M30 36 L30 39" 
              stroke="#2d3748" 
              strokeWidth="2" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            <path 
              d="M25 40 Q30 43 35 40" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            {/* Tongue */}
            {checked && (
              <ellipse cx="30" cy="42" rx="2" ry="3" fill="#ff6b9d" opacity="0.8" />
            )}
            {/* Blushing cheeks */}
            <ellipse cx="20" cy="34" rx="3" ry="2" fill="#f59e0b" opacity={checked ? 0.4 : 0.2} />
            <ellipse cx="40" cy="34" rx="3" ry="2" fill="#f59e0b" opacity={checked ? 0.4 : 0.2} />
          </svg>
        );
      
      case 'cloud':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Cloud body */}
            <path
              d="M15 34 C15 30, 18 27, 22 27 C23 24, 26 22, 30 22 C34 22, 37 24, 38 27 C42 27, 45 30, 45 34 C45 38, 42 41, 38 41 L22 41 C18 41, 15 38, 15 34 Z"
              fill={checked ? '#93c5fd' : disabled ? '#f3f4f6' : '#bfdbfe'}
              stroke={checked ? '#3b82f6' : disabled ? '#e5e7eb' : '#93c5fd'}
              strokeWidth="2.5"
            />
            {/* Eyes */}
            <circle cx="25" cy="32" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="35" cy="32" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="26" cy="31" r="0.8" fill="#fff" />
                <circle cx="36" cy="31" r="0.8" fill="#fff" />
              </>
            )}
            {/* Smile */}
            <path 
              d="M26 36 Q30 39 34 36" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
          </svg>
        );
      
      case 'cat':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Cat head */}
            <ellipse 
              cx="30" cy="34" rx="13" ry="14" 
              fill={checked ? '#fca5a5' : disabled ? '#fef2f2' : '#fecaca'}
              stroke={checked ? '#ef4444' : disabled ? '#e5e7eb' : '#fca5a5'}
              strokeWidth="2.5"
            />
            {/* Left ear */}
            <path 
              d="M18 20 L14 8 L24 18 Z"
              fill={checked ? '#fca5a5' : disabled ? '#fef2f2' : '#fecaca'}
              stroke={checked ? '#ef4444' : disabled ? '#e5e7eb' : '#fca5a5'}
              strokeWidth="2"
            />
            <path 
              d="M18 20 L16 12 L22 18"
              fill={checked ? '#ff8cb3' : disabled ? '#fff' : '#ffdee8'}
              stroke="none"
            />
            {/* Right ear */}
            <path 
              d="M42 20 L46 8 L36 18 Z"
              fill={checked ? '#fca5a5' : disabled ? '#fef2f2' : '#fecaca'}
              stroke={checked ? '#ef4444' : disabled ? '#e5e7eb' : '#fca5a5'}
              strokeWidth="2"
            />
            <path 
              d="M42 20 L44 12 L38 18"
              fill={checked ? '#ff8cb3' : disabled ? '#fff' : '#ffdee8'}
              stroke="none"
            />
            {/* Eyes - closed happy eyes */}
            <path 
              d="M23 32 Q25 34 27 32"
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            <path 
              d="M33 32 Q35 34 37 32"
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            {/* Nose */}
            <path 
              d="M28 38 L30 40 L32 38 Z"
              fill="#2d3748" 
              opacity={checked ? 1 : 0.3}
            />
            {/* Mouth */}
            <path 
              d="M30 40 Q28 42 26 41"
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            <path 
              d="M30 40 Q32 42 34 41"
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            {/* Whiskers */}
            <line x1="12" y1="35" x2="18" y2="34" stroke="#2d3748" strokeWidth="1.5" opacity={checked ? 0.6 : 0.3} />
            <line x1="12" y1="38" x2="18" y2="38" stroke="#2d3748" strokeWidth="1.5" opacity={checked ? 0.6 : 0.3} />
            <line x1="42" y1="34" x2="48" y2="35" stroke="#2d3748" strokeWidth="1.5" opacity={checked ? 0.6 : 0.3} />
            <line x1="42" y1="38" x2="48" y2="38" stroke="#2d3748" strokeWidth="1.5" opacity={checked ? 0.6 : 0.3} />
            {/* Blushing cheeks */}
            <ellipse cx="20" cy="37" rx="3" ry="2" fill="#ef4444" opacity={checked ? 0.4 : 0.2} />
            <ellipse cx="40" cy="37" rx="3" ry="2" fill="#ef4444" opacity={checked ? 0.4 : 0.2} />
          </svg>
        );
      
      case 'fairy':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Wings - left */}
            <ellipse 
              cx="20" cy="28" rx="8" ry="12" 
              fill={checked ? '#e9d5ff' : disabled ? '#faf5ff' : '#f3e8ff'}
              stroke={checked ? '#c084fc' : disabled ? '#e5e7eb' : '#d8b4fe'}
              strokeWidth="2"
              opacity="0.8"
            />
            {/* Wings - right */}
            <ellipse 
              cx="40" cy="28" rx="8" ry="12" 
              fill={checked ? '#e9d5ff' : disabled ? '#faf5ff' : '#f3e8ff'}
              stroke={checked ? '#c084fc' : disabled ? '#e5e7eb' : '#d8b4fe'}
              strokeWidth="2"
              opacity="0.8"
            />
            {/* Head */}
            <circle 
              cx="30" cy="24" r="10" 
              fill={checked ? '#fce7f3' : disabled ? '#fdf2f8' : '#fce7f3'}
              stroke={checked ? '#f9a8d4' : disabled ? '#e5e7eb' : '#fbcfe8'}
              strokeWidth="2.5"
            />
            {/* Hair/Crown */}
            <path 
              d="M20 20 Q25 12 30 14 Q35 12 40 20"
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
              stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
              strokeWidth="2"
            />
            {/* Star on crown */}
            <path 
              d="M30 10 L31 13 L34 13 L32 15 L33 18 L30 16 L27 18 L28 15 L26 13 L29 13 Z"
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
              stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
              strokeWidth="1"
            />
            {/* Eyes */}
            <circle cx="26" cy="24" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="34" cy="24" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="27" cy="23" r="0.8" fill="#fff" />
                <circle cx="35" cy="23" r="0.8" fill="#fff" />
              </>
            )}
            {/* Blushing cheeks */}
            <ellipse cx="22" cy="26" rx="3" ry="2" fill="#f9a8d4" opacity={checked ? 0.6 : 0.3} />
            <ellipse cx="38" cy="26" rx="3" ry="2" fill="#f9a8d4" opacity={checked ? 0.6 : 0.3} />
            {/* Smile */}
            <path 
              d="M26 28 Q30 31 34 28" 
              stroke="#2d3748" 
              strokeWidth="1.5" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            {/* Body */}
            <ellipse 
              cx="30" cy="42" rx="6" ry="10" 
              fill={checked ? '#e9d5ff' : disabled ? '#faf5ff' : '#f3e8ff'}
              stroke={checked ? '#c084fc' : disabled ? '#e5e7eb' : '#d8b4fe'}
              strokeWidth="2"
            />
            {/* Magic wand */}
            <line x1="38" y1="38" x2="46" y2="30" stroke={checked ? '#f9a8d4' : disabled ? '#e5e7eb' : '#fbcfe8'} strokeWidth="2" strokeLinecap="round" />
            <circle cx="46" cy="30" r="3" fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'} stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'} strokeWidth="2" />
            {checked && (
              <>
                <circle cx="43" cy="27" r="1" fill="#fbbf24" opacity="0.6" />
                <circle cx="49" cy="27" r="1" fill="#fbbf24" opacity="0.6" />
                <circle cx="46" cy="33" r="1" fill="#fbbf24" opacity="0.6" />
              </>
            )}
          </svg>
        );
      
      case 'icecream':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Cone */}
            <path
              d="M30 52 L22 30 L38 30 Z"
              fill={checked ? '#f59e0b' : disabled ? '#fef9e7' : '#fbbf24'}
              stroke={checked ? '#d97706' : disabled ? '#e5e7eb' : '#f59e0b'}
              strokeWidth="2.5"
            />
            <line x1="25" y1="36" x2="32" y2="46" stroke={checked ? '#d97706' : disabled ? '#e5e7eb' : '#f59e0b'} strokeWidth="1.5" opacity="0.3" />
            <line x1="35" y1="36" x2="28" y2="46" stroke={checked ? '#d97706' : disabled ? '#e5e7eb' : '#f59e0b'} strokeWidth="1.5" opacity="0.3" />
            {/* Ice cream scoop */}
            <circle 
              cx="30" cy="22" r="12" 
              fill={checked ? '#fca5a5' : disabled ? '#fef2f2' : '#fecaca'}
              stroke={checked ? '#ef4444' : disabled ? '#e5e7eb' : '#fca5a5'}
              strokeWidth="2.5"
            />
            {/* Eyes */}
            <circle cx="26" cy="20" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="34" cy="20" r="2" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="27" cy="19" r="0.8" fill="#fff" />
                <circle cx="35" cy="19" r="0.8" fill="#fff" />
              </>
            )}
            {/* Blushing cheeks */}
            <ellipse cx="21" cy="23" rx="3" ry="2" fill="#ef4444" opacity={checked ? 0.4 : 0.2} />
            <ellipse cx="39" cy="23" rx="3" ry="2" fill="#ef4444" opacity={checked ? 0.4 : 0.2} />
            {/* Smile */}
            <path 
              d="M26 25 Q30 28 34 25" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
          </svg>
        );
      
      case 'bear':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Bear head */}
            <ellipse 
              cx="30" cy="32" rx="15" ry="16" 
              fill={checked ? '#92400e' : disabled ? '#fef3c7' : '#d97706'}
              stroke={checked ? '#78350f' : disabled ? '#e5e7eb' : '#92400e'}
              strokeWidth="2.5"
            />
            {/* Left ear */}
            <circle 
              cx="18" cy="18" r="7" 
              fill={checked ? '#92400e' : disabled ? '#fef3c7' : '#d97706'}
              stroke={checked ? '#78350f' : disabled ? '#e5e7eb' : '#92400e'}
              strokeWidth="2.5"
            />
            <circle 
              cx="18" cy="18" r="4" 
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
            />
            {/* Right ear */}
            <circle 
              cx="42" cy="18" r="7" 
              fill={checked ? '#92400e' : disabled ? '#fef3c7' : '#d97706'}
              stroke={checked ? '#78350f' : disabled ? '#e5e7eb' : '#92400e'}
              strokeWidth="2.5"
            />
            <circle 
              cx="42" cy="18" r="4" 
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
            />
            {/* Snout */}
            <ellipse 
              cx="30" cy="38" rx="9" ry="7" 
              fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fde68a'}
              stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fbbf24'}
              strokeWidth="2"
            />
            {/* Eyes */}
            <circle cx="24" cy="28" r="2.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="36" cy="28" r="2.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="25" cy="27" r="1" fill="#fff" />
                <circle cx="37" cy="27" r="1" fill="#fff" />
              </>
            )}
            {/* Nose */}
            <ellipse 
              cx="30" cy="36" rx="3" ry="2.5" 
              fill="#2d3748" 
              opacity={checked ? 1 : 0.3}
            />
            {/* Mouth */}
            <path 
              d="M30 36 L30 39" 
              stroke="#2d3748" 
              strokeWidth="2" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            <path 
              d="M26 40 Q30 42 34 40" 
              stroke="#2d3748" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
            {/* Blushing cheeks */}
            <ellipse cx="19" cy="32" rx="3" ry="2" fill="#f59e0b" opacity={checked ? 0.4 : 0.2} />
            <ellipse cx="41" cy="32" rx="3" ry="2" fill="#f59e0b" opacity={checked ? 0.4 : 0.2} />
          </svg>
        );
      
      case 'clover':
        return (
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Stem */}
            <path 
              d="M30 52 Q32 42 30 32"
              stroke={checked ? '#15803d' : disabled ? '#f0fdf4' : '#22c55e'}
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              opacity={checked ? 1 : 0.4}
            />
            {/* Top left leaf */}
            <path 
              d="M30 32 Q20 28 18 20 Q16 12 20 10 Q24 8 28 12 Q32 16 30 24 Z"
              fill={checked ? '#22c55e' : disabled ? '#f0fdf4' : '#86efac'}
              stroke={checked ? '#15803d' : disabled ? '#e5e7eb' : '#22c55e'}
              strokeWidth="2.5"
            />
            {/* Top right leaf */}
            <path 
              d="M30 32 Q40 28 42 20 Q44 12 40 10 Q36 8 32 12 Q28 16 30 24 Z"
              fill={checked ? '#22c55e' : disabled ? '#f0fdf4' : '#86efac'}
              stroke={checked ? '#15803d' : disabled ? '#e5e7eb' : '#22c55e'}
              strokeWidth="2.5"
            />
            {/* Bottom left leaf */}
            <path 
              d="M30 32 Q20 36 18 44 Q16 52 20 54 Q24 56 28 52 Q32 48 30 40 Z"
              fill={checked ? '#22c55e' : disabled ? '#f0fdf4' : '#86efac'}
              stroke={checked ? '#15803d' : disabled ? '#e5e7eb' : '#22c55e'}
              strokeWidth="2.5"
            />
            {/* Bottom right leaf (4th leaf) */}
            <path 
              d="M30 32 Q40 36 42 44 Q44 52 40 54 Q36 56 32 52 Q28 48 30 40 Z"
              fill={checked ? '#22c55e' : disabled ? '#f0fdf4' : '#86efac'}
              stroke={checked ? '#15803d' : disabled ? '#e5e7eb' : '#22c55e'}
              strokeWidth="2.5"
            />
            {/* Center circle with face */}
            <circle 
              cx="30" cy="32" r="6" 
              fill={checked ? '#22c55e' : disabled ? '#f0fdf4' : '#86efac'}
              stroke={checked ? '#15803d' : disabled ? '#e5e7eb' : '#22c55e'}
              strokeWidth="2.5"
            />
            {/* Eyes */}
            <circle cx="28" cy="31" r="1.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            <circle cx="32" cy="31" r="1.5" fill="#2d3748" opacity={checked ? 1 : 0.3} />
            {/* Eye sparkles */}
            {checked && (
              <>
                <circle cx="28.5" cy="30.5" r="0.6" fill="#fff" />
                <circle cx="32.5" cy="30.5" r="0.6" fill="#fff" />
              </>
            )}
            {/* Smile */}
            <path 
              d="M28 33 Q30 35 32 33" 
              stroke="#2d3748" 
              strokeWidth="1.5" 
              fill="none" 
              strokeLinecap="round"
              opacity={checked ? 1 : 0.3}
            />
          </svg>
        );
    }
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${disabled ? 'cursor-default' : 'cursor-pointer'} relative`}
      title={checked && checkDate ? formatDate(checkDate) : undefined}
    >
      {renderSticker()}
      {disabled && !checked && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-30 rounded-lg" />
      )}
    </div>
  );
}

// Star Sticker Component
function StarSticker({ 
  x, 
  y, 
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  x: number; 
  y: number; 
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.2 }}
        whileTap={disabled ? {} : { scale: 0.9 }}
      >
        <motion.path
          d={`M ${x} ${y - 12} L ${x + 3} ${y - 3} L ${x + 12} ${y - 3} L ${x + 5} ${y + 3} L ${x + 8} ${y + 12} L ${x} ${y + 6} L ${x - 8} ${y + 12} L ${x - 5} ${y + 3} L ${x - 12} ${y - 3} L ${x - 3} ${y - 3} Z`}
          fill={checked ? '#fbbf24' : disabled ? '#fef9e7' : '#fef3c7'}
          stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fcd34d'}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.5 : 1}
        />
        {checked && (
          <motion.circle
            cx={x}
            cy={y}
            r={3}
            fill="#fff"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 0.5 }}
          />
        )}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

// Moon Phase Component
function MoonPhase({ 
  phase, 
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  phase: number; 
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 14일 달 주기: 새 달 -> 초승달 -> 상현달 -> 보름달 -> 하현달 -> 그믐달
  const getMoonEmoji = (dayIndex: number) => {
    const moons = [
      '🌑', // Day 1: 새 달
      '🌒', // Day 2: 초승달
      '🌒', // Day 3: 초승달 커짐
      '🌓', // Day 4: 상현달
      '🌔', // Day 5: 상현달 이후
      '🌔', // Day 6: 거의 보름달
      '🌕', // Day 7: 보름달!
      '🌕', // Day 8: 보름달 유지
      '🌖', // Day 9: 기우는 달 시작
      '🌖', // Day 10: 기우는 달
      '🌗', // Day 11: 하현달
      '🌘', // Day 12: 그믐달
      '🌘', // Day 13: 그믐달 작아짐
      '🌑', // Day 14: 다시 새 달
    ];
    return moons[dayIndex] || '🌑';
  };

  const dayNumber = phase + 1; // phase는 0-13이므로 1-14로 변환

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      className={`${disabled ? 'cursor-default' : 'cursor-pointer'} relative w-10 h-10 flex items-center justify-center`}
      whileHover={disabled ? {} : { scale: 1.15 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      title={checked && checkDate ? formatDate(checkDate) : undefined}
    >
      <div 
        className="text-3xl"
        style={{
          filter: checked ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255,255,255,0.8))' : disabled && !checked ? 'grayscale(1) opacity(0.3)' : 'opacity(0.6)'
        }}
      >
        {getMoonEmoji(phase)}
      </div>
      {checked && (
        <motion.div
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          <div className="text-white text-xs">✓</div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Tree Root Component
function TreeRoot({ 
  x,
  y,
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  x: number;
  y: number;
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.1 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        {/* Root shape */}
        <path
          d={`M ${x} ${y} Q ${x - 8} ${y + 5} ${x - 10} ${y + 10} M ${x} ${y} Q ${x + 8} ${y + 5} ${x + 10} ${y + 10}`}
          stroke={checked ? '#8B4513' : disabled ? '#e5e7eb' : '#d4a574'}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity={disabled && !checked ? 0.3 : 1}
        />
        {checked && (
          <motion.circle
            cx={x}
            cy={y}
            r={3}
            fill="#4ade80"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          />
        )}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

// Tree Trunk Component
function TreeTrunk({ 
  x,
  y,
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  x: number;
  y: number;
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.05 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
      >
        <rect
          x={x - 8}
          y={y - 10}
          width={16}
          height={20}
          rx={2}
          fill={checked ? '#8B4513' : disabled ? '#f3f4f6' : '#d4a574'}
          stroke={checked ? '#654321' : disabled ? '#e5e7eb' : '#a0826d'}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.3 : 1}
        />
        {checked && (
          <motion.rect
            x={x - 6}
            y={y - 8}
            width={12}
            height={16}
            rx={1}
            fill="#a0826d"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        )}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

// Tree Leaf Cluster Component (cloud-like foliage)
function TreeLeafCluster({ 
  x,
  y,
  size = 'medium',
  color = 'green',
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  x: number;
  y: number;
  size?: 'small' | 'medium' | 'large';
  color?: 'light' | 'green' | 'dark';
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // Size configurations
  const sizeConfig = {
    small: { scale: 0.7, circles: 3 },
    medium: { scale: 1, circles: 4 },
    large: { scale: 1.3, circles: 5 }
  };

  // Color configurations
  const colorConfig = {
    light: {
      fill: checked ? '#86efac' : '#d1fae5',
      stroke: checked ? '#4ade80' : '#86efac'
    },
    green: {
      fill: checked ? '#22c55e' : '#bbf7d0',
      stroke: checked ? '#16a34a' : '#4ade80'
    },
    dark: {
      fill: checked ? '#16a34a' : '#86efac',
      stroke: checked ? '#15803d' : '#22c55e'
    }
  };

  const config = sizeConfig[size];
  const colors = colorConfig[color];
  const baseRadius = 18 * config.scale;

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.1 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      >
        {/* Cloud-like leaf cluster made of overlapping circles */}
        <circle
          cx={x}
          cy={y}
          r={baseRadius}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.3 : 0.95}
        />
        <circle
          cx={x - baseRadius * 0.6}
          cy={y - baseRadius * 0.3}
          r={baseRadius * 0.8}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.3 : 0.9}
        />
        <circle
          cx={x + baseRadius * 0.6}
          cy={y - baseRadius * 0.3}
          r={baseRadius * 0.8}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.3 : 0.9}
        />
        <circle
          cx={x - baseRadius * 0.4}
          cy={y + baseRadius * 0.4}
          r={baseRadius * 0.7}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.3 : 0.85}
        />
        <circle
          cx={x + baseRadius * 0.4}
          cy={y + baseRadius * 0.4}
          r={baseRadius * 0.7}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
          opacity={disabled && !checked ? 0.3 : 0.85}
        />
        {checked && (
          <motion.circle
            cx={x}
            cy={y}
            r={4}
            fill="#fff"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          />
        )}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

// Tree Flower Component (small cute flowers)
function TreeFlower({ 
  x,
  y,
  color = 'pink',
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  x: number;
  y: number;
  color?: 'pink' | 'yellow' | 'purple' | 'red';
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const colorConfig = {
    pink: {
      petal: checked ? '#f472b6' : '#fce7f3',
      petalStroke: checked ? '#ec4899' : '#f9a8d4',
      center: checked ? '#fbbf24' : '#fef3c7'
    },
    yellow: {
      petal: checked ? '#fbbf24' : '#fef3c7',
      petalStroke: checked ? '#f59e0b' : '#fcd34d',
      center: checked ? '#f59e0b' : '#fcd34d'
    },
    purple: {
      petal: checked ? '#c084fc' : '#f3e8ff',
      petalStroke: checked ? '#a855f7' : '#d8b4fe',
      center: checked ? '#fbbf24' : '#fef3c7'
    },
    red: {
      petal: checked ? '#f87171' : '#fee2e2',
      petalStroke: checked ? '#ef4444' : '#fca5a5',
      center: checked ? '#fbbf24' : '#fef3c7'
    }
  };

  const colors = colorConfig[color];

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.3, rotate: 10 }}
        whileTap={disabled ? {} : { scale: 0.9 }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      >
        {/* Small flower petals - 5 petals */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <ellipse
            key={i}
            cx={x + 4 * Math.cos((angle * Math.PI) / 180)}
            cy={y + 4 * Math.sin((angle * Math.PI) / 180)}
            rx={2.5}
            ry={4}
            fill={colors.petal}
            stroke={colors.petalStroke}
            strokeWidth="0.8"
            transform={`rotate(${angle} ${x} ${y})`}
            opacity={disabled && !checked ? 0.3 : 1}
          />
        ))}
        {/* Flower center */}
        <circle 
          cx={x} 
          cy={y} 
          r={2} 
          fill={colors.center} 
          stroke={checked ? '#f59e0b' : disabled ? '#e5e7eb' : '#fcd34d'} 
          strokeWidth="0.8"
          opacity={disabled && !checked ? 0.3 : 1}
        />
        {checked && (
          <motion.circle
            cx={x}
            cy={y}
            r={1}
            fill="#fff"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          />
        )}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

// Garden Decoration Component (from EmotionGarden)
function GardenDecoration({ 
  x,
  y,
  type,
  checked, 
  onClick,
  disabled = false,
  checkDate = null
}: { 
  x: number;
  y: number;
  type: 'cloud' | 'sun' | 'dog' | 'cat' | 'butterfly' | 'happy-flower' | 'excited-flower' | 'rabbit';
  checked: boolean; 
  onClick: () => void;
  disabled?: boolean;
  checkDate?: string | null;
}) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const getDecorationSVG = () => {
    switch (type) {
      case 'cloud':
        return (
          <g>
            <ellipse cx={x} cy={y} rx={12} ry={8} fill={checked ? '#ffffff' : '#f3f4f6'} opacity={disabled && !checked ? 0.3 : 0.9} />
            <ellipse cx={x - 8} cy={y + 2} rx={8} ry={6} fill={checked ? '#ffffff' : '#f3f4f6'} opacity={disabled && !checked ? 0.3 : 0.9} />
            <ellipse cx={x + 8} cy={y + 2} rx={8} ry={6} fill={checked ? '#ffffff' : '#f3f4f6'} opacity={disabled && !checked ? 0.3 : 0.9} />
          </g>
        );
      case 'sun':
        return (
          <g>
            <circle cx={x} cy={y} r={10} fill={checked ? '#fbbf24' : '#fef3c7'} opacity={disabled && !checked ? 0.3 : 1} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={x + 12 * Math.cos((angle * Math.PI) / 180)}
                y1={y + 12 * Math.sin((angle * Math.PI) / 180)}
                x2={x + 16 * Math.cos((angle * Math.PI) / 180)}
                y2={y + 16 * Math.sin((angle * Math.PI) / 180)}
                stroke={checked ? '#f59e0b' : '#fcd34d'}
                strokeWidth="2"
                strokeLinecap="round"
                opacity={disabled && !checked ? 0.3 : 1}
              />
            ))}
            {checked && (
              <>
                <circle cx={x - 3} cy={y - 2} r={1.5} fill="#000" />
                <circle cx={x + 3} cy={y - 2} r={1.5} fill="#000" />
                <path d={`M ${x - 4} ${y + 3} Q ${x} ${y + 5} ${x + 4} ${y + 3}`} stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>
        );
      case 'dog':
        return (
          <g>
            <ellipse cx={x} cy={y + 3} rx={10} ry={8} fill={checked ? '#d4a574' : '#f3e5d7'} opacity={disabled && !checked ? 0.3 : 1} />
            <circle cx={x} cy={y - 3} r={6} fill={checked ? '#d4a574' : '#f3e5d7'} opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x - 8} cy={y - 5} rx={3} ry={5} fill={checked ? '#d4a574' : '#f3e5d7'} opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x + 8} cy={y - 5} rx={3} ry={5} fill={checked ? '#d4a574' : '#f3e5d7'} opacity={disabled && !checked ? 0.3 : 1} />
            {checked && (
              <>
                <circle cx={x - 2} cy={y - 4} r={1} fill="#000" />
                <circle cx={x + 2} cy={y - 4} r={1} fill="#000" />
                <circle cx={x} cy={y - 1} r={1.5} fill="#000" />
              </>
            )}
          </g>
        );
      case 'cat':
        return (
          <g>
            <ellipse cx={x} cy={y + 3} rx={9} ry={7} fill={checked ? '#f97316' : '#fed7aa'} opacity={disabled && !checked ? 0.3 : 1} />
            <circle cx={x} cy={y - 3} r={5} fill={checked ? '#f97316' : '#fed7aa'} opacity={disabled && !checked ? 0.3 : 1} />
            <path d={`M ${x - 5} ${y - 8} L ${x - 3} ${y - 4}`} stroke={checked ? '#f97316' : '#fed7aa'} strokeWidth="3" strokeLinecap="round" opacity={disabled && !checked ? 0.3 : 1} />
            <path d={`M ${x + 5} ${y - 8} L ${x + 3} ${y - 4}`} stroke={checked ? '#f97316' : '#fed7aa'} strokeWidth="3" strokeLinecap="round" opacity={disabled && !checked ? 0.3 : 1} />
            {checked && (
              <>
                <circle cx={x - 2} cy={y - 4} r={0.8} fill="#000" />
                <circle cx={x + 2} cy={y - 4} r={0.8} fill="#000" />
                <line x1={x - 6} y1={y - 2} x2={x - 3} y2={y - 1} stroke="#000" strokeWidth="0.5" />
                <line x1={x + 6} y1={y - 2} x2={x + 3} y2={y - 1} stroke="#000" strokeWidth="0.5" />
              </>
            )}
          </g>
        );
      case 'butterfly':
        return (
          <g>
            <ellipse cx={x - 5} cy={y - 3} rx={6} ry={8} fill={checked ? '#a855f7' : '#e9d5ff'} opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x + 5} cy={y - 3} rx={6} ry={8} fill={checked ? '#a855f7' : '#e9d5ff'} opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x - 5} cy={y + 5} rx={5} ry={6} fill={checked ? '#d946ef' : '#f3e8ff'} opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x + 5} cy={y + 5} rx={5} ry={6} fill={checked ? '#d946ef' : '#f3e8ff'} opacity={disabled && !checked ? 0.3 : 1} />
            <line x1={x} y1={y - 8} x2={x} y2={y + 8} stroke="#000" strokeWidth="1.5" opacity={disabled && !checked ? 0.3 : 1} />
            {checked && (
              <>
                <circle cx={x} cy={y - 8} r={1.5} fill="#000" />
                <line x1={x - 2} y1={y - 10} x2={x - 4} y2={y - 12} stroke="#000" strokeWidth="1" />
                <line x1={x + 2} y1={y - 10} x2={x + 4} y2={y - 12} stroke="#000" strokeWidth="1" />
              </>
            )}
          </g>
        );
      case 'happy-flower':
        return (
          <g>
            {/* Stem */}
            <line 
              x1={x} 
              y1={y + 6} 
              x2={x} 
              y2={y + 12} 
              stroke={checked ? '#22c55e' : '#86efac'} 
              strokeWidth="2" 
              opacity={disabled && !checked ? 0.3 : 1}
            />
            {/* Heart-shaped petals */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const px = x + 7 * Math.cos(rad);
              const py = y + 7 * Math.sin(rad);
              return (
                <g key={i}>
                  <circle
                    cx={px - 2}
                    cy={py - 1}
                    r={3.5}
                    fill={checked ? '#fbbf24' : '#fef3c7'}
                    opacity={disabled && !checked ? 0.3 : 1}
                  />
                  <circle
                    cx={px + 2}
                    cy={py - 1}
                    r={3.5}
                    fill={checked ? '#fbbf24' : '#fef3c7'}
                    opacity={disabled && !checked ? 0.3 : 1}
                  />
                  <path
                    d={`M ${px - 5} ${py - 1} L ${px} ${py + 4} L ${px + 5} ${py - 1}`}
                    fill={checked ? '#fbbf24' : '#fef3c7'}
                    opacity={disabled && !checked ? 0.3 : 1}
                  />
                </g>
              );
            })}
            {/* Center */}
            <circle 
              cx={x} 
              cy={y} 
              r={5} 
              fill={checked ? '#f59e0b' : '#fcd34d'} 
              stroke={checked ? '#d97706' : '#fbbf24'}
              strokeWidth="1.5"
              opacity={disabled && !checked ? 0.3 : 1}
            />
            {/* Center dots */}
            {checked && (
              <>
                <circle cx={x - 1.5} cy={y - 1} r={0.8} fill="#d97706" />
                <circle cx={x + 1.5} cy={y - 1} r={0.8} fill="#d97706" />
                <circle cx={x} cy={y + 1.5} r={0.8} fill="#d97706" />
              </>
            )}
          </g>
        );
      case 'excited-flower':
        return (
          <g>
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <ellipse
                key={i}
                cx={x + 7 * Math.cos((angle * Math.PI) / 180)}
                cy={y + 7 * Math.sin((angle * Math.PI) / 180)}
                rx={4}
                ry={7}
                fill={checked ? '#f472b6' : '#fce7f3'}
                stroke={checked ? '#ec4899' : '#f9a8d4'}
                strokeWidth="1"
                transform={`rotate(${angle} ${x} ${y})`}
                opacity={disabled && !checked ? 0.3 : 1}
              />
            ))}
            <circle cx={x} cy={y} r={3} fill={checked ? '#ec4899' : '#f9a8d4'} />
          </g>
        );
      case 'rabbit':
        return (
          <g>
            {/* Body */}
            <ellipse cx={x} cy={y + 4} rx={9} ry={7} fill={checked ? '#f5f5f5' : '#fafafa'} stroke={checked ? '#d4d4d4' : '#e5e5e5'} strokeWidth="1" opacity={disabled && !checked ? 0.3 : 1} />
            {/* Head */}
            <circle cx={x} cy={y - 2} r={6} fill={checked ? '#f5f5f5' : '#fafafa'} stroke={checked ? '#d4d4d4' : '#e5e5e5'} strokeWidth="1" opacity={disabled && !checked ? 0.3 : 1} />
            {/* Left ear */}
            <ellipse cx={x - 3} cy={y - 8} rx={2} ry={6} fill={checked ? '#f5f5f5' : '#fafafa'} stroke={checked ? '#d4d4d4' : '#e5e5e5'} strokeWidth="1" opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x - 3} cy={y - 8} rx={1} ry={4} fill={checked ? '#ffc0cb' : '#ffe4e9'} opacity={disabled && !checked ? 0.3 : 0.7} />
            {/* Right ear */}
            <ellipse cx={x + 3} cy={y - 8} rx={2} ry={6} fill={checked ? '#f5f5f5' : '#fafafa'} stroke={checked ? '#d4d4d4' : '#e5e5e5'} strokeWidth="1" opacity={disabled && !checked ? 0.3 : 1} />
            <ellipse cx={x + 3} cy={y - 8} rx={1} ry={4} fill={checked ? '#ffc0cb' : '#ffe4e9'} opacity={disabled && !checked ? 0.3 : 0.7} />
            {/* Tail */}
            <circle cx={x + 8} cy={y + 6} r={2.5} fill={checked ? '#f5f5f5' : '#fafafa'} opacity={disabled && !checked ? 0.3 : 1} />
            {checked && (
              <>
                {/* Eyes */}
                <circle cx={x - 2} cy={y - 3} r={1} fill="#000" />
                <circle cx={x + 2} cy={y - 3} r={1} fill="#000" />
                {/* Nose */}
                <circle cx={x} cy={y} r={0.8} fill="#ffc0cb" />
                {/* Mouth */}
                <path d={`M ${x - 1.5} ${y + 1} Q ${x} ${y + 2} ${x + 1.5} ${y + 1}`} stroke="#000" strokeWidth="0.5" fill="none" />
              </>
            )}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <g>
      <motion.g
        onClick={disabled ? undefined : onClick}
        className={disabled ? 'cursor-default' : 'cursor-pointer'}
        whileHover={disabled ? {} : { scale: 1.15 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        {getDecorationSVG()}
      </motion.g>
      {checked && checkDate && (
        <title>{formatDate(checkDate)}</title>
      )}
    </g>
  );
}

export function MissionChallenge() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<7 | 10 | 14 | 30>(7);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'failed'>('active');

  // Load missions on mount
  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const data = await apiCall('/wave/missions');
      setMissions(data.missions || []);
    } catch (error) {
      console.error('Failed to load missions:', error);
    }
  };

  const createMission = async () => {
    if (!newMissionTitle.trim()) return;

    try {
      const data = await apiCall('/wave/missions', {
        method: 'POST',
        body: JSON.stringify({
          title: newMissionTitle.trim(),
          duration: selectedDuration
        })
      });

      setMissions(data.missions || []);
      setNewMissionTitle('');
      setShowCreateDialog(false);
    } catch (error: any) {
      console.error('Failed to create mission:', error);
      toast.error(`미션 생성에 실패했습니다: ${error.message}`);
    }
  };

  const checkMission = async (missionId: string) => {
    // Find the mission and check if already checked today
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const hasCheckedToday = mission.checks.some(check => check.startsWith(today));
    
    if (hasCheckedToday) {
      toast.warning('오늘은 이미 체크하셨어요! 내일 다시 도전해보세요 😊');
      return;
    }
    
    try {
      const data = await apiCall(`/wave/missions/${missionId}/check`, {
        method: 'POST'
      });

      setMissions(data.missions || []);
      
      // Update selectedMission if it's the same one
      if (selectedMission?.id === missionId) {
        const updatedMission = data.missions.find((m: Mission) => m.id === missionId);
        setSelectedMission(updatedMission || null);
      }
      
      // Check if mission is now completed
      const updatedMission = data.missions.find((m: Mission) => m.id === missionId);
      if (updatedMission?.completed && !mission.completed) {
        toast.success('🎉 미션 완료! 축하합니다!');
        // Log mission completion
        logUserAction('complete', 'mission', { missionId, title: mission.title, duration: mission.duration });
      }
    } catch (error: any) {
      console.error('Failed to check mission:', error);
      if (error.message.includes('Already checked today')) {
        toast.warning('오늘은 이미 체크하셨어요! 내일 다시 도전해보세요 😊');
      } else if (error.message.includes('failed') || error.message.includes('missed day')) {
        // Reload missions to get updated failed status
        loadMissions();
        toast.error('😢 하루를 건너뛰어서 미션이 실패했습니다. 새로운 미션을 시작해보세요!');
      } else {
        toast.error(`체크에 실패했습니다: ${error.message}`);
      }
    }
  };

  const deleteMission = async () => {
    if (!missionToDelete) return;

    try {
      const data = await apiCall(`/wave/missions/${missionToDelete}`, {
        method: 'DELETE'
      });

      setMissions(data.missions || []);
      setSelectedMission(null);
      setMissionToDelete(null);
      toast.success('미션을 삭제했습니다.');
    } catch (error: any) {
      console.error('Failed to delete mission:', error);
      toast.error(`미션 삭제에 실패했습니다: ${error.message}`);
      setMissionToDelete(null);
    }
  };

  const getDurationLabel = (duration: number) => {
    switch (duration) {
      case 7: return '7일 챌린지';
      case 10: return '10일 챌린지';
      case 14: return '2주 챌린지';
      case 30: return '한 달 챌린지';
      default: return `${duration}일 챌린지`;
    }
  };

  const getDurationIcon = (duration: number) => {
    switch (duration) {
      case 7: return '🍇';
      case 10: return '🎨';
      case 14: return '♊';
      case 30: return '🌳';
      default: return '🎯';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl">🎯 미션 챌린지</h2>
          <p className="text-sm text-gray-600 mt-1">
            매일 하나씩 스티커를 붙이며 목표를 달성해보세요!
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          미션 만들기
        </Button>
      </div>

      {/* Mission Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-1.5">
            <Circle className="w-4 h-4" />
            진행 중
            {missions.filter(m => !m.completed && !m.failed).length > 0 && (
              <span className="ml-1 text-xs">({missions.filter(m => !m.completed && !m.failed).length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            성공
            {missions.filter(m => m.completed).length > 0 && (
              <span className="ml-1 text-xs">({missions.filter(m => m.completed).length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5">
            <XCircle className="w-4 h-4" />
            실패
            {missions.filter(m => m.failed).length > 0 && (
              <span className="ml-1 text-xs">({missions.filter(m => m.failed).length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {missions.filter(m => !m.completed && !m.failed).length === 0 ? (
            <Card className="bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center">
                <Circle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">진행 중인 미션이 없어요</p>
                <p className="text-sm text-gray-500 mt-1">새로운 미션을 만들어보세요!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {missions.filter(m => !m.completed && !m.failed).map((mission) => (
                <MissionCard key={mission.id} mission={mission} onClick={() => setSelectedMission(mission)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {missions.filter(m => m.completed).length === 0 ? (
            <Card className="bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center">
                <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">완료한 ���션이 없어요</p>
                <p className="text-sm text-gray-500 mt-1">미션을 완료하고 트로피를 획득하세요!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {missions.filter(m => m.completed).map((mission) => (
                <MissionCard key={mission.id} mission={mission} onClick={() => setSelectedMission(mission)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="failed" className="mt-4">
          {missions.filter(m => m.failed).length === 0 ? (
            <Card className="bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center">
                <XCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">실패한 미션이 없어요</p>
                <p className="text-sm text-gray-500 mt-1">연속으로 체크를 놓치지 않도록 주의하세요!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {missions.filter(m => m.failed).map((mission) => (
                <MissionCard key={mission.id} mission={mission} onClick={() => setSelectedMission(mission)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Mission Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 미션 만들기</DialogTitle>
            <DialogDescription>
              달성하고 싶은 목표를 설정하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm mb-2 block">미션 이름</label>
              <Input
                value={newMissionTitle}
                onChange={(e) => setNewMissionTitle(e.target.value)}
                placeholder="예: 매일 운동하기, 물 2L 마시기"
                onKeyPress={(e) => e.key === 'Enter' && createMission()}
              />
            </div>

            <div>
              <label className="text-sm mb-2 block">챌린지 기간</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 7, label: '7일', icon: '🍇', desc: '포도송이' },
                  { value: 10, label: '10일', icon: '⭐', desc: '별자리' },
                  { value: 14, label: '2주', icon: '🌙', desc: '달의 변화' },
                  { value: 30, label: '한 달', icon: '🌳', desc: '나무 키우기' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDuration(option.value as any)}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      selectedDuration === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    <div className="text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={createMission}
              className="w-full"
              disabled={!newMissionTitle.trim()}
            >
              미션 만들기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mission Detail Dialog */}
      <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedMission && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{getDurationIcon(selectedMission.duration)}</span>
                  <span>{selectedMission.title}</span>
                  {selectedMission.completed && (
                    <Trophy className="w-5 h-5 text-yellow-500 ml-auto" />
                  )}
                </DialogTitle>
                <DialogDescription>
                  {getDurationLabel(selectedMission.duration)}
                  {selectedMission.completed && ' - 완료!'}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                <StickerBoard
                  mission={selectedMission}
                  onCheck={() => checkMission(selectedMission.id)}
                />
              </div>

              {selectedMission.completed ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
                  <p className="text-green-700">🎉 미션 완료! 정말 대단해요!</p>
                </div>
              ) : selectedMission.failed ? (
                <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 text-center">
                  <XCircle className="w-12 h-12 mx-auto text-red-500 mb-2" />
                  <p className="text-red-700">😢 미션 실패! 연속 체크를 놓쳤어요.</p>
                  <p className="text-sm text-red-600 mt-1">새로운 미션을 만들어 다시 도전해보세요!</p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 하루에 한 번만 체크할 수 있어요. 매일 꾸준히 도전해보세요!
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    ⚠️ 하루라도 건너뛰면 미션이 실패됩니다!
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedMission(null)}
                >
                  닫기
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setMissionToDelete(selectedMission.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!missionToDelete} onOpenChange={(open) => !open && setMissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>미션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 미션을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMission}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
