import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import './lib/makeUserSuperAdmin.js'; // Import for console access

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
    <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
