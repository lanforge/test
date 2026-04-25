const fs = require('fs');
const glob = require('glob');

const files = glob.sync('ui/src/pages/Admin*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix repeated admin-cards
  content = content.replace(/admin-(admin-)+card/g, 'admin-card');
  content = content.replace(/admin-admin-card/g, 'admin-card');
  
  // AdminDashboardPage uses hardcoded classes, let's fix them to admin-card
  content = content.replace(/bg-\[#11141d\] rounded-md p-5 border border-\[#1f2233\]/g, 'admin-card p-5');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed cards in ' + file);
  }
});
