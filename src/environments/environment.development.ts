// This file is used for development
// In development, use environment.local.ts to override this with your real key

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api', // Backend in development
  syncfusionLicenseKey: process.env['SYNCFUSION_LICENSE_KEY'] || '' // Can be overridden by environment.local.ts
};
