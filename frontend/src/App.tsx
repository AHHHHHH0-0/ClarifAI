import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import HeroSection from './components/Hero/HeroSection';

function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">ClarifAI</h1>
          <nav className="flex space-x-8">
            <a href="#features" className="text-gray-600 hover:text-accent">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-accent">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-accent">Pricing</a>
          </nav>
        </div>
      </header>
      <main className="pt-16">
        <HeroSection />
        {/* Add more sections below as needed */}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Add more routes here */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;