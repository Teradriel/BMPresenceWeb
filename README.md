# BMPresenceWeb

BMPresenceWeb is a scheduling and presence management web application. It provides authentication, protected routes, user profiles, and appointment management through a calendar-based UI.

## Key Features

- User authentication (login/logout) and session persistence
- Route protection with guards
- Main dashboard with scheduling features
- Appointment creation and editing through the calendar UI
- User management system with:
  - User listing and search
  - User creation and editing
  - Role-based access control
  - User deletion (admin only)
- Legal pages (privacy policy and terms of service)
- Password change functionality
- Automatic token renewal and session management

## Tech Stack

- Angular 21
- TypeScript
- Syncfusion components (calendar/scheduling UI)
- Modern dependency injection using `inject()` function

## Getting Started

1. Install dependencies
   - `npm install` (includes automatic Syncfusion license configuration via prebuild script)
2. Configure environment variables
   - See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
3. Start the development server
   - `npm start` or `ng serve`
4. Open the app
   - `http://localhost:4200/`

## Recent Updates

### Version 2.0+ (Angular 21)

- **Framework upgrade**: Migrated to Angular 21 from Angular 19
- **User Management**: Complete user administration system:
  - List all users with search and filtering
  - Create and edit user profiles
  - Delete users (admin only)
  - Role-based permissions (Admin/User)
- **Code modernization**:
  - Refactored to use `inject()` function for dependency injection
  - Improved code readability and maintainability
  - Internationalized codebase (English comments, Italian UI)
- **UI improvements**:
  - Enhanced appointment popup with cleaner interface
  - Improved edit user page styling and responsiveness
  - Fixed tab visibility issues on login page
- **Automation**: Prebuild script for Syncfusion license key insertion
- **Dependencies**: Updated to latest compatible versions

## Project Documentation

- Authentication flow and guards: [AUTH_SETUP.md](AUTH_SETUP.md)
- Environment variables and Syncfusion key: [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- Backend API contract for appointments: [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md)

## Application Structure

### Pages

- **Login & Registration**: User authentication and account creation
- **Main Page**: Dashboard with calendar and appointment scheduling
- **User Page**: Individual user profile view
- **Users List Page**: Complete user management (admin)
- **Edit User Page**: User profile editing with validation
- **Change Password**: Secure password update functionality
- **About**: Application information and version details
- **Privacy Policy & Terms of Service**: Legal documentation

### Services

- **AuthService**: Authentication, login, logout, token management
- **UserService**: User CRUD operations and profile management
- **CalendarService**: Appointment scheduling and calendar events
- **TokenRenewalService**: Automatic session renewal

### Guards & Interceptors

- **AuthGuard**: Route protection for authenticated users
- **AuthInterceptor**: Automatic token injection in HTTP requests

## Scripts

- Start dev server: `npm start` or `ng serve`
- Build for production: `ng build`
- Build with production environment: `ng build --configuration=production`
- Unit tests: `ng test`
- Prebuild (Syncfusion license setup): `node set-syncfusion-key.js`

## Development Notes

- This project follows Angular CLI conventions for structure, builds, and testing
- Uses modern Angular features including standalone components and `inject()` function
- Requires Syncfusion license key (configured via environment variables)
- Session tokens are automatically renewed to maintain user sessions
- Role-based access control implemented for admin features
- Code comments are in English, UI messages are in Italian

## Contributing

When contributing to this project:

- Follow the existing code structure and naming conventions
- Use the `inject()` function for dependency injection
- Write unit tests for new components and services
- Keep comments in English for maintainability
- Ensure responsive design for all new UI components
