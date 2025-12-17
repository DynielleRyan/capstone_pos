/**
 * ============================================================================
 * FRONTEND ENTRY POINT - main.tsx
 * ============================================================================
 * 
 * This is the entry point of the React application. It's the first file that
 * runs when the application loads in the browser.
 * 
 * FLOW:
 * 1. Import React DOM's createRoot function (React 18+ API)
 * 2. Import global CSS styles
 * 3. Import the root App component
 * 4. Find the HTML element with id="root" (defined in index.html)
 * 5. Create a React root and render the App component into it
 * 
 * WHAT HAPPENS:
 * - When the browser loads index.html, it finds <div id="root"></div>
 * - This script runs and replaces that empty div with the React app
 * - The App component becomes the root of the component tree
 * 
 * REACT 18+ CHANGES:
 * - Uses createRoot() instead of ReactDOM.render() (deprecated)
 * - Better performance and concurrent rendering support
 * - The ! operator tells TypeScript that getElementById will not return null
 */

// Import React DOM's createRoot function - used to render React components
import { createRoot } from 'react-dom/client'

// Import global CSS styles - Tailwind CSS and custom styles
import './index.css'

// Import the root App component - contains routing and main application logic
import App from './App.tsx'

/**
 * CREATE ROOT AND RENDER APP
 * 
 * getElementById('root'):
 *   - Finds the <div id="root"></div> element in index.html
 *   - This is where the entire React app will be rendered
 * 
 * createRoot():
 *   - Creates a React root container (React 18+ API)
 *   - This is the entry point for React's rendering system
 * 
 * render(<App />):
 *   - Renders the App component as the root of the component tree
 *   - All other components will be children of App
 * 
 * The ! operator:
 *   - Tells TypeScript that getElementById will definitely return an element
 *   - Prevents TypeScript errors about potential null values
 */
createRoot(document.getElementById('root')!).render(
  <App />
)
