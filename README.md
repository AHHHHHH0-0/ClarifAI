# ClarifAI

A comprehensive AI-powered application for learning and concept explanation.

## Quick Setup for Firebase Authentication

If you're experiencing `auth/unauthorized-domain` errors, follow these steps:

### 1. Add Authorized Domains in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`clarifai-5f201`)
3. Navigate to **Authentication** > **Settings** > **Authorized domains**
4. Add these domains:
   - `localhost` (for development)
   - `127.0.0.1` (for local development)
   - `localhost:3000` (React development server)
   - `localhost:3001` (alternative port)
   - Any other domains where you plan to deploy

### 2. Development Setup

```bash
# Frontend setup
cd frontend
npm install
npm start

# Backend setup
cd backend
pip install -r requirements.txt
python main.py
```

### 3. Environment Variables

Ensure your `frontend/.env.local` contains all required Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Troubleshooting

**Common Issues:**

- **auth/unauthorized-domain**: Add your domain to Firebase Console authorized domains
- **Popup blocked**: Enable popups for localhost in your browser
- **Network errors**: Check if backend is running on port 8000

**Development Tips:**

- The app runs on `http://localhost:3000` by default
- Backend API runs on `http://localhost:8000`
- Check browser console for detailed error messages

## Project Structure

```
ClarifAI/
├── frontend/          # React TypeScript application
├── backend/           # Python FastAPI backend
└── README.md         # This file
```

## Features

- Firebase Authentication (Google OAuth & Email/Password)
- Real-time audio processing
- AI-powered concept explanation
- Modern responsive UI with Tailwind CSS

## Support

If you continue experiencing authentication issues:

1. Verify Firebase project configuration
2. Check that all environment variables are set
3. Ensure authorized domains are configured correctly
4. Contact support if issues persist
