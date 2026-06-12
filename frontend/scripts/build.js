// Build script: replaces %%API_URL%% placeholder with real API URL
const fs = require('fs');
const path = require('path');

const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:5000';
const publicDir = path.join(__dirname, '../public');

const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/%%API_URL%%/g, API_URL);
  fs.writeFileSync(filePath, content);
  console.log(`✅ Built: ${file} (API: ${API_URL})`);
});

console.log('🎉 Build complete!');
