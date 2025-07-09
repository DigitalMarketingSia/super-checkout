import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure theme is applied before React renders
const storedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.remove('light', 'dark');
document.documentElement.classList.add(storedTheme);

createRoot(document.getElementById("root")!).render(<App />);
