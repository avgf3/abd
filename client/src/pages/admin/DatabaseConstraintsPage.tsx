import React from 'react';
import DatabaseConstraintsChecker from '../components/admin/DatabaseConstraintsChecker';

const DatabaseConstraintsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DatabaseConstraintsChecker />
    </div>
  );
};

export default DatabaseConstraintsPage;