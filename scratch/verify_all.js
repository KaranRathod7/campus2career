const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('1. Stream filter pills removed:', !html.includes('id="resStreamBtn-'));
console.log('2. resActiveStreamPill present:', html.includes('id="resActiveStreamPill"'));
console.log('3. playMarathonVideo defined:', html.includes('function playMarathonVideo('));
console.log('4. trackMarathonStudy defined:', html.includes('function trackMarathonStudy('));
console.log('5. Old Watch Marathon text removed:', !html.includes('<span>Watch Marathon &rarr;</span>'));
console.log('6. Old Mark Watched button removed:', !html.includes("completeMarathonMasterclass('${streamKey}')"));
console.log('7. YouTube logo icon present in cards:', html.includes('fa-brands fa-youtube text-xl leading-none'));
console.log('8. authTabs not hidden in updateAuthUI:', !html.includes("authTabs.classList.add('hidden')"));
console.log('9. authTabs made flex in updateAuthUI:', html.includes("authTabs.classList.add('flex')"));
