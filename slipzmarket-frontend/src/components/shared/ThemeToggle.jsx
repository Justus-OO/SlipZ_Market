import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('site_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('site_theme', theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      title="Toggle theme"
      className="flex items-center justify-center w-9 h-9 rounded-md border border-transparent hover:border-theme transition-colors"
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};

export default ThemeToggle;
