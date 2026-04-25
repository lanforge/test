const fs = require('fs');
const glob = require('glob');

const files = glob.sync('ui/src/pages/Admin*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix card classes (handling both "card " and "card" at end of string or before quote)
  content = content.replace(/className="([^"]*)\bcard\b([^"]*)"/g, 'className="$1admin-card$2"');
  
  // Apply minimalist text/bg/border if any are lingering
  content = content.replace(/bg-gray-900\/50/g, 'bg-[#0a0c13]');   
  content = content.replace(/bg-gray-900\/70/g, 'bg-[#0a0c13]');
  content = content.replace(/bg-gray-800\/50/g, 'bg-[#11141d]');    
  content = content.replace(/bg-gray-800\/30/g, 'bg-[#1f2233]/30');  
  content = content.replace(/bg-gray-800/g, 'bg-[#11141d]');        
  content = content.replace(/bg-gray-900/g, 'bg-[#0a0c13]');        
  content = content.replace(/bg-white\/5/g, 'bg-[#1f2233]/50');
  content = content.replace(/hover:bg-white\/10/g, 'hover:bg-[#1f2233]');
  content = content.replace(/hover:bg-white\/\[0\.02\]/g, 'hover:bg-[#1f2233]/50');
  content = content.replace(/hover:bg-gray-800\/30/g, 'hover:bg-[#1f2233]/50');
  content = content.replace(/hover:bg-gray-800/g, 'hover:bg-[#1f2233]'); 
  content = content.replace(/hover:bg-gray-700/g, 'hover:bg-[#1f2233]'); 
  content = content.replace(/bg-gray-700\/50/g, 'bg-[#1f2233]/50');
  
  content = content.replace(/border-white\/5/g, 'border-[#1f2233]');
  content = content.replace(/border-white\/10/g, 'border-[#1f2233]');
  content = content.replace(/border-gray-800/g, 'border-[#1f2233]');
  content = content.replace(/border-gray-700/g, 'border-[#1f2233]');

  content = content.replace(/text-gray-100/g, 'text-slate-100');
  content = content.replace(/text-gray-200/g, 'text-slate-200');
  content = content.replace(/text-gray-300/g, 'text-slate-300');
  content = content.replace(/text-gray-400/g, 'text-slate-400');
  content = content.replace(/text-gray-500/g, 'text-slate-500');
  content = content.replace(/text-gray-600/g, 'text-slate-600');
  
  content = content.replace(/text-2xl font-bold text-white/g, 'text-xl font-medium text-white');
  content = content.replace(/text-lg font-bold text-white/g, 'text-lg font-medium text-white');
  content = content.replace(/text-gray-400 mt-1/g, 'text-slate-400 text-sm mt-1');
  
  content = content.replace(/className="input /g, 'className="admin-input ');
  content = content.replace(/className="input"/g, 'className="admin-input"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
