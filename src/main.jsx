import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { loadLanguage } from './i18n.js';

// The viewer's language file first (a few KB, English needs none), so the first frame is already translated.
loadLanguage().then(() => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`));
}
