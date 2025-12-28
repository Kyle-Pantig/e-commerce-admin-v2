# E-commerce Admin Backend

FastAPI backend for the e-commerce admin application using Supabase authentication and Prisma ORM.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the `backend` directory with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# Or use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
FRONTEND_URL=http://localhost:3000

# Prisma Database URL (Supabase PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
```

3. Get your Supabase credentials from: https://app.supabase.com/project/_/settings/api

4. Generate Prisma Client:
```bash
cd backend
prisma generate
```
Note: If you encounter env conflict errors, temporarily move `backend/.env` to root or consolidate your .env files.

5. Push Prisma schema to database (create tables):
```bash
cd backend
prisma db push
```

6. Run the development server:
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### Authentication (`/auth`)
- `POST /auth/signup` - Sign up a new user with Supabase
  - Body: `{ "email": "user@example.com", "password": "password", "full_name": "Optional Name" }`
  - Returns: Access token, refresh token, and user data

- `POST /auth/login` - Login with Supabase
  - Body: `{ "email": "user@example.com", "password": "password" }`
  - Returns: Access token, refresh token, and user data

- `GET /auth/me` - Get current user information
  - Headers: `Authorization: Bearer <access_token>`
  - Returns: User information

- `POST /auth/logout` - Logout current user
  - Headers: `Authorization: Bearer <access_token>`
  - Returns: Success message

- `POST /auth/refresh` - Refresh access token
  - Body: `{ "refresh_token": "your_refresh_token" }`
  - Returns: New access token, refresh token, and user data

## Database Models

### User Model
The User model includes:
- `id` (UUID) - Primary key
- `email` (String, unique) - User email
- `fullName` (String, optional) - User's full name
- `role` (UserRole enum) - Either `USER` or `ADMIN` (default: `USER`)
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

## Development

The backend uses FastAPI with:
- **Supabase Authentication** - All auth operations handled by Supabase
- **Prisma ORM** - Database ORM for PostgreSQL (Supabase)
- CORS middleware for frontend integration
- Pydantic models for request/response validation
- HTTPBearer security for protected routes

### Using Prisma Client

```python
from prisma_client import get_prisma_client

# In an async function
prisma = await get_prisma_client()

# Create a user
user = await prisma.user.create(
    data={
        "email": "admin@example.com",
        "fullName": "Admin User",
        "role": "ADMIN"
    }
)

# Find users
users = await prisma.user.find_many(
    where={"role": "ADMIN"}
)
```

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (recommended for backend admin operations)
- `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Anon key (fallback)
- `DATABASE_URL` - PostgreSQL connection string (Supabase database URL)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

