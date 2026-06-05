import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../utils/api';

const ChatWidget = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 1. The Message State Array
  const [messages, setMessages] = useState([
    { 
      id: 'welcome-msg', 
      senderRole: 'BOT', 
      text: 'Hi there! I\'m the SlipZMarket automated assistant. How can I help you today? Type "human" to speak with our live team.' 
    }
  ]);

  // 2. Auto-scroll Reference
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]);

  // Add this inside ChatWidget
  useEffect(() => {
    if (isChatOpen) {
      fetchChatHistory();
    }
  }, [isChatOpen]);

  const fetchChatHistory = async () => {
    const token = localStorage.getItem('slipz_token');
    try {
      const response = await axios.get(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Merge history with your welcome message
      if (response.data.messages && response.data.messages.length > 0) {
        const formattedHistory = response.data.messages.map(m => ({
          id: m.id,
          senderRole: m.senderRole, // Ensure this matches 'USER', 'BOT', or 'AGENT'
          text: m.text
        }));
        
        setMessages([
          { 
            id: 'welcome-msg', 
            senderRole: 'BOT', 
            text: 'Hi there! Welcome back to SlipZMarket support.' 
          },
          ...formattedHistory
        ]);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };


const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userText = message;
    setMessages(prev => [...prev, { id: Date.now().toString(), senderRole: 'USER', text: userText }]);
    setMessage('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('slipz_token'); // Make sure this key matches your storage!
      
      console.log("Sending to:", `${API_URL}/chat/message`); // Debug URL
      
      const response = await axios.post(
        `${API_URL}/chat/message`, // Ensure this path matches your backend index.ts
        { text: userText },
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );

      console.log("Server Response:", response.data); // See what the server says
      
      if (response.data.botResponse) {
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          senderRole: response.data.botResponse.senderRole || 'BOT', 
          text: response.data.botResponse.text || response.data.botResponse 
        }]);
      }
    } catch (error) {
      // THIS WILL SHOW YOU WHY IT ISN'T SENT
      console.error("Full Error Object:", error.response || error);
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        senderRole: 'SYSTEM', 
        text: `⚠️ Error: ${error.response?.data?.error || 'Connection failed'}` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* The Chat Window */}
      <div 
        className={`transition-all duration-300 ease-in-out origin-bottom-right ${
          isChatOpen 
            ? 'scale-100 opacity-100 mb-4' 
            : 'scale-0 opacity-0 h-0 w-0 mb-0 pointer-events-none'
        }`}
      >
        <div className="w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl border border-[#e8e2e2] flex flex-col overflow-hidden">
          
          {/* Chat Header */}
          <div className="bg-[#800000] text-white p-4 flex items-center justify-between shadow-md z-10">
            <div>
              <h3 className="font-bold text-[15px]">SlipZMarket Support</h3>
              <p className="text-[12px] text-white/80">Typically replies instantly</p>
            </div>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 bg-[#f9fafb] p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start gap-2 ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot/Agent Avatar */}
                {msg.senderRole !== 'USER' && (
                  <div className="w-8 h-8 rounded-full bg-[#f5f2f2] border border-[#d8cdcd] flex items-center justify-center shrink-0 text-sm">
                    {msg.senderRole === 'SYSTEM' ? '⚠️' : msg.senderRole === 'AGENT' ? '👤' : '🤖'}
                  </div>
                )}

                {/* Formatted Text Bubble */}
                <div 
                  className={`text-[13px] p-3 shadow-sm max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    msg.senderRole === 'USER' 
                      ? 'bg-[#800000] text-white rounded-2xl rounded-tr-none' 
                      : msg.senderRole === 'SYSTEM'
                      ? 'bg-red-50 text-red-800 border border-red-200 rounded-2xl rounded-tl-none'
                      : 'bg-white border border-[#e8e2e2] text-[#2a1b1b] rounded-2xl rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-[#f5f2f2] border border-[#d8cdcd] flex items-center justify-center shrink-0">🤖</div>
                <div className="bg-white border border-[#e8e2e2] p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-10">
                  <div className="w-1.5 h-1.5 bg-[#a09393] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#a09393] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#a09393] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Invisible div to scroll down to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Box */}
          <div className="bg-white border-t border-[#e8e2e2] p-3">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..." 
                disabled={isTyping}
                className="w-full bg-[#f5f2f2] text-[#2a1b1b] text-[14px] rounded-full pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-[#800000]/20 border border-transparent focus:border-[#800000] transition-all disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!message.trim() || isTyping}
                className="absolute right-2 w-8 h-8 bg-[#800000] hover:bg-[#660000] text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* The Floating Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="w-14 h-14 bg-[#800000] hover:bg-[#660000] text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
      >
        {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

    </div>
  );
};

export default ChatWidget;