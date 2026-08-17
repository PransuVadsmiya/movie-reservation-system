# Movie Reservation System - Frontend

Next.js frontend for the Movie Reservation System with JWT authentication.

## 🔐 Authentication Flow

This frontend matches the backend's JWT authentication exactly:

### Backend Authentication (FastAPI)
1. **Signup**: `POST /auth/signup` → Creates user with bcrypt-hashed password
2. **Login**: `POST /auth/login` → Returns JWT token with user_id in "sub" claim
3. **Protected Routes**: Require `Authorization: Bearer {token}` header
4. **Token Validation**: Backend uses HTTPBearer scheme to extract and verify token
5. **User Extraction**: JWT "sub" claim contains user_id, backend queries DB for full user object
6. **Admin Check**: `require_admin` dependency checks if `user.role == "admin"`

### Frontend Implementation
- **Token Storage**: localStorage.access_token
- **Auto-injection**: Axios interceptor adds `Authorization: Bearer {token}` to all requests
- **Token Refresh**: On 401 response, clears localStorage and redirects to login
- **User Persistence**: Fetches `/me` endpoint on mount to verify token is still valid
- **Role-based UI**: Shows different content for admin vs regular users

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Backend API running on `http://localhost:8001`

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

The `.env.local` file is already configured:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with AuthProvider
│   │   ├── page.tsx             # Home (redirects to login/dashboard)
│   │   ├── login/page.tsx       # Login page
│   │   ├── signup/page.tsx      # Signup page
│   │   ├── dashboard/page.tsx   # Protected dashboard
│   │   └── globals.css          # Global styles
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context & hooks
│   └── lib/
│       └── api.ts               # API client with axios
├── .env.local                   # Environment variables
├── package.json
└── README.md
```

## 🎯 Features

### ✅ Implemented
- **Login** with email/password
- **Signup** with automatic login after registration
- **JWT token management** (localStorage)
- **Automatic token injection** in API requests
- **Token expiration handling** (auto-logout on 401)
- **Role-based UI** (admin vs user badges)
- **Protected routes** (redirects to login if not authenticated)
- **Admin endpoint testing** (demonstrates role-based access)
- **Responsive design** with dark mode support

## 🔑 Default Credentials

### Admin Account (seeded by backend)
- **Email**: `admin@example.com`
- **Password**: `change_this_admin_password`

*(Credentials from your `.env` file: `ADMIN_EMAIL` and `ADMIN_PASSWORD`)*

### Regular User
- Create a new account via signup page
- Role will be "user" by default

## 🧪 Testing Authentication

### 1. Test Login
1. Go to http://localhost:3000/login
2. Enter admin credentials (see above)
3. Click "Login"
4. Should redirect to dashboard showing user info

### 2. Test Signup
1. Go to http://localhost:3000/signup
2. Enter new email and password
3. Click "Sign Up"
4. Should auto-login and redirect to dashboard

### 3. Test Admin Access
1. Login as admin
2. Go to dashboard
3. Click "Test Admin Endpoint"
4. Should see success message: "Welcome admin {email}"

### 4. Test Regular User Access
1. Login as regular user (non-admin)
2. Go to dashboard
3. Click "Test Admin Endpoint"
4. Should see error: "Access denied: You are not an admin"

### 5. Test Token Persistence
1. Login
2. Refresh the page
3. Should remain logged in (token persists in localStorage)

### 6. Test Logout
1. Click "Logout" button
2. Should clear localStorage and redirect to login

## 🔧 API Integration

### Axios Client Configuration
```typescript
// Base URL from environment
baseURL: process.env.NEXT_PUBLIC_API_URL

// Request Interceptor: Adds token to all requests
Authorization: Bearer {localStorage.access_token}

// Response Interceptor: Handles 401 (token expired)
- Clears localStorage
- Redirects to /login
```

### API Endpoints Used
- `POST /auth/signup` - Create new user
- `POST /auth/login` - Get JWT token
- `GET /me` - Get current user (validates token)
- `GET /admin-check` - Test admin-only endpoint

## 🎨 UI Components

### Custom CSS Classes
- `.auth-container` - Centered auth page layout
- `.auth-card` - White card with shadow
- `.form-group`, `.form-label`, `.form-input` - Form styling
- `.btn`, `.btn-primary`, `.btn-secondary` - Button styles
- `.alert`, `.alert-error`, `.alert-success` - Alert messages
- `.badge`, `.badge-admin`, `.badge-user` - Role badges

### Dark Mode
- Automatic based on system preference
- Custom dark mode styles for all components

## 🔒 Security Notes

### ✅ Good Practices
- Passwords never stored in plain text
- JWT tokens have expiration (60 min default)
- Tokens cleared on logout
- 401 responses auto-clear invalid tokens
- HTTPS recommended for production

### ⚠️ Development Notes
- localStorage is vulnerable to XSS attacks
- For production, consider httpOnly cookies
- Implement CSRF protection for cookies
- Add rate limiting on backend auth endpoints

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### "Network Error" or "Failed to fetch"
- Ensure backend is running on http://localhost:8001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is enabled on backend

### "401 Unauthorized" after login
- Check backend logs for JWT validation errors
- Verify `SECRET_KEY` and `ALGORITHM` in backend `.env`
- Clear localStorage and try logging in again

### Token not persisting
- Check browser localStorage in DevTools
- Ensure `access_token` key exists
- Check axios interceptor is adding Authorization header

## 🚀 Next Steps

Possible enhancements:
- [ ] Add movie browsing UI
- [ ] Add seat selection UI
- [ ] Add reservation management
- [ ] Add user profile page
- [ ] Implement refresh tokens
- [ ] Add password reset flow
- [ ] Add email verification
- [ ] Add loading skeletons
- [ ] Add toast notifications

---

**Built with:** Next.js 14, TypeScript, Axios, Tailwind CSS (custom styles)
