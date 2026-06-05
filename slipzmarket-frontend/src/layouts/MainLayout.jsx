import React from 'react';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ChatWidget from '../components/shared/ChatWidget'; // <-- Import the new widget
import ResponsiveContainer from '../components/shared/ResponsiveContainer';

const MainLayout = ({ children }) => {
  return (
    // 1. Root Container
    <div className="flex flex-col h-screen w-full bg-app overflow-hidden text-primary selection:bg-apollo-blue selection:text-white relative">
      
      {/* 2. Global Header */}
      <Header />

      {/* 3. Lower Interface Wrapper */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar */}
        <Sidebar />

        {/* 4. The "Canvas" (Main Content Area) */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-surface shadow-[inset_1px_0_0_0_rgba(0,0,0,0.05)]">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none z-10" />

          {/* Scrollable Region */}
          <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col w-full relative scroll-smooth">
            <div className="flex-1 w-full pb-16 transition-all duration-300">
                <ResponsiveContainer>
                  {children}
                </ResponsiveContainer>
              </div>
            <Footer />
          </main>
        </div>
      </div>
      
      {/* The Extracted Floating Chat Component */}
      <ChatWidget />
      
    </div>
  );
};

export default MainLayout;