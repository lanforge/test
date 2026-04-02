const fs = require('fs');
const path = require('path');

const emojiMap = {
  '🎮': '{faGamepad}',
  '🧠': '{faMemory}',
  '🔌': '{faPlug}',
  '��': '{faHardDrive}',
  '🔋': '{faBatteryFull}',
  '📦': '{faBox}',
  '❄️': '{faFan}',
  '🪟': '{faWindowMaximize}',
  '🎉': '{faCheck}',
  '★': '{faStar}',
  '🖱️': '{faComputerMouse}',
  '🖥️': '{faDesktop}',
  '🎧': '{faHeadphones}',
  '💻': '{faLaptop}',
  '⚡': '{faBolt}',
  '🛡️': '{faShieldHalved}',
  '🏆': '{faTrophy}',
  '🐦': '{faTwitter}',
  '📺': '{faYoutube}',
  '📸': '{faInstagram}',
  '🛠️': '{faScrewdriverWrench}',
  '✓': '{faCheck}',
  '🔒': '{faLock}',
  '📐': '{faRulerCombined}',
  '💨': '{faWind}',
  '📧': '{faEnvelope}',
  '��': '{faMessage}',
  '🛒': '{faCartShopping}',
  '⚙️': '{faGear}',
  '🚚': '{faTruckFast}',
  '✅': '{faCheckCircle}',
  '🔧': '{faWrench}',
  '📊': '{faChartBar}',
  '🏠': '{faHouse}',
  '❌': '{faXmark}',
  '📅': '{faCalendar}',
  '❤️': '{faHeart}',
  '📱': '{faMobileScreen}',
  '📞': '{faPhone}',
  '🤝': '{faHandshake}',
  '📰': '{faNewspaper}',
  '🚧': '{faPersonDigging}',
  '👍': '{faThumbsUp}'
};

const brandIcons = ['faTwitter', 'faDiscord', 'faYoutube', 'faInstagram'];

const files = [
  'pages/AdminAddPartPage.tsx',
  'pages/AdminAddProductPage.tsx',
  'pages/AdminCartsPage.tsx',
  'pages/CheckoutPage.tsx',
  'pages/ConfiguratorPage.tsx',
  'pages/ContactPage.tsx',
  'pages/DignitasPage.tsx',
  'pages/FAQPage.tsx',
  'pages/OrderStatusPage.tsx',
  'pages/PCServicesPage.tsx',
  'pages/PCsPage.tsx',
  'pages/PartnersPage.tsx',
  'pages/PlaceholderPage.tsx',
  'pages/ProductsPage.tsx',
  'pages/TechSupportPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let iconsToImport = new Set();
  
  // Custom logic for strings vs JSX nodes
  // Just generic string replacement for now, we'll manually wrap in <FontAwesomeIcon />
  // Actually, we can replace the text node directly with <FontAwesomeIcon icon={faName} />
  
  for (const [emoji, iconVar] of Object.entries(emojiMap)) {
    if (content.includes(emoji)) {
      iconsToImport.add(iconVar.slice(1, -1)); // remove {}
      // Replace literal emojis
      // If it's inside quotes, e.g. '★' it might break string variables.
      // But we can just wrap it. For things like "text-3xl font-bold text-gradient-neon mb-2">4.7★</div>
      // We can use a regex to replace the emoji with <FontAwesomeIcon icon={...} />
      // And we have to fix JSX vs string manually or carefully.
    }
  }
  
  if (iconsToImport.size > 0) {
    const importSolid = Array.from(iconsToImport).filter(i => !brandIcons.includes(i)).join(', ');
    const importBrands = Array.from(iconsToImport).filter(i => brandIcons.includes(i)).join(', ');
    
    let importStatements = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';\n`;
    if (importSolid) importStatements += `import { ${importSolid} } from '@fortawesome/free-solid-svg-icons';\n`;
    if (importBrands) importStatements += `import { ${importBrands} } from '@fortawesome/free-brands-svg-icons';\n`;

    if (!content.includes('@fortawesome/react-fontawesome')) {
       // Insert at top after react imports
       content = content.replace(/(import React.*?;\n)/, `$1${importStatements}`);
    }

    // specific replacement regex
    for (const [emoji, iconVar] of Object.entries(emojiMap)) {
        if (content.includes(emoji)) {
            // Replace simple literal inside jsx: <div>📦</div> -> <div><FontAwesomeIcon icon={faBox} /></div>
            const re = new RegExp(emoji, 'g');
            content = content.replace(re, `<FontAwesomeIcon icon=${iconVar} />`);
        }
    }
    
    // We will have to clean up syntax like:
    // '★' -> '<FontAwesomeIcon icon={faStar} />' (which becomes a string instead of JSX if in quotes)
    content = content.replace(/'<FontAwesomeIcon icon=\{fa([a-zA-Z]+)\} \/>'/g, "<FontAwesomeIcon icon={fa$1} />");
    content = content.replace(/"<FontAwesomeIcon icon=\{fa([a-zA-Z]+)\} \/>"/g, "<FontAwesomeIcon icon={fa$1} />");
    content = content.replace(/`<FontAwesomeIcon icon=\{fa([a-zA-Z]+)\} \/>`/g, "<FontAwesomeIcon icon={fa$1} />");

    fs.writeFileSync(file, content);
  }
});
