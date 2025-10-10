# Pharmacy Point of Sale - Frontend

Modern React frontend for the Pharmacy Point of Sale system built with Vite, TypeScript, Tailwind CSS, and DaisyUI.

## 🚀 Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **DaisyUI 4.12.10** - Component library
- **React Router DOM** - Client-side routing
- **Supabase** - Authentication and database
- **Axios** - HTTP client
- **Lucide React** - Icon library

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the environment variables in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_URL=http://localhost:3000
```

## 🏃 Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Build for Production

```bash
npm run build
```

## 👁️ Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components (LoginPage, Dashboard, etc.)
│   ├── services/       # API and Supabase services
│   ├── utils/          # Utility functions and constants
│   ├── hooks/          # Custom React hooks
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # App entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── .env.example        # Environment variables template
└── package.json        # Dependencies and scripts
```

## 🎨 DaisyUI Themes

You can change the theme by modifying the `data-theme` attribute in `index.html`:

Available themes: `light`, `dark`, `cupcake`, `corporate`, `forest`

```html
<html lang="en" data-theme="light">
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔐 Authentication

The app uses Supabase for authentication. The auth service is located in `src/services/supabase.ts`.

## 🌐 API Integration

Backend API integration is configured in `src/services/api.ts` with Axios interceptors for:
- Automatic token injection
- Global error handling
- 401 unauthorized redirects
