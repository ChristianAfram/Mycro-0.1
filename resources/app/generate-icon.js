const fs = require('fs');
const pngToIco = require('png-to-ico');

pngToIco('src/renderer/src/assets/logo.png')
  .then(buf => {
    fs.mkdirSync('build', { recursive: true });
    fs.writeFileSync('build/icon.ico', buf);
    console.log('Icon generated successfully!');
  })
  .catch(console.error);
