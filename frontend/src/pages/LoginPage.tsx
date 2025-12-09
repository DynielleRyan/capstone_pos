import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { auth } from '../services/supabase';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getDeviceIdentifier } from '../utils/deviceFingerprint';

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
  
  // Contact administrator modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const adminEmail = 'jemseyamonsot@gmail.com';
  
  const navigate = useNavigate();


  // Note: Session check is handled by PublicRoute component in App.tsx
  // No need to check here to avoid redirect loops

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await auth.signIn(email, password, rememberMe);

      if (error) {
        // Industry standard: User-friendly error messages
        const errorMessage = error.message.includes('Invalid login credentials') 
          ? 'Invalid email or password. Please check your credentials and try again.'
          : error.message.includes('Email not confirmed')
          ? 'Please verify your email address before logging in.'
          : error.message.includes('Too many requests')
          ? 'Too many login attempts. Please wait a few minutes and try again.'
          : 'Unable to sign in. Please check your credentials and try again.';
        
        setError(errorMessage);
        return;
      }

      if (data.user && data.session) {
        // Store session temporarily for API calls
        setTempSession(data.session);
        
        // Set sessionStorage flag FIRST to prevent redirects
        sessionStorage.setItem('otpVerification', 'true');
        
        // Temporarily set session for API calls
        await auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        // Get device identifier for device-based OTP verification
        const deviceInfo = getDeviceIdentifier();

        // Check if this is first-time login by calling backend
        try {
          const response = await api.post('/auth/check-first-login', {
            deviceFingerprintHash: deviceInfo.fingerprintHash,
            deviceId: deviceInfo.deviceId,
            deviceFingerprint: deviceInfo.fingerprint
          });
          
          if (response.data.success && response.data.data?.requiresOTP) {
            // First-time login - send OTP and show modal
            try {
              await api.post('/auth/send-otp', {}, {
                headers: {
                  Authorization: `Bearer ${data.session.access_token}`
                }
              });
              
              // Store session for OTP verification
              setTempSession(data.session);
              setIsLoading(false);
              setShowOTPModal(true);
              
              return;
            } catch (otpError: any) {
              const errorMessage = otpError.response?.data?.message || 
                'Unable to send verification code. Please try again.';
              setError(errorMessage);
              setTempSession(null);
              sessionStorage.removeItem('otpVerification');
              await auth.signOut();
            }
          } else {
            // Clear OTP flag since we're proceeding normally
            sessionStorage.removeItem('otpVerification');
            // Normal login - navigate to dashboard
            navigate('/dashboard');
          }
        } catch (checkError: any) {
          // If check fails, proceed with normal login (fail gracefully)
          sessionStorage.removeItem('otpVerification');
        navigate('/dashboard');
        }
      }
    } catch (err: any) {
      // Industry standard: User-friendly error messages
      const errorMessage = err.message?.includes('Network') || err.message?.includes('fetch')
        ? 'Network error. Please check your internet connection and try again.'
        : err.message || 'An unexpected error occurred. Please try again.';
      
      setError(errorMessage);
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
      // Get device identifier for device-based OTP verification
      const deviceInfo = getDeviceIdentifier();

      // Use the token directly from tempSession - no need to set session again
      // The backend will validate this token
      const response = await api.post('/auth/verify-otp', { 
        otp,
        deviceFingerprintHash: deviceInfo.fingerprintHash,
        deviceId: deviceInfo.deviceId,
        deviceFingerprint: deviceInfo.fingerprint
      }, {
        headers: {
          Authorization: `Bearer ${tempSession.access_token}`
        }
      });

      if (response.data.success) {
        // OTP verified - set session and navigate
        // The session is already set from login, just need to ensure it's active
        await auth.setSession({
          access_token: tempSession.access_token,
          refresh_token: tempSession.refresh_token
        });
        
        // Clear OTP flag and navigate
        sessionStorage.removeItem('otpVerification');
        setShowOTPModal(false);
        setOtp('');
        setTempSession(null);
        toast.success('Verification successful!', { position: 'top-center' });
        navigate('/dashboard');
      } else {
        // Industry standard: User-friendly error messages
        const errorMessage = response.data.message?.includes('Invalid') || response.data.message?.includes('invalid')
          ? 'Invalid verification code. Please check the code and try again.'
          : response.data.message || 'Verification failed. Please try again.';
        
        setOtpError(errorMessage);
      }
    } catch (err: any) {
      // Industry standard: User-friendly error messages
      let errorMessage = 'Unable to verify code. Please try again.';
      
      if (err.response?.status === 401) {
        if (err.response?.data?.message?.includes('token') || err.response?.data?.message?.includes('session')) {
          errorMessage = 'Your session has expired. Please log in again.';
        setTempSession(null);
        await auth.signOut();
        } else if (err.response?.data?.message?.includes('Invalid') || err.response?.data?.message?.includes('invalid')) {
          errorMessage = 'Invalid verification code. Please check the code and try again.';
        } else {
          errorMessage = err.response?.data?.message || errorMessage;
        }
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Invalid request. Please try again.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setOtpError(errorMessage);
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
      // Use token directly from tempSession - no need to set session again
      const response = await api.post('/auth/send-otp', {}, {
        headers: {
          Authorization: `Bearer ${tempSession.access_token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Verification code has been resent to your email.', { position: 'top-center' });
        setOtp(''); // Clear current OTP input
      } else {
        const errorMessage = response.data.message?.includes('rate limit') || response.data.message?.includes('too many')
          ? 'Please wait a few minutes before requesting another code.'
          : response.data.message || 'Unable to resend code. Please try again.';
        
        setOtpError(errorMessage);
      }
    } catch (err: any) {
      // Industry standard: User-friendly error messages
      let errorMessage = 'Unable to resend verification code. Please try again.';
      
      if (err.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a few minutes before requesting another code.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        setTempSession(null);
        await auth.signOut();
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setOtpError(errorMessage);
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
        // Industry standard: User-friendly error messages
        const errorMessage = error.message?.includes('email')
          ? 'Please enter a valid email address.'
          : error.message?.includes('not found')
          ? 'No account found with this email address.'
          : error.message || 'Unable to send password reset email. Please try again.';
        
        setError(errorMessage);
        return;
      }

      setResetEmailSent(true);
    } catch (err: any) {
      // Industry standard: User-friendly error messages
      const errorMessage = err.message?.includes('Network') || err.message?.includes('fetch')
        ? 'Network error. Please check your internet connection and try again.'
        : err.message || 'An unexpected error occurred. Please try again.';
      
      setError(errorMessage);
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
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="link font-medium"
                style={{ color: '#145DA0' }}
              >
                Contact Administrator
              </button>
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

      {/* Contact Administrator Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ zIndex: 9999 }}>
          <div className="card w-full max-w-md bg-base-100 shadow-2xl m-4">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-2">Contact Administrator</h2>
              <p className="text-base-content/70 mb-4">
                Please email this person for account concerns!
              </p>

              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Administrator Email:</p>
                    <div className="flex items-center gap-2">
                      <code 
                        className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded border-2 border-blue-300 select-all"
                        style={{ 
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          borderColor: '#93C5FD',
                          userSelect: 'all'
                        }}
                      >
                        {adminEmail}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(adminEmail);
                        setEmailCopied(true);
                        toast.success('Email copied to clipboard!', {
                          position: 'top-center',
                          duration: 2000,
                        });
                        setTimeout(() => setEmailCopied(false), 2000);
                      } catch (err) {
                        toast.error('Failed to copy email', {
                          position: 'top-center',
                          duration: 2000,
                        });
                      }
                    }}
                    className="btn btn-sm btn-ghost flex-shrink-0"
                    title="Copy email"
                  >
                    {emailCopied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowContactModal(false);
                    setEmailCopied(false);
                  }}
                >
                  Close
                </button>
                <a
                  href={`mailto:${adminEmail}?subject=Account Request&body=Hello,%0D%0A%0D%0AI would like to request an account for the Pharmacy Point of Sale System.%0D%0A%0D%0AThank you.`}
                  className="btn text-white"
                  style={{ backgroundColor: '#145DA0' }}
                  onClick={() => setShowContactModal(false)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Open Email Client
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

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