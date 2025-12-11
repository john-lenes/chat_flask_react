import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🚀 React index.js carregado');

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('❌ Elemento #root não encontrado no DOM');
    throw new Error('Root element not found');
  }
  
  console.log('✅ Elemento #root encontrado, criando React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('✅ React root criado, renderizando App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ App renderizado com sucesso');
} catch (error) {
  console.error('❌ Erro ao inicializar React:', error);
  
  // Mostrar erro na tela para debug
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #ef4444; color: white; font-family: monospace;">
        <h2>❌ Erro ao carregar aplicação</h2>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}
