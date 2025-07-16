# Pixel Drawing App

A modern, mobile-friendly pixel art drawing app with online gallery, built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Features
- Draw pixel art with pencil, brush, eraser, fill, and eyedropper tools
- Custom color palette with opacity support
- Undo/redo and clear canvas
- Import images (auto-resize to fit canvas)
- Save and post your drawings to a public gallery
- View all posted drawings in the Display Drawings tab
- Responsive/mobile UI with swipeable toolbars
- Patch Notes/Help section (reads from PatchNotes.md)
- Persistent storage using Supabase

## How to Run Locally

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd pixel-drawing-practica
   ```

2. **Install dependencies:**
   ```sh
   cd "Pixel Drawing - Practica"
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env` file in the root of the project (or use Vercel/Supabase dashboard for secrets):
     ```env
     VITE_SUPABASE_URL=your-supabase-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     SUPABASE_URL=your-supabase-url
     SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
     ```

4. **Start the development server:**
   ```sh
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or the port shown in your terminal).

## Deployment / Hosting
- **Hosted on Vercel** for fast, serverless deployment and automatic previews.
- **API routes** (for drawings) are implemented as Vercel serverless functions in the `/api` directory.
- **Persistent storage** is provided by [Supabase](https://supabase.com/) (Postgres database).
- To deploy your own version, connect your repo to Vercel, set the environment variables in the Vercel dashboard, and deploy.

## Directory Structure
- `src/` — Main React app source code
- `api/` — Vercel serverless functions (API endpoints)
- `public/` — Static assets (including PatchNotes.md)

## Credits
- Built by Andrei with help from Bolt & Cursor AI :D
- Uses [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Supabase](https://supabase.com/)

