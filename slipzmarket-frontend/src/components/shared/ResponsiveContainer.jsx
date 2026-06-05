import React from 'react';

const ResponsiveContainer = ({ children, className = '' }) => {
  return (
    <div className={`w-full px-4 sm:px-6 md:px-8 lg:px-12 ${className}`}>
      <div className="max-w-screen-lg mx-auto w-full">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveContainer;
