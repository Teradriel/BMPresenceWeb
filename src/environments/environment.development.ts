// This file is used for development
// Imports local configurations that are not uploaded to GitHub

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api', // Backend in development
  syncfusionLicenseKey: '' // Overridden by environment.local.ts
};
