const fs = require('fs');
const path = require('path');

const files = [
  'ui/src/components/Hero.tsx',
  'ui/src/components/ProductShowcase.tsx',
  'ui/src/components/Reviews.tsx',
  'ui/src/components/FAQ.tsx',
  'ui/src/components/Warranty.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replacements
  content = content
    .replace(/shadow-\[0_0_[0-9]+px_rgba\([^)]+\)\]/g, 'shadow-lg')
    .replace(/ring-1 ring-cyan-500\/50/g, '')
    .replace(/border-cyan-500\/50/g, 'border-gray-800')
    .replace(/skew-x-\[-10deg\]/g, '')
    .replace(/skew-x-\[10deg\]/g, '')
    .replace(/bg-black\/40 backdrop-blur-md/g, 'bg-gray-900')
    .replace(/bg-black\/40 backdrop-blur-xl/g, 'bg-gray-900')
    .replace(/text-transparent bg-clip-text bg-gradient-to-b from-white to-white\/60 hover:from-cyan-300 hover:to-cyan-500/g, 'text-white hover:text-cyan-400')
    .replace(/text-transparent bg-clip-text bg-gradient-to-b from-white to-white\/60/g, 'text-white')
    .replace(/text-gradient-neon/g, 'text-cyan-400')
    .replace(/text-gradient-cyber/g, 'text-cyan-400')
    .replace(/className="\s+/g, 'className="')
    .replace(/\s+"/g, '"');

  // Some components might have broken `<div className=" ">` after this, but react handles extra spaces fine.
  // Actually, fixing multiple spaces inside className is good
  content = content.replace(/className="([^"]+)"/g, (match, classes) => {
    return `className="${classes.replace(/\s+/g, ' ').trim()}"`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
