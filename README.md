# BMPresenceWeb

BMPresenceWeb is a scheduling and presence management web application. It handles authentication, protects routes, and manages user profiles, all presented through a calendar-based interface for appointment scheduling.

## Features

BMPresenceWeb offers a full set of capabilities for managing availability and appointments:

- **Authentication & sessions** – login/logout with persistent session tokens that renew automatically.
- **Protected routes** – navigation guards keep sensitive areas locked down.
- **Interactive dashboard** – a calendar-based main page for scheduling and editing appointments.
- **User management** – list, search, create, edit, and delete users (admin only), backed by role-based access control.
- **Legal pages** – privacy policy and terms of service.
- **Password change** – secure password updates.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Angular 21 | Frontend framework |
| TypeScript | Strongly typed language |
| Syncfusion | Calendar and scheduling UI components |
| `inject()` | Modern dependency injection |

## Getting Started

Follow these steps to get a working copy of the app:

1. **Install dependencies** – run `npm install`. This also triggers a prebuild script that configures the Syncfusion license automatically.
2. **Configure environment variables** – see [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).
3. **Start the development server** – use `npm start` or `ng serve`.
4. **Open the app** – head to [http://localhost:4200/](http://localhost:4200/).

## Project Documentation

- **Authentication flow and guards** – [AUTH_SETUP.md](AUTH_SETUP.md)
- **Environment variables and Syncfusion key** – [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- **Backend API contract for appointments** – [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md)

## Application Structure

### Pages

- **Login & Registration** – user authentication and account creation.
- **Main Page** – dashboard with calendar and appointment scheduling.
- **User Page** – individual user profile view.
- **Users List Page** – complete user management (admin).
- **Edit User Page** – user profile editing with validation.
- **Change Password** – secure password update.
- **About** – application information and version details.
- **Privacy Policy & Terms of Service** – legal documentation.

### Services

- **AuthService** – authentication, login, logout, and token management.
- **UserService** – user CRUD operations and profile management.
- **CalendarService** – appointment scheduling and calendar events.
- **TokenRenewalService** – automatic session renewal.

### Guards & Interceptors

- **AuthGuard** – route protection for authenticated users.
- **AuthInterceptor** – automatic token injection in HTTP requests.

## Recent Updates

### Version 2.0+ (Angular 21)

- **Framework upgrade** – migrated from Angular 19 to Angular 21.
- **User management** – a complete administration system to list users with search and filtering, create and edit profiles, delete users (admin only), and enforce Admin/User role permissions.
- **Code modernization** – refactored dependency injection to use the `inject()` function, improving readability and maintainability, and internationalized the codebase (English comments, Italian UI).
- **UI improvements** – cleaner appointment popup, better edit-user styling and responsiveness, and fixed login-page tab visibility.
- **Automation** – added a prebuild script for inserting the Syncfusion license key.
- **Dependencies** – updated to the latest compatible versions.

## Scripts

- Start dev server – `npm start` or `ng serve`
- Build for production – `ng build`
- Build with production environment – `ng build --configuration=production`
- Unit tests – `ng test`
- Prebuild (Syncfusion license setup) – `node set-syncfusion-key.js`

## Development Notes

- Follows Angular CLI conventions for structure, builds, and testing.
- Uses modern Angular features such as standalone components and the `inject()` function.
- Requires a Syncfusion license key, configured via environment variables.
- Session tokens are renewed automatically to keep user sessions alive.
- Role-based access control gates the admin features.
- Code comments are in English while UI messages are in Italian.

## Contributing

When contributing, please:

- Follow the existing code structure and naming conventions.
- Use the `inject()` function for dependency injection.
- Write unit tests for new components and services.
- Keep comments in English for maintainability.
- Ensure responsive design for all new UI components.
