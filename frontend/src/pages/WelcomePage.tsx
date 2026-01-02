import React, { useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { notebookId } = useParams<{ notebookId?: string }>();
  const { theme } = useTheme();

  const handleGetStarted = () => {
    if (notebookId) {
      navigate(`/chat/${notebookId}`);
    }
  };

  // Add keyboard support for Enter key
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        handleGetStarted();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [notebookId]);

  if (!notebookId) {
    return <Navigate to="/notebooks" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Icon/Logo */}
        <div className="mb-8 flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            theme === 'dark' 
              ? 'bg-blue-900/30 border-2 border-blue-400' 
              : 'bg-blue-50 border-2 border-blue-500'
          }`}>
            <Sparkles 
              className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} 
              size={40} 
            />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Your idea begins here
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed">
          Just start typing or speaking and make it come to light.
        </p>

        {/* Description */}
        <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-xl mx-auto">
          Your notebook is ready. Capture your thoughts, organize your ideas, and bring your vision to life.
        </p>

        {/* Get Started Button */}
        <button
          onClick={handleGetStarted}
          className={`
            inline-flex items-center gap-3 px-8 py-4 rounded-lg text-lg font-semibold
            transition-all duration-200 transform hover:scale-105
            ${theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/50'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50'
            }
          `}
        >
          Get Started
          <ArrowRight size={24} />
        </button>

        {/* Optional: Skip link */}
        <div className="mt-8">
          <button
            onClick={handleGetStarted}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            or press Enter to continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
