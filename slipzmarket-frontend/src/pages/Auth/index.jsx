import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../utils/api';
// MUST IMPORT THE PROVIDER
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { 
  Asterisk, ArrowRight, Mail, Lock, 
  User as UserIcon, Building2, 
  CheckCircle2, Loader2,
  ArrowLeft, AlertCircle, Database, Target
} from 'lucide-react';

// Ensure this is set in your .env file
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

// ==========================================
// 1. VERIFICATION FORM COMPONENT
// ==========================================
const VerificationForm = ({ 
  formData, otp, setOtp, otpRefs, handleVerifyOtp, 
  isLoading, setIsVerifying, setError, showSuccess, pendingToken, setPendingToken
}) => {
  
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value !== '' && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(isNaN)) return;
    
    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    if (pastedData.length < 6) {
      otpRefs.current[pastedData.length].focus();
    } else {
      otpRefs.current[5].focus();
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/resend-otp`, { pendingToken });
      setPendingToken(res.data.pendingToken);
      showSuccess('A new verification code has been sent to your email.');
      setOtp(['', '', '', '', '', '']); 
      otpRefs.current[0].focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="flex flex-col animate-fade-in-right">
      <button 
        onClick={() => setIsVerifying(false)}
        className="w-fit flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-[#3b2a23] mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>
      
      <div className="w-14 h-14 bg-white border border-[#e5ded5] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <Mail size={24} className="text-gray-400" />
      </div>
      
      <h2 className="text-3xl font-black text-[#3b2a23] tracking-tight mb-2">Check your email</h2>
      <p className="text-[15px] text-gray-500 font-medium mb-8 leading-relaxed">
        We've sent a 6-digit secure code to <br/>
        <span className="font-bold text-[#3b2a23]">{formData.email}</span>
      </p>

      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
        <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (otpRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className="w-full h-14 sm:h-16 text-center text-2xl font-black text-[#3b2a23] bg-white border border-[#e5ded5] rounded-xl outline-none focus:border-[#8b6f5a] focus:ring-4 focus:ring-[#8b6f5a]/20 transition-all shadow-sm"
            />
          ))}
        </div>

        <button 
          type="submit" 
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full bg-[#8b6f5a] hover:bg-[#6c5544] text-white font-bold text-[15px] py-3.5 rounded-xl mt-4 shadow-xl shadow-[#8b6f5a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Verify Account'}
        </button>
      </form>

      <p className="text-center text-[13px] font-bold text-gray-500 mt-8">
        Didn't receive the code? 
        <button type="button" onClick={handleResendOtp} className="text-[#8b6f5a] hover:underline ml-1">
          Click to resend
        </button>
      </p>
    </div>
  );
};

// ==========================================
// 2. AUTH DETAILS FORM COMPONENT
// ==========================================
const AuthDetailsForm = ({ 
  activeTab, setActiveTab, formData, handleChange, 
  handleInitialSubmit, handleGoogleSuccess, isLoading, 
  passStrength, setError 
}) => {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#3b2a23] tracking-tight mb-2">
          {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-[15px] text-[#8b6f5a] font-medium">
          {activeTab === 'login' ? 'Access your workspace and B2B datasets.' : 'Start your 14-day free trial. No credit card required.'}
        </p>
      </div>

      <div className="bg-white p-1 rounded-xl border border-[#e5ded5] flex mb-8 shadow-sm">
        <button 
          type="button" 
          onClick={() => { setActiveTab('login'); setError(''); }} 
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'login' ? 'bg-[#3b2a23] text-white shadow-sm' : 'text-[#8b6f5a] hover:text-[#3b2a23]'}`}
        >
          Log In
        </button>
        <button 
          type="button" 
          onClick={() => { setActiveTab('register'); setError(''); }} 
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'register' ? 'bg-[#3b2a23] text-white shadow-sm' : 'text-[#8b6f5a] hover:text-[#3b2a23]'}`}
        >
          Sign Up
        </button>
      </div>

      <form id="auth-form" onSubmit={handleInitialSubmit} noValidate className="flex flex-col gap-5">
        {activeTab === 'register' && (
          <>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex flex-col gap-1.5 flex-1 group">
                <label className="text-[12px] font-bold text-[#3b2a23] group-focus-within:text-[#8b6f5a] transition-colors">First Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8b6f5a] transition-colors" />
                  <input name="firstName" type="text" value={formData.firstName} onChange={handleChange} required className="w-full bg-white border border-[#e5ded5] pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-4 focus:ring-[#8b6f5a]/10 transition-all shadow-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 group">
                <label className="text-[12px] font-bold text-[#3b2a23] group-focus-within:text-[#8b6f5a] transition-colors">Last Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8b6f5a] transition-colors" />
                  <input name="lastName" type="text" value={formData.lastName} onChange={handleChange} required className="w-full bg-white border border-[#e5ded5] pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-4 focus:ring-[#8b6f5a]/10 transition-all shadow-sm" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 group">
              <label className="text-[12px] font-bold text-[#3b2a23] group-focus-within:text-[#8b6f5a] transition-colors">Company Name</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8b6f5a] transition-colors" />
                <input name="companyName" type="text" value={formData.companyName} onChange={handleChange} required className="w-full bg-white border border-[#e5ded5] pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-4 focus:ring-[#8b6f5a]/10 transition-all shadow-sm" />
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5 group">
          <label className="text-[12px] font-bold text-[#3b2a23] group-focus-within:text-[#8b6f5a] transition-colors">Work Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8b6f5a] transition-colors" />
            <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="name@company.com" className="w-full bg-white border border-[#e5ded5] pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-4 focus:ring-[#8b6f5a]/10 transition-all shadow-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 group">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-bold text-[#3b2a23] group-focus-within:text-[#8b6f5a] transition-colors">Password</label>
            {activeTab === 'login' && <button type="button" className="text-[12px] font-bold text-[#8b6f5a] hover:text-[#3b2a23] transition-colors">Forgot password?</button>}
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8b6f5a] transition-colors" />
            <input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="w-full bg-white border border-[#e5ded5] pl-10 pr-4 py-3 rounded-xl text-[14px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-4 focus:ring-[#8b6f5a]/10 transition-all shadow-sm" />
          </div>
          
          {activeTab === 'register' && formData.password.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex gap-1.5 h-1.5 w-full">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${
                    i < passStrength 
                      ? passStrength < 2 ? 'bg-red-400' 
                      : passStrength < 3 ? 'bg-amber-400' 
                      : 'bg-emerald-500' 
                      : 'bg-[#e5ded5]'
                  }`} />
                ))}
              </div>
              <p className={`text-[11px] font-bold ${passStrength < 2 ? 'text-red-500' : passStrength < 3 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {passStrength < 2 ? 'Weak' : passStrength < 3 ? 'Good' : 'Strong'} password
              </p>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          form="auth-form"
          aria-label="Submit authentication form"
          disabled={isLoading} 
          className="w-full bg-[#8b6f5a] hover:bg-[#6c5544] text-white font-bold text-[15px] py-3.5 rounded-xl mt-2 shadow-xl shadow-[#8b6f5a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:bg-[#8b6f5a]"
        >
          {isLoading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <>{activeTab === 'login' ? 'Log In' : 'Create Free Account'} <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="relative mt-8 mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e5ded5]"></div>
        </div>
        <div className="relative flex justify-center text-[12px] font-bold">
          <span className="bg-[#f5efe6] px-4 text-[#8b6f5a] tracking-widest uppercase">Or Continue With</span>
        </div>
      </div>

      <div className="flex justify-center w-full rounded-xl overflow-hidden shadow-sm border border-[#e5ded5] hover:border-[#8b6f5a] transition-colors bg-white">
        <GoogleLogin 
          onSuccess={handleGoogleSuccess} 
          onError={() => setError('Google Login Failed. Please try again.')}
          useOneTap={false}
          theme="outline"
          size="large"
          text="continue_with"
          width="100%"
        />
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN AUTH COMPONENT LOGIC
// ==========================================
const AuthComponent = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('slipz_token');
    if (token) navigate('/dashboard'); 
  }, [navigate]);

  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingToken, setPendingToken] = useState(''); 
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', companyName: '', email: '', password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(''); 
    if (successMsg) setSuccessMsg('');
  };

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 7) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; 
  };
  const passStrength = calculateStrength(formData.password);

  const handleAuthSuccess = (token, user) => {
    localStorage.setItem('slipz_token', token);
    if (user) {
      localStorage.setItem('slipz_user', JSON.stringify(user)); 
    }
    navigate('/dashboard');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

const handleInitialSubmit = async (e) => {
    e.preventDefault(); 
    console.log("🚀 FORM SUBMIT TRIGGERED!"); // <--- This will now print!
    console.log("Tab:", activeTab, "Data:", formData);

    // --- MANUAL VALIDATION (Bypasses silent browser blocking) ---
    if (!formData.email || !formData.password) {
      return setError('Email and password are required.');
    }
    if (activeTab === 'register' && (!formData.firstName || !formData.lastName || !formData.companyName)) {
      return setError('All fields are required to create an account.');
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      if (activeTab === 'register') {
        const res = await axios.post(`${API_URL}/auth/register`, formData);
        setPendingToken(res.data.pendingToken); 
        setIsVerifying(true);
      } else {
        const res = await axios.post(`${API_URL}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        handleAuthSuccess(res.data.token, res.data.user);
      }
    } catch (err) {
      console.error("🔴 API ERROR:", err);
      if (err.response?.data?.unverified) {
        setIsVerifying(true);
      } else if (err.response?.data?.details) {
        const fieldErrors = err.response.data.details;
        const firstErrorField = Object.keys(fieldErrors)[0];
        setError(fieldErrors[firstErrorField][0]); 
      } else {
        setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const code = otp.join('');
    
    try {
      const res = await axios.post(`${API_URL}/auth/verify`, {
        pendingToken,
        code
      });
      handleAuthSuccess(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/google`, {
        token: credentialResponse.credential
      });
      handleAuthSuccess(res.data.token, res.data.user);
    } catch {
      setError('Google Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f5efe6] font-sans selection:bg-[#8b6f5a] selection:text-white">
      
      {/* ========================================== */}
      {/* LEFT PANEL (Clean & Minimal) */}
      {/* ========================================== */}
      <div className="hidden lg:flex flex-col w-full lg:w-[45%] xl:w-[45%] bg-[#3b2a23] relative overflow-hidden rounded-r-[4rem] shadow-[20px_0_50px_rgba(59,42,35,0.15)] z-10">
        
        {/* Soft Background Texture Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-[#8b6f5a]/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo */}
        <div className="absolute top-10 left-12 z-20 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
          <Asterisk size={24} strokeWidth={3} className="text-[#d6c9b8]" />
          <span className="text-2xl font-bold text-white tracking-tight">SlipZMarket</span>
        </div>

        {/* Minimal Content */}
        <div className="relative z-20 my-auto px-12 xl:px-20 flex flex-col gap-12">
          <h1 className="text-4xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight">
            Data that <br/><span className="text-[#8b6f5a]">closes deals.</span>
          </h1>
          
          <div className="flex gap-4 animate-fade-in-up">
            <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <Database className="text-[#8b6f5a] mb-3" size={20} />
              <div className="text-2xl font-black text-white mb-1">50M+</div>
              <div className="text-[#d6c9b8] text-sm font-medium">Verified B2B Contacts</div>
            </div>
            
            <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <Target className="text-[#8b6f5a] mb-3" size={20} />
              <div className="text-2xl font-black text-white mb-1">99%</div>
              <div className="text-[#d6c9b8] text-sm font-medium">Data Accuracy Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[55%] xl:w-[55%] flex min-h-screen flex-col justify-center items-center p-6 pt-10 sm:p-10 relative overflow-y-auto">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Asterisk size={20} strokeWidth={3} className="text-[#8b6f5a]" />
          <span className="text-xl font-bold text-[#3b2a23] tracking-tight">SlipZMarket</span>
        </div>

        <div className="w-full max-w-[420px] sm:max-w-[450px] animate-fade-in mt-6 lg:mt-0">
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in-up shadow-sm">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-[13px] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in-up shadow-sm">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p className="text-[13px] font-medium leading-relaxed">{successMsg}</p>
            </div>
          )}

          {isVerifying ? (
            <VerificationForm 
              formData={formData}
              otp={otp}
              setOtp={setOtp}
              otpRefs={otpRefs}
              handleVerifyOtp={handleVerifyOtp}
              isLoading={isLoading}
              setIsVerifying={setIsVerifying}
              setError={setError}
              showSuccess={showSuccess}
              pendingToken={pendingToken}
              setPendingToken={setPendingToken}
            />
          ) : (
            <AuthDetailsForm 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              formData={formData}
              handleChange={handleChange}
              handleInitialSubmit={handleInitialSubmit}
              handleGoogleSuccess={handleGoogleSuccess}
              isLoading={isLoading}
              passStrength={passStrength}
              setError={setError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. EXPORT WRAPPED COMPONENT
// ==========================================
// ⚠️ THIS IS CRITICAL TO PREVENT THE UI FROM CRASHING
const Auth = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthComponent />
    </GoogleOAuthProvider>
  );
};

export default Auth;