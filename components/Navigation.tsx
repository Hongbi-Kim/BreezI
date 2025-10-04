import React from 'react';
import { MessageCircle, BookOpen, BarChart3, Heart } from 'lucide-react';

type Page = 'chat' | 'diary' | 'report' | 'emotion-care';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const navItems = [
  { key: 'chat' as const, label: '채팅', icon: MessageCircle },
  { key: 'diary' as const, label: '일기', icon: BookOpen },
  { key: 'report' as const, label: '리포트', icon: BarChart3 },
  { key: 'emotion-care' as const, label: '감정관리', icon: Heart },
];

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-purple-100">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => onPageChange(item.key)}
                className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                  isActive
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
                <span className={`text-xs ${isActive ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}