import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hidden">
      <div className="max-w-3xl mx-auto px-4 text-center text-sm text-gray-600">
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
        <p className="text-xs text-gray-500 mt-1">
          AI와 함께하는 마음 건강 관리 서비스
        </p>
      </div>
    </footer>
  );
}