# Jambo Pharmacy PoS System

## Project Structure

```
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API and Supabase services
│   │   ├── hooks/        # Custom React hooks
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   └── package.json
├── backend/           # Express.js + TypeScript
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   └── package.json
└── README.md
```

## Technologies Used

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with **daisyUI** for styling
- **Lucide React** for icons
- **Axios** for HTTP requests
- **React Router** for navigation
- **Supabase** for database and authentication

### Backend
- **Express.js** with TypeScript
- **Supabase** for database
- **CORS** for cross-origin requests
- **Helmet** for security

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
   - Copy `frontend/env.example` to `frontend/.env`
   - Copy `backend/env.example` to `backend/.env`
   - Fill in your Supabase credentials

### Development

```bash
# Start backend server (port 3001)
cd backend
npm run dev

# Start frontend development server (port 5173)
cd frontend
npm run dev
```




