# Environment Variables Setup

## Syncfusion License Key

To run the application correctly, configure the Syncfusion license key.

### Steps

1. **Get your license key**
   - Register at [Syncfusion](https://www.syncfusion.com/)
   - Obtain a Community (free) or trial license
   - Copy your license key

2. **Configure the local file**
   - Open `src/environments/environment.local.ts`
   - Replace `'YOUR_SYNCFUSION_KEY_HERE'` with your real key
   - Save the file

3. **Example**
   ```typescript
   export const environment = {
     production: false,
     syncfusionLicenseKey: "Mjo5MTIzNEBUYW4uY29t", // Your key here
   };
   ```

### ⚠️ Important

- **Do not commit** `environment.local.ts` to GitHub (it is already in `.gitignore`)
- `environment.local.example.ts` is just a template
- Each developer should create their own `environment.local.ts` with their key

### File Structure

```
src/environments/
├── environment.ts                    ✅ committed (production)
├── environment.development.ts        ✅ committed (development)
├── environment.local.ts              ❌ not committed (your key here)
└── environment.local.example.ts      ✅ committed (template)
```
