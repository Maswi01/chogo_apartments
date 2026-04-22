# Chogo Apartments - Frontend

React + TypeScript + Tailwind UI for apartment management system.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **State Management**: React Context API

## Directory Structure

```
frontend/
├── src/
│   ├── pages/              # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx
│   ├── components/         # Reusable components
│   │   └── PrivateRoute.tsx
│   ├── context/           # React Context (auth state)
│   │   └── AuthContext.tsx
│   ├── lib/               # Utility functions & API calls
│   │   ├── api.ts         # Axios instance & interceptors
│   │   └── authAPI.ts     # Auth API methods
│   ├── App.tsx            # Main app component & routes
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running on `http://localhost:8080`

## Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Setup

Environment variables are optional (defaults provided):

```env
# Frontend default API URL
VITE_API_URL=http://localhost:8080/api
```

### 3. Development Server

```bash
npm run dev
```

Opens on `http://localhost:5173`

The Vite dev server proxies `/api` calls to `http://localhost:8080/api`

## Build

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

Output in `dist/` folder

### Preview Production Build
```bash
npm run preview
```

## Pages & Components

### Pages

1. **LoginPage** (`/login`)
   - Email + password login form
   - Error handling
   - Redirect to dashboard on success
   - Link to register page

2. **RegisterPage** (`/register`)
   - Full name, email, password, branch name inputs
   - Password confirmation
   - Auto-creates branch if needed
   - Self-login on successful registration

3. **DashboardPage** (`/dashboard`)
   - Protected route (requires login)
   - Displays user info
   - Logout button
   - Starting point for authenticated users

### Components

1. **PrivateRoute**
   - Guards protected routes
   - Redirects unauthenticated users to `/login`

2. **AuthContext**
   - Global auth state (user, token, login/logout)
   - Persists to localStorage automatically
   - Auto-restores session on page reload

## Authentication Flow

1. **Login**
   - User enters email + password on LoginPage
   - Call `authAPI.login()`
   - Store token + user in AuthContext + localStorage
   - Redirect to dashboard

2. **Register**
   - User fills registration form
   - Call `authAPI.register()`
   - Auto-login with returned token
   - Redirect to dashboard

3. **Protected Routes**
   - PrivateRoute checks `useAuth().isAuthenticated`
   - If false, redirect to `/login`
   - localStorage persists token across browser restarts

4. **API Requests**
   - Axios interceptor auto-adds `Authorization: Bearer <token>` header
   - If 401 response, clear auth & redirect to login

5. **Logout**
   - Clear AuthContext state
   - Clear localStorage
   - Redirect to `/login`

## API Integration

All API calls go through `lib/authAPI.ts`:

```typescript
// Login
await authAPI.login({ email: "user@example.com", password: "123456" })

// Register
await authAPI.register({
  email: "user@example.com",
  password: "123456",
  full_name: "John Doe",
  branch_name: "Mikocheni Block A"
})
```

Response types are fully typed with TypeScript interfaces.

## Tailwind CSS

### Customization

Edit `tailwind.config.js` to customize:
- Colors
- Fonts
- Spacing
- Breakpoints
- Plugins

### Used Components

- Forms: inputs, labels, buttons
- Cards: shadows, padding, rounded corners
- Grid layouts: responsive columns
- Colors: blue for primary, gray for neutral, red for errors, green for success

## Development Workflow

### Adding New Pages

1. Create component in `src/pages/PageName.tsx`
2. Add route in `App.tsx`
3. Use `useAuth()` for auth state
4. Use `useNavigate()` for navigation
5. Use `authAPI` for backend calls

Example:
```typescript
// src/pages/TenantsPage.tsx
import { useAuth } from '../context/AuthContext'
import apiClient from '../lib/api'

export default function TenantsPage() {
  const { user } = useAuth()
  
  // Component code...
}

// In App.tsx
import TenantsPage from './pages/TenantsPage'
<Route path="/tenants" element={<PrivateRoute><TenantsPage /></PrivateRoute>} />
```

### Adding New API Calls

1. Add method to `authAPI` in `src/lib/authAPI.ts`
2. Define request/response types
3. Use in components via `authAPI.newMethod()`

Example:
```typescript
// src/lib/authAPI.ts
export const authAPI = {
  // ... existing methods
  
  getTenants: (branchId: number) =>
    apiClient.get<TenantResponse>(`/branches/${branchId}/tenants`),
}

// In component
const response = await authAPI.getTenants(user.branch_id)
```

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm run dev
```

### Backend API not responding
- Check backend is running on `http://localhost:8080`
- Check CORS headers are correct
- Check proxy config in `vite.config.ts`

### Authentication not persisting
- Check localStorage is enabled in browser
- Clear localStorage and re-login: `localStorage.clear()`

### Tailwind styles not appearing
- Check `tailwind.config.js` includes your files
- Restart dev server after config changes
- Clear `node_modules/.vite` cache

### Port 5173 already in use
```bash
npm run dev -- --port 5174
```

## TypeScript

All code is typed. Key types:

```typescript
// User from backend
interface User {
  id: number
  branch_id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Auth context
interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}
```

## Performance

- Code splitting via React Router
- Lazy loading of pages
- Minified CSS with Tailwind
- Fast HMR (Hot Module Replacement)
- Optimized bundle size

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest

## Production Deployment

### Build
```bash
npm run build
```

### Hosting Options

1. **Static Hosting** (Vercel, Netlify, GitHub Pages)
   - Upload `dist/` folder
   - Configure `_redirects` for SPA routing

2. **Docker**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package.json .
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "run", "preview"]
   ```

3. **Traditional Hosting**
   - Upload `dist/` to web server
   - Configure web server for SPA routing

### Production Checklist

- [ ] Update backend API URL (VITE_API_URL)
- [ ] Set proper CORS origin in backend
- [ ] Enable HTTPS
- [ ] Set up error tracking
- [ ] Configure CDN for assets
- [ ] Set up monitoring/analytics
- [ ] Test on target browsers

## License

MIT
