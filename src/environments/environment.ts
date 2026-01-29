// This file is used for production
// Real keys should be in environment.local.ts (not uploaded to GitHub)

export const environment = {
  production: true,
  apiUrl: 'https://bmpresence-back.onrender.com/api', // Backend in production (Render)
  syncfusionLicenseKey: '' // Leave empty - use server environment variables
};
