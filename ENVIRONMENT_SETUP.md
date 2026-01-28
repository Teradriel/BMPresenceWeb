# Configurazione delle Variabili di Ambiente

## Syncfusion License Key

Per far funzionare correttamente l'applicazione, è necessario configurare la chiave di licenza Syncfusion.

### Passaggi:

1. **Obtén tu clave de licencia**:
   - Regístrate en [Syncfusion](https://www.syncfusion.com/)
   - Obtén una licencia Community (gratis) o de prueba
   - Copia tu clave de licencia

2. **Configura el archivo local**:
   - Abre el archivo `src/environments/environment.local.ts`
   - Reemplaza `'TU_CLAVE_DE_SYNCFUSION_AQUI'` con tu clave real
   - Guarda el archivo

3. **Esempio**:
   ```typescript
   export const environment = {
     production: false,
     syncfusionLicenseKey: "Mjo5MTIzNEBUYW4uY29t", // Your key here
   };
   ```

### ⚠️ Importante:

- **NON caricare** `environment.local.ts` su GitHub (già presente in `.gitignore`)
- Il file `environment.local.example.ts` è solo un modello
- Altri sviluppatori devono creare il proprio `environment.local.ts` con la loro chiave

### Struttura dei file:

```
src/environments/
├── environment.ts                    ✅ Se sube a GitHub (producción)
├── environment.development.ts        ✅ Se sube a GitHub (desarrollo)
├── environment.local.ts              ❌ NO se sube (tu clave aquí)
└── environment.local.example.ts      ✅ Se sube a GitHub (plantilla)
```
