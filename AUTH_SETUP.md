# Sistema di Autenticazione - BMPresence

## Descrizione

Sistema di autenticazione implementato per l'applicazione BMPresence Web. Include login, logout, protezione delle rotte e persistenza della sessione.

## File Creati

### 1. Servizio di Autenticazione

**Posizione:** `src/app/services/auth.service.ts`

Il servizio fornisce le seguenti funzionalità:

- Login con utente e password
- Logout
- Verifica dello stato di autenticazione
- Archiviazione persistente della sessione (localStorage)
- Observable dell'utente corrente

#### Metodi principali:

```typescript
login(username: string, password: string): Promise<void>
logout(): void
isAuthenticated: boolean
currentUserValue: User | null
getAuthToken(): string | null
```

### 2. Guards di Rotta

**Posizione:** `src/app/guards/auth.guard.ts`

Sono stati implementati due guards:

- **authGuard**: Protegge le rotte che richiedono autenticazione
  - Se l'utente non è autenticato, reindirizza a `/login`
  - Salva l'URL richiesto per reindirizzare dopo il login

- **loginGuard**: Previene l'accesso al login se già autenticato
  - Se l'utente è già autenticato, reindirizza a `/main`

### 3. Rotte Protette

**Posizione:** `src/app/app.routes.ts`

Rotte configurate:

- `/login` - Accessibile solo per utenti non autenticati (loginGuard)
- `/main` - Richiede autenticazione (authGuard)
- `/user` - Richiede autenticazione (authGuard)
- `/about` - Richiede autenticazione (authGuard)
- `/privacy-policy` - Richiede autenticazione (authGuard)
- `/terms-of-service` - Richiede autenticazione (authGuard)

## Utilizzo

### Login

El componente de login ya está configurado para usar el servicio:

```typescript
await this.authService.login(username, password);
```

### Logout

Añadido botón de logout en la página principal:

```typescript
this.authService.logout();
```

### Verificare autenticazione

```typescript
if (this.authService.isAuthenticated) {
  // User authenticated
}
```

### Ottenere utente corrente

```typescript
const user = this.authService.currentUserValue;
console.log(user.username);
```

### Iscriversi ai cambiamenti di autenticazione

```typescript
this.authService.currentUser.subscribe((user) => {
  if (user) {
    console.log("User logged in:", user);
  } else {
    console.log("User not logged in");
  }
});
```

## Integrazione con API Reale

Attualmente il servizio utilizza una simulazione. Per integrare con un'API reale:

1. **Sostituire il metodo di login:**

```typescript
async login(username: string, password: string): Promise<void> {
  const response = await fetch('YOUR_API_URL/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Nome utente o password non corretti');
  }

  const data = await response.json();
  this.setToken(data.token);
  this.setUser(data.user);
  this.currentUserSubject.next(data.user);
}
```

2. **Creare un interceptor HTTP per aggiungere il token:**

```typescript
// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAuthToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
```

3. **Registrare l'interceptor in app.config.ts:**

```typescript
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { authInterceptor } from "./interceptors/auth.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // ... other providers
  ],
};
```

## Sicurezza

- Le credenziali sono archiviate in localStorage
- Il token viene incluso automaticamente nelle richieste HTTP (quando si configura l'interceptor)
- Le rotte sono protette da guards
- La sessione persiste tra i ricaricamenti della pagina

## Prossimi Passi

1. Implementare pagina di registrazione
2. Aggiungere recupero password
3. Implementare refresh token
4. Aggiungere gestione della scadenza del token
5. Implementare ruoli e permessi utente
6. Aggiungere verifica email
