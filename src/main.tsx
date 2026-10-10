import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installViewport } from './services/viewport';

const removeViewportListeners = installViewport();
import.meta.hot?.dispose(removeViewportListeners);
createRoot(document.getElementById('root')!).render(<App />);
