const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, 'src/environments/environment.ts');
const licenseKey = process.env.SYNCFUSION_LICENSE_KEY || '';

fs.readFile(envFile, 'utf8', (err, data) => {
  if (err) throw err;
  const result = data.replace(
    /syncfusionLicenseKey: ''/,
    `syncfusionLicenseKey: '${licenseKey}'`
  );
  fs.writeFile(envFile, result, 'utf8', (err) => {
    if (err) throw err;
    console.log('Syncfusion license key injected!');
  });
});