# BMPresenceWeb

BMPresenceWeb is a scheduling and presence management web application. It provides authentication, protected routes, user profiles, and appointment management through a calendar-based UI.

## Key Features

- User authentication (login/logout) and session persistence
- Route protection with guards
- Main dashboard with scheduling features
- Appointment creation and editing through the calendar UI
- User management views
- Legal pages (privacy policy and terms of service)

## Tech Stack

- Angular 19
- TypeScript
- Syncfusion components (calendar/scheduling UI)

## Getting Started

1. Install dependencies
   - `npm install`
2. Configure environment variables
   - See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
3. Start the development server
   - `npm start` or `ng serve`
4. Open the app
   - `http://localhost:4200/`

## Project Documentation

- Authentication flow and guards: [AUTH_SETUP.md](AUTH_SETUP.md)
- Environment variables and Syncfusion key: [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- Backend API contract for appointments: [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md)

## Scripts

- Start dev server: `npm start` or `ng serve`
- Build: `ng build`
- Unit tests: `ng test`

## Notes

This project uses standard Angular CLI conventions for structure, builds, and testing.
