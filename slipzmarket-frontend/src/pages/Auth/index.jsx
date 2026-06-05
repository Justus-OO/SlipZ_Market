import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { GoogleLogin } from '@react-oauth/google';
import { 
  Asterisk, ArrowRight, Mail, Lock, 
  User as UserIcon, Building2, 
  ShieldCheck, CheckCircle2, Loader2, Sparkles,
  Fingerprint, Link as LinkIcon, ArrowLeft, AlertCircle
} from 'lucide-react';

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
      setOtp(['', '', '', '', '', '']); // Clear inputs
      otpRefs.current[0].focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="flex flex-col animate-fade-in-right">
      <button 
        onClick={() => setIsVerifying(false)}
        className="w-fit flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>
      
      <div className="w-14 h-14 bg-surface border border-theme rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <Mail size={24} className="text-muted" />
      </div>
      
      <h2 className="text-3xl font-black text-primary tracking-tight mb-2">Check your email</h2>
      <p className="text-[15px] text-muted font-medium mb-8 leading-relaxed">
        We've sent a 6-digit secure code to <br/>
        <span className="font-bold text-primary">{formData.email}</span>
      </p>

      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
        <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (otpRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-primary bg-surface border border-theme rounded-xl outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm"
            />
          ))}
        </div>

        <button 
          type="submit" 
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full bg-accent hover:bg-accent text-surface font-bold text-[15px] py-3.5 rounded-xl mt-4 shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Verify Account'}
        </button>
      </form>

      <p className="text-center text-[13px] font-bold text-muted mt-8">
        Didn't receive the code? 
        <button type="button" onClick={handleResendOtp} className="text-primary hover:underline ml-1">
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
  activeTab, setActiveTab, authMethod, setAuthMethod, 
  formData, handleChange, handleInitialSubmit, 
  handleGoogleSuccess, isLoading, passStrength, setError 
}) => {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-primary tracking-tight mb-2">
          {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-[15px] text-muted font-medium">
          {activeTab === 'login' ? 'Access your workspace and B2B datasets.' : 'Start your 14-day free trial. No credit card required.'}
        </p>
      </div>

      {/* Auth Toggle Tabs */}
      <div className="bg-surface p-1 rounded-xl border border-theme flex mb-8 shadow-sm">
        <button 
          type="button" 
          onClick={() => { setActiveTab('login'); setAuthMethod('password'); setError(''); }} 
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'login' ? 'bg-primary text-surface shadow-sm' : 'text-muted hover:text-primary'}`}
        >
          Log In
        </button>
        <button 
          type="button" 
          onClick={() => { setActiveTab('register'); setAuthMethod('password'); setError(''); }} 
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'register' ? 'bg-primary text-surface shadow-sm' : 'text-muted hover:text-primary'}`}
        >
          Sign Up
        </button>
      </div>

      {/* Login Methods Sub-nav */}
      {activeTab === 'login' && (
        <div className="flex gap-2 mb-8">
          {[
            { id: 'password', icon: Lock, label: 'Password' },
            { id: 'magic', icon: LinkIcon, label: 'Magic Link' },
            { id: 'sso', icon: ShieldCheck, label: 'SSO' }
          ].map((method) => (
            <button 
              key={method.id}
              type="button" 
              onClick={() => setAuthMethod(method.id)} 
              className={`flex-1 py-2 rounded-lg border text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all ${authMethod === method.id ? 'bg-surface border-accent text-primary shadow-sm' : 'bg-transparent border-transparent text-muted hover:bg-surface/50'}`}
            >
                <method.icon size={14} className={authMethod === method.id ? 'text-accent' : 'text-muted/70'} /> 
              {method.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleInitialSubmit} className="flex flex-col gap-5">
        {activeTab === 'register' && (
          <>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1 group">
                <label className="text-[12px] font-bold text-primary group-focus-within:text-accent transition-colors">First Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 group-focus-within:text-accent transition-colors" />
                  <input name="firstName" type="text" value={formData.firstName} onChange={handleChange} required className="w-full bg-surface border border-theme pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-primary outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 group">
                <label className="text-[12px] font-bold text-primary group-focus-within:text-accent transition-colors">Last Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 group-focus-within:text-accent transition-colors" />
                  <input name="lastName" type="text" value={formData.lastName} onChange={handleChange} required className="w-full bg-surface border border-theme pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-primary outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 group">
              <label className="text-[12px] font-bold text-primary group-focus-within:text-accent transition-colors">Company Name</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 group-focus-within:text-accent transition-colors" />
                <input name="companyName" type="text" value={formData.companyName} onChange={handleChange} required className="w-full bg-surface border border-theme pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-primary outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm" />
              </div>
            </div>
          </>
        )}

        {authMethod !== 'sso' && (
          <>
            <div className="flex flex-col gap-1.5 group">
              <label className="text-[12px] font-bold text-primary group-focus-within:text-accent transition-colors">Work Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 group-focus-within:text-accent transition-colors" />
                <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="name@company.com" className="w-full bg-surface border border-theme pl-10 pr-4 py-3 rounded-xl text-[14px] font-medium text-primary outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm" />
              </div>
            </div>

            {authMethod === 'password' && (
              <div className="flex flex-col gap-1.5 group">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-primary group-focus-within:text-accent transition-colors">Password</label>
                  {activeTab === 'login' && <button type="button" className="text-[12px] font-bold text-[#8b6f5a] hover:text-[#3b2a23] transition-colors">Forgot password?</button>}
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 group-focus-within:text-accent transition-colors" />
                  <input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="w-full bg-surface border border-theme pl-10 pr-4 py-3 rounded-xl text-[14px] font-mono text-primary outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm" />
                </div>
                
                {/* Password Strength Indicator */}
                {activeTab === 'register' && formData.password.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex gap-1.5 h-1.5 w-full">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${
                          i < passStrength 
                            ? passStrength < 2 ? 'bg-red-400' 
                            : passStrength < 3 ? 'bg-amber-400' 
                            : 'bg-emerald-500' 
                            : 'bg-[#d6c9b8]/50'
                        }`} />
                      ))}
                    </div>
                    <p className={`text-[11px] font-bold ${passStrength < 2 ? 'text-red-500' : passStrength < 3 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {passStrength < 2 ? 'Weak' : passStrength < 3 ? 'Good' : 'Strong'} password
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {authMethod === 'sso' ? (
          <div className="mt-2 flex flex-col gap-4 animate-fade-in">
            <div className="bg-[#faf6f0] border border-[#d6c9b8] rounded-xl p-4 flex items-start gap-3">
              <Fingerprint size={20} className="text-[#8b6f5a] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#3b2a23] font-medium leading-relaxed">
                Securely authenticate using your organizational workspace identity provider.
              </p>
            </div>
            <div className="flex justify-center w-full mt-2 rounded-xl overflow-hidden shadow-sm border border-[#d6c9b8]">
              <GoogleLogin 
                onSuccess={handleGoogleSuccess} 
                onError={() => setError('Google Login Failed')}
                useOneTap={false}
              />
            </div>
          </div>
        ) : (
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-[#8b6f5a] hover:bg-[#6c5544] text-white font-bold text-[15px] py-3.5 rounded-xl mt-4 shadow-xl shadow-[#8b6f5a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:bg-[#8b6f5a]"
          >
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <>{activeTab === 'login' ? authMethod === 'magic' ? 'Send Magic Link' : 'Log In' : 'Create Free Account'} <ArrowRight size={18} /></>}
          </button>
        )}
      </form>
    </div>
  );
};

// ==========================================
// 3. MAIN PARENT AUTH COMPONENT
// ==========================================
const Auth = () => {
  const navigate = useNavigate();
  
  // --- AUTH GUARD: Redirect if already logged in ---
  useEffect(() => {
    const token = localStorage.getItem('slipz_token');
    if (token) {
      navigate('/dashboard'); // Change this if your main protected route is different
    }
  }, [navigate]);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('login');
  const [authMethod, setAuthMethod] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingToken, setPendingToken] = useState(''); // State for the two-step verification token
  
  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Unified Form State
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

  // --- API HANDLERS ---
  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      if (activeTab === 'register') {
        const res = await axios.post(`${API_URL}/auth/register`, formData);
        setPendingToken(res.data.pendingToken); // Save token for Step 2
        setIsVerifying(true);
      } else if (activeTab === 'login' && authMethod === 'password') {
        const res = await axios.post(`${API_URL}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        handleAuthSuccess(res.data.token, res.data.user);
      } else if (authMethod === 'magic') {
        setError('Magic links are currently in beta. Please use password or SSO.');
      }
    } catch (err) {
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
        pendingToken, // Send the token instead of the email
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
    } catch (err) {
      setError('Google Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f5efe6] font-sans selection:bg-[#8b6f5a] selection:text-white">
      
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col w-[45%] xl:w-[40%] bg-[#3b2a23] relative overflow-hidden rounded-r-[5rem] shadow-[20px_0_50px_rgba(59,42,35,0.15)] z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-gradient-to-tl from-[#8b6f5a]/40 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="absolute top-10 left-12 z-20 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
          <Asterisk size={32} strokeWidth={3} className="text-[#d6c9b8]" />
          <span className="text-2xl font-bold text-white tracking-tight">SlipZMarket</span>
        </div>

        <div className="relative z-20 my-auto px-12 xl:px-16 flex flex-col gap-10">
          <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight">
            Data that <br/><span className="text-[#8b6f5a]">closes deals.</span>
          </h1>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl relative animate-fade-in-up w-full max-w-[420px] hover:border-white/30 transition-all duration-500">
            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <Sparkles size={12} /> High Intent
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#8b6f5a] to-[#d6c9b8] p-[2px]">
                <div className="w-full h-full bg-[#3b2a23] rounded-full flex items-center justify-center">
                  <UserIcon size={24} className="text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold text-[18px]">Alexander Wright</h4>
                <p className="text-[#d6c9b8] text-[13px] flex items-center gap-1.5 mt-0.5">VP of Revenue @ Acme Corp</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-black/20 rounded-xl p-3.5 border border-white/10 flex justify-between items-center group hover:border-white/20 transition-colors">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Direct Dial</span>
                <span className="text-white font-mono text-[13px] group-hover:text-[#d6c9b8] transition-colors">+1 (415) 555-0198</span>
              </div>
              <div className="bg-black/20 rounded-xl p-3.5 border border-white/10 flex justify-between items-center group hover:border-white/20 transition-colors">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Work Email</span>
                <span className="text-white font-mono text-[13px] flex items-center gap-1.5 group-hover:text-[#d6c9b8] transition-colors">
                  alex.w@acme... <CheckCircle2 size={14} className="text-emerald-400"/>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-y-auto">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Asterisk size={28} strokeWidth={3} className="text-[#8b6f5a]" />
          <span className="text-xl font-bold text-[#3b2a23] tracking-tight">SlipZMarket</span>
        </div>

        <div className="w-full max-w-[440px] animate-fade-in mt-12 lg:mt-0">
          
          {/* ----- GLOBAL ERROR / SUCCESS DISPLAY ----- */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in-up">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-[13px] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in-up">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p className="text-[13px] font-medium leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* ----- DYNAMIC RENDER ----- */}
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
              authMethod={authMethod}
              setAuthMethod={setAuthMethod}
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

export default Auth;