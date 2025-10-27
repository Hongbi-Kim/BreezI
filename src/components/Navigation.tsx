import React from 'react';
import { MessageCircle, BookOpen, BarChart3, Users, Shield } from 'lucide-react';

type Page = 'chat' | 'diary' | 'report' | 'community' | 'calendar' | 'admin';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isAdmin?: boolean;
}

const navItems = [
  { key: 'chat' as const, label: '채팅', icon: MessageCircle },
  { key: 'diary' as const, label: '일기', icon: BookOpen },
  { key: 'report' as const, label: '리포트', icon: BarChart3 },
  { key: 'community' as const, label: '커뮤니티', icon: Users },
];

const adminNavItem = { key: 'admin' as const, label: '관리자', icon: Shield };

export function Navigation({ currentPage, onPageChange, isAdmin = false }: NavigationProps) {
  const items = isAdmin ? [...navItems, adminNavItem] : navItems;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-sky-100">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-around py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => onPageChange(item.key)}
                className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                  isActive
                    ? 'text-sky-600 bg-sky-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-sky-600' : 'text-gray-500'}`} />
                <span className={`text-xs ${isActive ? 'text-sky-600 font-medium' : 'text-gray-500'}`}>
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
