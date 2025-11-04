import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trash2, Pencil, Heart, Send, Sparkles, Lock, Unlock, Target, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiCall } from '../utils/api';
import { MissionChallenge } from './MissionChallenge';
import { EmotionGarden } from './EmotionGarden';
import { toast } from 'sonner';

// Animated Ocean Wave Background SVG Component
function OceanWaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ocean-gradient-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#1e3a8a', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.6 }} />
          </linearGradient>
          <linearGradient id="ocean-gradient-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#2563eb', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: '#60a5fa', stopOpacity: 0.7 }} />
          </linearGradient>
          <linearGradient id="ocean-gradient-3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: '#93c5fd', stopOpacity: 0.8 }} />
          </linearGradient>
        </defs>
        
        {/* Background gradient */}
        <rect x="0" y="0" width="1440" height="800" fill="url(#ocean-sky)" />
        <defs>
          <linearGradient id="ocean-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#dbeafe', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#bfdbfe', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Wave 1 - Back */}
        <motion.path
          d="M0,400 Q360,350 720,400 T1440,400 L1440,800 L0,800 Z"
          fill="url(#ocean-gradient-1)"
          initial={{ d: "M0,400 Q360,350 720,400 T1440,400 L1440,800 L0,800 Z" }}
          animate={{ 
            d: [
              "M0,400 Q360,350 720,400 T1440,400 L1440,800 L0,800 Z",
              "M0,380 Q360,430 720,380 T1440,380 L1440,800 L0,800 Z",
              "M0,400 Q360,350 720,400 T1440,400 L1440,800 L0,800 Z"
            ]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 8,
            ease: "easeInOut"
          }}
        />
        
        {/* Wave 2 - Middle */}
        <motion.path
          d="M0,450 Q360,420 720,450 T1440,450 L1440,800 L0,800 Z"
          fill="url(#ocean-gradient-2)"
          initial={{ d: "M0,450 Q360,420 720,450 T1440,450 L1440,800 L0,800 Z" }}
          animate={{ 
            d: [
              "M0,450 Q360,420 720,450 T1440,450 L1440,800 L0,800 Z",
              "M0,470 Q360,440 720,470 T1440,470 L1440,800 L0,800 Z",
              "M0,450 Q360,420 720,450 T1440,450 L1440,800 L0,800 Z"
            ]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 6,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        
        {/* Wave 3 - Front */}
        <motion.path
          d="M0,500 Q360,480 720,500 T1440,500 L1440,800 L0,800 Z"
          fill="url(#ocean-gradient-3)"
          initial={{ d: "M0,500 Q360,480 720,500 T1440,500 L1440,800 L0,800 Z" }}
          animate={{ 
            d: [
              "M0,500 Q360,480 720,500 T1440,500 L1440,800 L0,800 Z",
              "M0,520 Q360,500 720,520 T1440,520 L1440,800 L0,800 Z",
              "M0,500 Q360,480 720,500 T1440,500 L1440,800 L0,800 Z"
            ]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 10,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        {/* Foam effects */}
        <motion.circle
          cx="200"
          cy="480"
          r="3"
          fill="white"
          opacity="0.6"
          animate={{
            cx: [200, 250, 200],
            cy: [480, 470, 480],
            opacity: [0.6, 0.3, 0.6]
          }}
          transition={{ repeat: Infinity, duration: 4 }}
        />
        <motion.circle
          cx="600"
          cy="500"
          r="2"
          fill="white"
          opacity="0.5"
          animate={{
            cx: [600, 650, 600],
            cy: [500, 490, 500],
            opacity: [0.5, 0.2, 0.5]
          }}
          transition={{ repeat: Infinity, duration: 5, delay: 1 }}
        />
        <motion.circle
          cx="1000"
          cy="520"
          r="2.5"
          fill="white"
          opacity="0.7"
          animate={{
            cx: [1000, 1050, 1000],
            cy: [520, 510, 520],
            opacity: [0.7, 0.3, 0.7]
          }}
          transition={{ repeat: Infinity, duration: 6, delay: 2 }}
        />
      </svg>
    </div>
  );
}

// Message in Bottle SVG Component
function BottleSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Cork */}
      <rect x="42" y="15" width="16" height="8" rx="2" fill="#8B4513" />
      
      {/* Bottle neck */}
      <path d="M 45 23 L 45 30 Q 45 35 50 35 Q 55 35 55 30 L 55 23 Z" fill="#a0d8f1" opacity="0.7" />
      
      {/* Bottle body */}
      <path 
        d="M 35 35 Q 35 40 35 45 L 35 75 Q 35 80 40 80 L 60 80 Q 65 80 65 75 L 65 45 Q 65 40 65 35 Z" 
        fill="#b8e6f7" 
        opacity="0.6"
        stroke="#5fb3d6"
        strokeWidth="1.5"
      />
      
      {/* Glass shine */}
      <ellipse cx="42" cy="50" rx="3" ry="8" fill="white" opacity="0.5" />
      
      {/* Message paper inside */}
      <rect x="40" y="45" width="20" height="25" rx="1" fill="#fef3c7" opacity="0.9" />
      <line x1="43" y1="50" x2="57" y2="50" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
      <line x1="43" y1="54" x2="57" y2="54" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
      <line x1="43" y1="58" x2="55" y2="58" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
      <line x1="43" y1="62" x2="57" y2="62" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
      <line x1="43" y1="66" x2="53" y2="66" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

// Treasure Chest SVG Component
function TreasureChestSVG({ isOpen = false, className = '' }: { isOpen?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Chest base */}
      <rect x="25" y="50" width="50" height="35" rx="2" fill="#8B4513" stroke="#654321" strokeWidth="2" />
      
      {/* Chest lid */}
      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: isOpen ? -45 : 0 }}
        style={{ transformOrigin: '50px 50px' }}
        transition={{ duration: 0.3 }}
      >
        <path 
          d="M 25 50 Q 25 35 50 30 Q 75 35 75 50 Z" 
          fill="#A0522D" 
          stroke="#654321" 
          strokeWidth="2"
        />
        {/* Lock */}
        <rect x="47" y="45" width="6" height="8" rx="1" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
        <circle cx="50" cy="47" r="2" fill="#DAA520" />
      </motion.g>
      
      {/* Sparkles when open */}
      {isOpen && (
        <>
          <motion.path
            d="M 50 25 L 52 30 L 57 28 L 53 33 L 55 38 L 50 35 L 45 38 L 47 33 L 43 28 L 48 30 Z"
            fill="#FFD700"
            opacity="0.8"
            animate={{ 
              opacity: [0.8, 0.3, 0.8],
              scale: [1, 1.2, 1]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <motion.circle
            cx="65"
            cy="35"
            r="2"
            fill="#FFD700"
            animate={{ 
              opacity: [0.8, 0.2, 0.8],
              y: [0, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 1, delay: 0.3 }}
          />
          <motion.circle
            cx="35"
            cy="35"
            r="2"
            fill="#FFD700"
            animate={{ 
              opacity: [0.8, 0.2, 0.8],
              y: [0, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 1, delay: 0.6 }}
          />
        </>
      )}
      
      {/* Bands */}
      <rect x="25" y="60" width="50" height="3" fill="#654321" />
      <rect x="25" y="72" width="50" height="3" fill="#654321" />
    </svg>
  );
}

// Note Paper Component for messages
function NotePaper({ content, timestamp, isOpen, onClick, onDelete }: { content: string; timestamp: string; isOpen: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <motion.div
      className="relative cursor-pointer"
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
    >
      <svg viewBox="0 0 200 150" className="w-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
        {/* Paper base */}
        <rect 
          x="10" 
          y="10" 
          width="180" 
          height="130" 
          rx="3" 
          fill={isOpen ? "#fef3c7" : "#fef9e7"}
          stroke="#d4a574" 
          strokeWidth="1.5"
        />
        
        {/* Lined paper effect */}
        {!isOpen && (
          <>
            <line x1="20" y1="40" x2="180" y2="40" stroke="#f0e5d3" strokeWidth="0.5" />
            <line x1="20" y1="55" x2="180" y2="55" stroke="#f0e5d3" strokeWidth="0.5" />
            <line x1="20" y1="70" x2="180" y2="70" stroke="#f0e5d3" strokeWidth="0.5" />
            <line x1="20" y1="85" x2="180" y2="85" stroke="#f0e5d3" strokeWidth="0.5" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="#f0e5d3" strokeWidth="0.5" />
            <line x1="20" y1="115" x2="180" y2="115" stroke="#f0e5d3" strokeWidth="0.5" />
          </>
        )}
        
        {/* Folded corner */}
        <path 
          d="M 170 10 L 170 30 L 190 10 Z" 
          fill="#f5e6d3" 
          stroke="#d4a574" 
          strokeWidth="1"
        />
        
        {/* Tape at top */}
        <rect 
          x="85" 
          y="5" 
          width="30" 
          height="8" 
          rx="1" 
          fill="#e0e0e0" 
          opacity="0.7"
        />
      </svg>
      
      {/* Content overlay when closed */}
      {!isOpen && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-xs text-amber-700 mb-1">💌 쪽지를 열어보세요</p>
            <p className="text-xs text-gray-500">{new Date(timestamp).toLocaleDateString()}</p>
          </div>
        </div>
      )}
      
      {/* Content overlay when open */}
      {isOpen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="text-center flex-1 flex items-center justify-center">
            <div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                {content}
              </p>
              <p className="text-xs text-gray-400 mt-2">{timestamp}</p>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute bottom-2 right-2 p-2 rounded-full hover:bg-red-100 transition-colors text-red-500"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Happy Character Component
function HappyCharacter({ className = '' }: { className?: string }) {
  return (
    <motion.svg 
      viewBox="0 0 200 200" 
      className={className}
      animate={{ 
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body - cute round shape */}
      <ellipse cx="100" cy="120" rx="60" ry="50" fill="#FFD700" />
      
      {/* Head */}
      <circle cx="100" cy="70" r="45" fill="#FFA500" />
      
      {/* Happy eyes */}
      <motion.path
        d="M 80 65 Q 85 72 90 65"
        stroke="#000"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.path
        d="M 110 65 Q 115 72 120 65"
        stroke="#000"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.1 }}
      />
      
      {/* Big happy smile */}
      <path
        d="M 70 80 Q 100 95 130 80"
        stroke="#000"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks */}
      <circle cx="65" cy="75" r="8" fill="#FF69B4" opacity="0.5" />
      <circle cx="135" cy="75" r="8" fill="#FF69B4" opacity="0.5" />
      
      {/* Arms */}
      <motion.path
        d="M 50 110 Q 30 120 40 140"
        stroke="#FFA500"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        animate={{ rotate: [0, -15, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '50px 110px' }}
      />
      <motion.path
        d="M 150 110 Q 170 120 160 140"
        stroke="#FFA500"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        animate={{ rotate: [0, 15, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '150px 110px' }}
      />
      
      {/* Sparkles around */}
      <motion.circle
        cx="160"
        cy="50"
        r="3"
        fill="#FFD700"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="40"
        cy="60"
        r="3"
        fill="#FFD700"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
    </motion.svg>
  );
}

// Canvas Drawing Component
function DrawingCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 400;
      
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const colors = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={clearCanvas}>
            지우기
          </Button>
          <Button size="sm" onClick={saveDrawing}>
            저장
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm">굵기:</span>
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm w-8">{lineWidth}</span>
      </div>

      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}

interface BottledEmotion {
  id: string;
  content: string;
  timestamp: string;
}

interface Drawing {
  id: string;
  dataUrl: string;
  timestamp: string;
}

interface PositiveMessage {
  id: string;
  content: string;
  timestamp: string;
}

const MISSIONS = [
  {
    id: 'breath',
    title: '심호흡 5회',
    description: '함께 깊게 숨을 들이마시고 천천히 내쉬어봐요',
    duration: 4000, // 4 seconds per breath
    totalCount: 5
  },
  {
    id: 'smile',
    title: '미소 짓기 5초',
    description: '행복한 친구와 함께 미소 지어봐요 😊',
    duration: 5000, // 5 seconds total
    totalCount: 1
  }
];

export function WaveTab() {
  const [activeFeature, setActiveFeature] = useState<'garden' | 'bottle' | 'draw' | 'positive' | 'mission'>('garden');
  
  // Emotion Bottle states
  const [emotionInput, setEmotionInput] = useState('');
  const [bottledEmotions, setBottledEmotions] = useState<BottledEmotion[]>([]);
  const [showBottleAnimation, setShowBottleAnimation] = useState(false);
  const [showTreasureChest, setShowTreasureChest] = useState(false);
  const [chestUnlocked, setChestUnlocked] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [missionProgress, setMissionProgress] = useState(0);
  const [isDoingMission, setIsDoingMission] = useState(false);
  const [currentMission, setCurrentMission] = useState(MISSIONS[0]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  
  // Drawing states
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  
  // Positive messages states
  const [positiveInput, setPositiveInput] = useState('');
  const [positiveMessages, setPositiveMessages] = useState<PositiveMessage[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // Delete confirmation states
  const [drawingToDelete, setDrawingToDelete] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiCall('/wave');
      setBottledEmotions(data.bottledEmotions || []);
      setDrawings(data.drawings || []);
      setPositiveMessages(data.positiveMessages || []);
    } catch (error) {
      console.error('Failed to load wave data:', error);
    }
  };

  const sendBottle = async () => {
    if (!emotionInput.trim()) return;

    setShowBottleAnimation(true);
    
    try {
      const data = await apiCall('/wave/bottle', {
        method: 'POST',
        body: JSON.stringify({ content: emotionInput.trim() })
      });
      
      setTimeout(() => {
        setBottledEmotions(data.bottledEmotions || []);
        setEmotionInput('');
        setShowBottleAnimation(false);
      }, 6000);
    } catch (error: any) {
      console.error('Failed to send bottle:', error);
      toast.error(`병을 보내는데 실패했습니다: ${error.message}`);
      setShowBottleAnimation(false);
    }
  };

  const startMission = () => {
    // Select random mission
    const randomMission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
    setCurrentMission(randomMission);
    setMissionProgress(0);
    setIsDoingMission(true);
    setMissionCompleted(false);
    
    // Auto complete mission based on type
    if (randomMission.id === 'breath') {
      // Breath mission - 5 breaths with animation
      let count = 0;
      const breathInterval = setInterval(() => {
        count++;
        setMissionProgress(count);
        
        if (count >= randomMission.totalCount) {
          clearInterval(breathInterval);
          setTimeout(() => {
            setIsDoingMission(false);
            setMissionCompleted(true);
            setChestUnlocked(true);
          }, randomMission.duration);
        }
      }, randomMission.duration);
    } else if (randomMission.id === 'smile') {
      // Smile mission - 5 seconds countdown
      setTimeout(() => {
        setIsDoingMission(false);
        setMissionCompleted(true);
        setChestUnlocked(true);
      }, randomMission.duration);
    }
  };

  const saveDrawing = async (dataUrl: string) => {
    try {
      const data = await apiCall('/wave/drawing', {
        method: 'POST',
        body: JSON.stringify({ dataUrl })
      });
      
      setDrawings(data.drawings || []);
      toast.success('낙서를 저장했습니다!');
    } catch (error: any) {
      console.error('Failed to save drawing:', error);
      toast.error(`낙서 저장에 실패했습니다: ${error.message}`);
    }
  };

  const deleteDrawing = async () => {
    if (!drawingToDelete) return;
    
    try {
      const data = await apiCall(`/wave/drawing/${drawingToDelete}`, { method: 'DELETE' });
      setDrawings(data.drawings || []);
      setSelectedDrawing(null);
      setDrawingToDelete(null);
      toast.success('낙서를 삭제했습니다.');
    } catch (error: any) {
      console.error('Failed to delete drawing:', error);
      toast.error(`낙서 삭제에 실패했습니다: ${error.message}`);
      setDrawingToDelete(null);
    }
  };

  const addPositiveMessage = async () => {
    if (!positiveInput.trim()) return;

    try {
      const data = await apiCall('/wave/positive', {
        method: 'POST',
        body: JSON.stringify({ content: positiveInput.trim() })
      });
      
      setPositiveMessages(data.positiveMessages || []);
      setPositiveInput('');
    } catch (error: any) {
      console.error('Failed to add positive message:', error);
      toast.error(`긍정 메시지 추가에 실패했습니다: ${error.message}`);
    }
  };

  const deleteBottle = async (id: string) => {
    try {
      const data = await apiCall(`/wave/bottle/${id}`, { method: 'DELETE' });
      setBottledEmotions(data.bottledEmotions || []);
      setSelectedMessageIndex(null);
      toast.success('쪽지를 삭제했습니다.');
    } catch (error: any) {
      console.error('Failed to delete bottle:', error);
      toast.error(`쪽지 삭제에 실패했습니다: ${error.message}`);
    }
  };

  const deletePositiveMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      const data = await apiCall(`/wave/positive/${messageToDelete}`, { method: 'DELETE' });
      const newMessages = data.positiveMessages || [];
      setPositiveMessages(newMessages);
      
      // Reset index if it's out of bounds
      if (currentMessageIndex >= newMessages.length && newMessages.length > 0) {
        setCurrentMessageIndex(newMessages.length - 1);
      } else if (newMessages.length === 0) {
        setCurrentMessageIndex(0);
      }
      
      setMessageToDelete(null);
      toast.success('긍정 메시지를 삭제했습니다.');
    } catch (error: any) {
      console.error('Failed to delete positive message:', error);
      toast.error(`긍정 메시지 삭제에 실패했습니다: ${error.message}`);
      setMessageToDelete(null);
    }
  };

  const nextMessage = () => {
    if (positiveMessages.length > 0) {
      setCurrentMessageIndex((prev) => (prev + 1) % positiveMessages.length);
    }
  };

  const prevMessage = () => {
    if (positiveMessages.length > 0) {
      setCurrentMessageIndex((prev) => (prev - 1 + positiveMessages.length) % positiveMessages.length);
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Ocean Background */}
      <OceanWaves />

      {/* Content */}
      <div className="relative z-10 h-full overflow-y-auto p-3 sm:p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl mb-2 text-blue-900">🌊 Wave</h1>
            <p className="text-sm sm:text-base text-blue-700">내 마음의 파도를 타며 치유하기</p>
          </div>

          {/* Feature Selection */}
          <Tabs value={activeFeature} onValueChange={(v) => setActiveFeature(v as any)} className="mb-6">
            <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur">
              <TabsTrigger value="garden" className="gap-1 sm:gap-2">
                <Sprout className="w-4 h-4" />
                <span className="hidden sm:inline">정원</span>
              </TabsTrigger>
              <TabsTrigger value="bottle" className="gap-1 sm:gap-2">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">쓰레기통</span>
              </TabsTrigger>
              <TabsTrigger value="draw" className="gap-1 sm:gap-2">
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">낙서</span>
              </TabsTrigger>
              <TabsTrigger value="positive" className="gap-1 sm:gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">긍정</span>
              </TabsTrigger>
              <TabsTrigger value="mission" className="gap-1 sm:gap-2">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">미션</span>
              </TabsTrigger>
            </TabsList>

            {/* Emotion Garden Feature */}
            <TabsContent value="garden" className="space-y-4 mt-6">
              <EmotionGarden />
            </TabsContent>

            {/* Emotion Bottle Feature */}
            <TabsContent value="bottle" className="space-y-4 mt-6">
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    감정 쓰레기통
                  </CardTitle>
                  <CardDescription>
                    버리고 싶은 감정을 적고 파도에 날려보내세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative min-h-[200px]">
                    <AnimatePresence mode="wait">
                      {!showBottleAnimation ? (
                        <motion.div
                          key="input-form"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <div className="text-center py-4">
                            <BottleSVG className="w-20 h-20 mx-auto" />
                          </div>

                          <Textarea
                            value={emotionInput}
                            onChange={(e) => setEmotionInput(e.target.value)}
                            placeholder="버리고 싶은 감정, 생각, 걱정을 적어주세요..."
                            className="min-h-[120px]"
                          />

                          <Button
                            onClick={sendBottle}
                            className="w-full gap-2"
                            disabled={!emotionInput.trim()}
                          >
                            <Send className="w-4 h-4" />
                            파도에 날려보내기
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="bottle-animation"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="relative text-center py-16 overflow-hidden min-h-[300px]"
                        >
                          {/* Bottle flying away */}
                          <motion.div
                            className="relative z-10"
                            initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
                            animate={{ 
                              x: [0, 30, 100, 250, 400],
                              y: [0, -15, -60, -150, -250],
                              scale: [1, 1.05, 0.9, 0.5, 0.2],
                              rotate: [0, 10, 30, 60, 90]
                            }}
                            transition={{ duration: 5, ease: "easeOut" }}
                          >
                            <BottleSVG className="w-20 h-20 mx-auto" />
                          </motion.div>

                          {/* Water droplets */}
                          {[...Array(16)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute left-1/2 top-1/2"
                              initial={{ 
                                x: 0, 
                                y: 0, 
                                scale: 0,
                                opacity: 0 
                              }}
                              animate={{ 
                                x: Math.cos((i / 16) * Math.PI * 2) * (100 + i * 8),
                                y: Math.sin((i / 16) * Math.PI * 2) * (100 + i * 8) - 40 + Math.random() * 30,
                                scale: [0, 1.2, 0.8, 0],
                                opacity: [0, 0.7, 0.5, 0]
                              }}
                              transition={{ 
                                duration: 2.5,
                                delay: 0.5 + i * 0.05,
                                ease: "easeOut"
                              }}
                            >
                              <svg width="12" height="14" viewBox="0 0 12 14" className="drop-shadow-md">
                                <path
                                  d="M 6 0 Q 8 4 10 7 Q 10 11 6 14 Q 2 11 2 7 Q 4 4 6 0 Z"
                                  fill={i % 3 === 0 ? "#60a5fa" : i % 3 === 1 ? "#3b82f6" : "#93c5fd"}
                                  opacity="0.8"
                                />
                              </svg>
                            </motion.div>
                          ))}

                          {/* Bubble particles */}
                          {[...Array(10)].map((_, i) => (
                            <motion.div
                              key={`bubble-${i}`}
                              className="absolute"
                              style={{
                                left: `${20 + (i * 7)}%`,
                                top: `${30 + (i % 5) * 10}%`
                              }}
                              initial={{ opacity: 0, scale: 0, y: 0 }}
                              animate={{ 
                                opacity: [0, 0.6, 0.4, 0],
                                scale: [0, 1, 1.3, 0],
                                y: [0, -20, -40, -60]
                              }}
                              transition={{ 
                                duration: 2,
                                delay: 1 + i * 0.15,
                                ease: "easeOut"
                              }}
                            >
                              <div className="w-3 h-3 rounded-full border-2 border-blue-300 bg-blue-100/30" />
                            </motion.div>
                          ))}

                          {/* Wave burst - multiple ripples */}
                          <motion.div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ 
                              scale: [0, 2.5, 4.5],
                              opacity: [0, 0.5, 0]
                            }}
                            transition={{ duration: 3, ease: "easeOut" }}
                          >
                            <div className="w-32 h-32 border-4 border-blue-400 rounded-full" />
                          </motion.div>

                          <motion.div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ 
                              scale: [0, 2, 3.5],
                              opacity: [0, 0.4, 0]
                            }}
                            transition={{ duration: 3, delay: 0.3, ease: "easeOut" }}
                          >
                            <div className="w-32 h-32 border-4 border-cyan-400 rounded-full" />
                          </motion.div>

                          <motion.div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ 
                              scale: [0, 1.5, 3],
                              opacity: [0, 0.3, 0]
                            }}
                            transition={{ duration: 3, delay: 0.6, ease: "easeOut" }}
                          >
                            <div className="w-32 h-32 border-4 border-blue-300 rounded-full" />
                          </motion.div>

                          {/* Messages */}
                          <motion.p 
                            className="mt-4 text-lg text-blue-600"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: [0, 1, 1, 1, 0], y: [20, 0, 0, 0, -10] }}
                            transition={{ duration: 5, times: [0, 0.2, 0.5, 0.8, 1] }}
                          >
                            🌊 파도가 가져가고 있어요...
                          </motion.p>

                          <motion.p 
                            className="mt-2 text-base text-blue-500"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 1, 1, 1] }}
                            transition={{ duration: 5, times: [0, 0.4, 0.6, 0.9, 1] }}
                          >
                            💙 후련하시죠? 모든 게 괜찮아질 거예요
                          </motion.p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm">
                        보낸 병: {bottledEmotions.length}개
                      </p>
                      {bottledEmotions.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTreasureChest(true)}
                          className="gap-2"
                        >
                          {missionCompleted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          보물 상자 열기
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      * 보낸 감정은 보물 상자에 보관됩니다. 미션을 완료하면 다시 꺼내볼 수 있어요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Drawing Feature */}
            <TabsContent value="draw" className="space-y-4 mt-6">
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pencil className="w-5 h-5" />
                    자유 낙서장
                  </CardTitle>
                  <CardDescription>
                    힘든 감정을 낙서로 표현해보세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DrawingCanvas onSave={saveDrawing} />
                </CardContent>
              </Card>

              {drawings.length > 0 && (
                <Card className="bg-white/90 backdrop-blur">
                  <CardHeader>
                    <CardTitle>저장된 낙서</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {drawings.map((drawing) => (
                        <div
                          key={drawing.id}
                          className="relative group cursor-pointer"
                          onClick={() => setSelectedDrawing(drawing)}
                        >
                          <img
                            src={drawing.dataUrl}
                            alt="낙서"
                            className="w-full aspect-square object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawingToDelete(drawing.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Positive Messages Feature */}
            <TabsContent value="positive" className="space-y-4 mt-6">
              <Card className="bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    긍정의 메시지
                  </CardTitle>
                  <CardDescription>
                    마음에 드는 문장을 저장하고 자주 되새겨보세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={positiveInput}
                      onChange={(e) => setPositiveInput(e.target.value)}
                      placeholder="긍정적인 문장이나 단어를 적어주세요"
                      onKeyPress={(e) => e.key === 'Enter' && addPositiveMessage()}
                    />
                    <Button onClick={addPositiveMessage} disabled={!positiveInput.trim()}>
                      추가
                    </Button>
                  </div>

                  {positiveMessages.length > 0 && positiveMessages[currentMessageIndex] && (
                    <div className="mt-6">
                      <div className="relative bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentMessageIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                          >
                            <Sparkles className="w-8 h-8 mx-auto mb-4 text-purple-600" />
                            <p className="text-lg sm:text-xl text-gray-800 mb-2">
                              "{positiveMessages[currentMessageIndex]?.content || ''}"
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-4 text-red-500 hover:text-red-700"
                              onClick={() => {
                                if (positiveMessages[currentMessageIndex]) {
                                  setMessageToDelete(positiveMessages[currentMessageIndex].id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        </AnimatePresence>

                        {positiveMessages.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2"
                              onClick={prevMessage}
                            >
                              ←
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                              onClick={nextMessage}
                            >
                              →
                            </Button>
                          </>
                        )}
                      </div>

                      <div className="text-center mt-2 text-sm text-gray-600">
                        {currentMessageIndex + 1} / {positiveMessages.length}
                      </div>
                    </div>
                  )}

                  {positiveMessages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>아직 저장된 메시지가 없어요</p>
                      <p className="text-sm mt-1">좋아하는 문장을 추가해보세요!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mission Challenge Feature */}
            <TabsContent value="mission" className="mt-6">
              <MissionChallenge />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Treasure Chest Dialog */}
      <Dialog open={showTreasureChest} onOpenChange={(open) => {
        setShowTreasureChest(open);
        if (!open) {
          // Reset mission when dialog closes
          setMissionCompleted(false);
          setIsDoingMission(false);
          setMissionProgress(0);
          setChestUnlocked(false);
          setSelectedMessageIndex(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">보물 상자</DialogTitle>
            <DialogDescription className="text-center">
              {missionCompleted ? '상자가 열렸어요!' : '미션을 완료하면 열 수 있어요'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <TreasureChestSVG isOpen={chestUnlocked} className="w-32 h-32 mx-auto" />
          </div>

          {!missionCompleted && !isDoingMission && (
            <div className="space-y-4">
              <p className="text-center text-sm">
                🎯 미션을 완료하고 상자를 열어보세요
              </p>
              <Button onClick={startMission} className="w-full">
                미션 시작하기
              </Button>
            </div>
          )}

          {isDoingMission && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg mb-2">{currentMission.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{currentMission.description}</p>
                
                {currentMission.id === 'breath' && (
                  <div className="py-4">
                    <motion.div
                      className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 shadow-lg"
                      animate={{
                        scale: [1, 1.8, 1],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.p 
                      className="text-lg"
                      animate={{
                        opacity: [1, 0.5, 1]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity
                      }}
                    >
                      {missionProgress < currentMission.totalCount ? '들이쉬고... 내쉬고...' : '마지막 호흡...'}
                    </motion.p>
                    <p className="text-2xl mt-2">
                      {missionProgress} / {currentMission.totalCount}
                    </p>
                  </div>
                )}
                
                {currentMission.id === 'smile' && (
                  <div className="py-4">
                    <HappyCharacter className="w-48 h-48 mx-auto mb-4" />
                    <motion.p 
                      className="text-xl text-pink-600"
                      animate={{
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity
                      }}
                    >
                      함께 웃어봐요! 😊
                    </motion.p>
                  </div>
                )}
              </div>
            </div>
          )}

          {missionCompleted && (
            <div className="space-y-4">
              <p className="text-center text-green-600 mb-3">✨ 미션 완료! 보물 쪽지를 확인하세요</p>
              {bottledEmotions.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">아직 보낸 병이 없어요</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                  {bottledEmotions.map((emotion, index) => (
                    <div key={emotion.id} className="aspect-[4/3]">
                      <NotePaper
                        content={emotion.content}
                        timestamp={emotion.timestamp}
                        isOpen={selectedMessageIndex === index}
                        onClick={() => setSelectedMessageIndex(selectedMessageIndex === index ? null : index)}
                        onDelete={() => deleteBottle(emotion.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Drawing Detail Dialog */}
      <Dialog open={!!selectedDrawing} onOpenChange={() => setSelectedDrawing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>낙서 상세보기</DialogTitle>
            <DialogDescription>
              {selectedDrawing?.timestamp}
            </DialogDescription>
          </DialogHeader>
          {selectedDrawing && (
            <div>
              <img
                src={selectedDrawing.dataUrl}
                alt="낙서"
                className="w-full rounded-lg border-2 border-gray-200"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Drawing Confirmation Dialog */}
      <AlertDialog open={!!drawingToDelete} onOpenChange={(open) => !open && setDrawingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>낙서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 낙서를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDrawing}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Positive Message Confirmation Dialog */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>긍정 메시지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 긍정 메시지를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={deletePositiveMessage}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
