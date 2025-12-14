import React, { useState, useEffect } from 'react';

const UnderDevelopmentPlaceholder = ({ featureName = "This Feature is" }) => {
  const [progress, setProgress] = useState(0);
  
  // Simulate progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < 100) {
        setProgress(prev => Math.min(prev + 1, 100));
      }
    }, 30);
    
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #0B4D64 0%, #002873 100%)',
              boxShadow: '0 10px 25px rgba(11, 77, 100, 0.2)'
            }}
          >
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            <span className="block">{featureName}</span>
            <span 
              className="block"
              style={{ color: '#0B4D64' }}
            >
              Under Development
            </span>
          </h1>
          <p 
            className="text-gray-600 text-lg max-w-lg mx-auto"
          >
            We're currently working on this feature to make it perfect for you. Check back soon for updates!
          </p>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Need immediate assistance? <a 
              href="https://www.nexusinfotech.co/contact" 
              className="hover:underline font-medium"
              style={{ color: '#0B4D64' }}
            >
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Custom CSS for shimmer animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;
document.head.appendChild(style);

export default UnderDevelopmentPlaceholder;