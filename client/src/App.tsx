import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          تطبيق الدردشة الشامل
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-center text-gray-600 mb-4">
            مرحباً بك في تطبيق الدردشة الشامل
          </p>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              التطبيق قيد التطوير - سيتم إضافة جميع الميزات قريباً
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
