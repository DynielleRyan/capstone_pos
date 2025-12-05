import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { auth, supabase } from '../services/supabase';
import api from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // OTP states for first-time login
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [tempSession, setTempSession] = useState<any>(null);
  
  const navigate = useNavigate();

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('OTP Modal state changed:', showOTPModal);
    if (showOTPModal) {
      console.log('OTP Modal should be visible now. showOTPModal =', showOTPModal);
    }
  }, [showOTPModal]);

  // Note: Session check is handled by PublicRoute component in App.tsx
  // No need to check here to avoid redirect loops

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('Attempting login with:', { email, password: '***' });
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Anon Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

    try {
      const { data, error } = await auth.signIn(email, password, rememberMe);

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user && data.session) {
        // Store session temporarily (don't set in Supabase yet to prevent auto-redirect)
        setTempSession(data.session);
        
        // Check if this is first-time login by calling backend
        // Temporarily set session for API calls, but we'll handle redirect manually
        await auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        // Check if this is first-time login by calling backend
        try {
          console.log('Checking first login status...');
          const response = await api.post('/auth/check-first-login');
          console.log('First login check response:', response.data);
          
          if (response.data.success && response.data.data?.requiresOTP) {
            console.log('First-time login detected - sending OTP...');
            // First-time login - send OTP and show modal
            try {
              const otpResponse = await api.post('/auth/send-otp');
              console.log('OTP sent response:', otpResponse.data);
              
              // Store session and show modal BEFORE signing out
              setTempSession(data.session);
              setIsLoading(false);
              
              // Set flag in sessionStorage to prevent PublicRoute redirect
              sessionStorage.setItem('otpVerification', 'true');
              
              // Set modal to show
              console.log('Setting OTP modal to show...');
              setShowOTPModal(true);
              setIsLoading(false);
              console.log('OTP modal state set. showOTPModal should be true now.');
              
              return;
            } catch (otpError: any) {
              console.error('Error sending OTP:', otpError);
              setError('Failed to send verification code. Please try again.');
              setTempSession(null);
              await auth.signOut();
            }
          } else {
            console.log('Not a first-time login, proceeding normally');
            // Normal login - navigate to dashboard
            navigate('/dashboard');
          }
        } catch (checkError: any) {
          console.error('Error checking first login:', checkError);
          console.error('Error details:', {
            message: checkError.message,
            response: checkError.response?.data,
            status: checkError.response?.status
          });
          // If check fails, proceed with normal login
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    if (!tempSession) {
      setOtpError('Session expired. Please log in again.');
      return;
    }

    setIsVerifyingOTP(true);
    setOtpError('');

    try {
      // Set session temporarily for API call
      await auth.setSession({
        access_token: tempSession.access_token,
        refresh_token: tempSession.refresh_token
      });

      const response = await api.post('/auth/verify-otp', { otp });

      if (response.data.success) {
        // OTP verified - clear OTP flag and navigate
        sessionStorage.removeItem('otpVerification');
        setShowOTPModal(false);
        setOtp('');
        setTempSession(null);
        navigate('/dashboard');
      } else {
        setOtpError(response.data.message || 'Invalid verification code. Please try again.');
        // Sign out again if verification failed
        await auth.signOut();
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Failed to verify code. Please try again.');
      console.error('OTP verification error:', err);
      // Sign out on error
      await auth.signOut();
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (!tempSession) {
      setOtpError('Session expired. Please log in again.');
      return;
    }

    setOtpError('');
    setIsVerifyingOTP(true);
    try {
      // Set session temporarily for API call
      await auth.setSession({
        access_token: tempSession.access_token,
        refresh_token: tempSession.refresh_token
      });

      const response = await api.post('/auth/send-otp');
      
      if (response.data.success) {
        alert('Verification code has been resent to your email.');
        setOtp(''); // Clear current OTP input
      } else {
        setOtpError(response.data.message || 'Failed to resend code. Please try again.');
      }
      
      // Sign out again to prevent redirect
      await auth.signOut();
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Failed to resend code. Please try again.');
      console.error('Resend OTP error:', err);
      await auth.signOut();
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await auth.resetPassword(email);

      if (error) {
        setError(error.message);
        return;
      }

      setResetEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* Password Reset Card */}
        <div className="card w-full max-w-md bg-base-100 shadow-2xl z-10 m-4">
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-brand-blue" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-base-content">Reset Password</h1>
              <p className="text-base-content/60 mt-2">Enter your email to receive reset instructions</p>
            </div>

            {/* Success Message */}
            {resetEmailSent && (
              <div className="alert alert-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Password reset email sent! Check your inbox.</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Password Reset Form */}
            {!resetEmailSent && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email Address</span>
                  </label>
                  <label className="input input-bordered flex items-center gap-2">
                    <Mail className="w-4 h-4 opacity-70" />
                    <input
                      type="email"
                      className="grow"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="form-control mt-6">
                  <button
                    type="submit"
                    className="btn w-full text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#145DA0' }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Reset Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Back to Login */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setError('');
                }}
                className="link font-medium"
                style={{ color: '#145DA0' }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="card w-full max-w-md bg-base-100 shadow-2xl z-10 m-4">
        <div className="card-body">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-brand-blue" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-base-content">Welcome Back</h1>
            <p className="text-base-content/60 mt-2">Jambo's Pharmacy PoS System</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email Address</span>
              </label>
              <label className="input input-bordered flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-70" />
                <input
                  type="email"
                  className="grow"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <label className="input input-bordered flex items-center gap-2">
                <Lock className="w-4 h-4 opacity-70" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="grow"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn btn-ghost btn-sm"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <div className="flex items-center justify-between">
                <label className="label cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="checkbox checkbox-sm"
                    style={{ accentColor: '#145DA0' }}
                  />
                  <span className="label-text ml-2">Remember me for 30 days</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="label-text-alt link link-hover"
                  style={{ color: '#145DA0' }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn w-full text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#145DA0' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="divider text-base-content/40">OR</div>

          {/* Additional Options */}
          <div className="text-center">
            <p className="text-sm text-base-content/60">
              Don't have an account?{' '}
              <a href="#" className="link font-medium" style={{ color: '#145DA0' }}>
                Contact Administrator
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-center w-full z-10">
        <p className="text-sm text-base-content/60">
          Pharmacy Point of Sale System © 2025
        </p>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ zIndex: 9999 }}>
          <div className="card w-full max-w-md bg-base-100 shadow-2xl m-4">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-2">First-Time Login Verification</h2>
              <p className="text-base-content/70 mb-4">
                We've sent a verification code to <strong>{email}</strong>. Please enter the code below to complete your login.
              </p>

              {otpError && (
                <div className="alert alert-error mb-4">
                  <span>{otpError}</span>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Verification Code</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    setOtpError('');
                  }}
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    sessionStorage.removeItem('otpVerification');
                    setShowOTPModal(false);
                    setOtp('');
                    setOtpError('');
                    setTempSession(null);
                    auth.signOut();
                  }}
                  disabled={isVerifyingOTP}
                >
                  Cancel
                </button>
                <button
                  className="btn text-white"
                  style={{ backgroundColor: '#145DA0' }}
                  onClick={handleVerifyOTP}
                  disabled={isVerifyingOTP || otp.length !== 6}
                >
                  {isVerifyingOTP ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>

              <div className="text-center mt-4">
                <button
                  className="link text-sm"
                  style={{ color: '#145DA0' }}
                  onClick={handleResendOTP}
                  disabled={isVerifyingOTP}
                >
                  Resend Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;