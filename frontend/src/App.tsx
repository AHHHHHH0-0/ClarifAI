import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';

const HomePage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">ClarifAI</h1>
      </div>
    </header>
    <main>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <p className="text-xl text-gray-500">Your content will go here</p>
          </div>
        </div>
      </div>
    </main>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* …other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;