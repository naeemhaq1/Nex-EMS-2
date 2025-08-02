import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Remove loader immediately when React mounts
console.log('FORCE REMOVING LOADER');
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.remove();
}
console.log('React mounted, hiding loader immediately');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)