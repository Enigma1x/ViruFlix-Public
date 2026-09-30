/**
 * Punto de entrada de la aplicación
 * 
 * Inicializa React y renderiza el componente raíz.
 * 
 * @module main
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initWebVitals } from './utils/webVitals.js';

initWebVitals();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

