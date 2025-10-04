import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-8">
      <div className="max-w-md mx-auto px-4 text-center text-sm text-gray-600">
        <p>
          © {currentYear}{' '}
          <a 
            href="https://example.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 transition-colors"
          >
            BreezI
          </a>
          . All rights reserved.
        </p>
        <p className="text-xs text-gray-500 mt-1">Feel lighter, live deeper</p>
        <p className="text-xs text-gray-500 mt-1">AI와 함께하는 마음 건강 관리 서비스</p>
      </div>
    </footer>
  );
}