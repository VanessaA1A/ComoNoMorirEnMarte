import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './estilos.css';
import { precargarZinnia } from './componentes/ZinniaAvatar.jsx';

// Las 6 expresiones de Zinn-IA se descargan y decodifican al iniciar: al cambiar de expresión no parpadea
precargarZinnia();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
