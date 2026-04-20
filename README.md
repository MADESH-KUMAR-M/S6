# SkillGap AI

SkillGap AI is an intelligent platform designed to help professionals bridge the gap between their current skills and their target career roles. Using Gemini AI, the platform analyzes industry standards and provides personalized learning paths.

## Features

- **AI-Powered Skill Analysis**: Compares user skills against real-world job requirements using Gemini 3 Flash.
- **Visual Proficiency Map**: Interactive Radar charts showing current vs. required skill levels.
- **Personalized Learning Paths**: Curated recommendations for topics and courses.
- **Progress Tracking**: Track your mastery of recommended topics with a persistent progress system.
- **Full-Stack Architecture**: Secure user accounts and data persistence.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Recharts, Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: SQLite (via `better-sqlite3`) for reliable local storage.
- **AI**: Google Gemini API.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   Create a `.env` file with your `GEMINI_API_KEY`.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

## Project Structure

- `server.ts`: Express server with API routes and Vite middleware.
- `src/App.tsx`: Main React application with routing and dashboard logic.
- `src/services/geminiService.ts`: Integration with the Google GenAI SDK.
- `skillgap.db`: SQLite database file.
