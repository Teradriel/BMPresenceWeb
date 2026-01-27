# Configuración de Variables de Entorno

## Syncfusion License Key

Para que la aplicación funcione correctamente, necesitas configurar tu clave de licencia de Syncfusion.

### Pasos:

1. **Obtén tu clave de licencia**:
   - Regístrate en [Syncfusion](https://www.syncfusion.com/)
   - Obtén una licencia Community (gratis) o de prueba
   - Copia tu clave de licencia

2. **Configura el archivo local**:
   - Abre el archivo `src/environments/environment.local.ts`
   - Reemplaza `'TU_CLAVE_DE_SYNCFUSION_AQUI'` con tu clave real
   - Guarda el archivo

3. **Ejemplo**:
   ```typescript
   export const environment = {
     production: false,
     syncfusionLicenseKey: "Mjo5MTIzNEBUYW4uY29t", // Tu clave aquí
   };
   ```

### ⚠️ Importante:

- **NO subas** `environment.local.ts` a GitHub (ya está en `.gitignore`)
- El archivo `environment.local.example.ts` es solo una plantilla
- Otros desarrolladores deben crear su propio `environment.local.ts` con su clave

### Estructura de archivos:

```
src/environments/
├── environment.ts                    ✅ Se sube a GitHub (producción)
├── environment.development.ts        ✅ Se sube a GitHub (desarrollo)
├── environment.local.ts              ❌ NO se sube (tu clave aquí)
└── environment.local.example.ts      ✅ Se sube a GitHub (plantilla)
```
