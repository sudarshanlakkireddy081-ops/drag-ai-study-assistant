import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { register as registerServiceWorker } from './serviceWorkerRegistration';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for asset caching and offline document reading
registerServiceWorker();
