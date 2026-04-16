import { useState, createContext, useContext, useEffect } from 'react';

const lightTheme = {
  bg: '#F5F5F5',
  card: '#FFFFFF',
  cardBorder: '#E0E0E0',
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  text: '#000000',
  textDim: '#666666',
  success: '#4CAF50',
  warning: '#FFB347',
  peace: '#A8D5BA',
  inputBg: '#F0F0F0',
};

const darkTheme = {
  bg: '#0F0F1A',
  card: 'rgba(255,255,255,0.08)',
  cardBorder: 'rgba(255,255,255,0.15)',
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  text: '#FFFFFF',
  textDim: '#A0A0B0',
  success: '#4CAF50',
  warning: '#FFB347',
  peace: '#2D4A3E',
  inputBg: 'rgba(255,255,255,0.08)',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('feelIn_theme');
    return saved ? saved === 'dark' : true;
  });
  
  const theme = isDark ? darkTheme : lightTheme;
  
  useEffect(() => {
    localStorage.setItem('feelIn_theme', isDark ? 'dark' : 'light');
    console.log('🌓 Theme changed to:', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    console.log('🔘 Toggle clicked! Current:', isDark);
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);