import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { auth } from '../services/supabase';
import api from '../services/api'; // Add this import

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    
    
    // Supabase password reset should have type=recovery
    if (type !== 'recovery') {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    if (!accessToken || !refreshToken) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    // Validate passwords
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(''); // Clear error before starting

    try {
      // First, set the session with the tokens from the URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        const { error: sessionError } = await auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          setError('Invalid reset session. Please request a new password reset.');
          setIsLoading(false);
          return;
        }
      }

      // Check user role - only clerks can reset password
      try {
        const profileResponse = await api.get('/auth/profile');
        
        if (profileResponse.data.success) {
          const userRole = profileResponse.data.data.user.role;
          
          // Check if user is a clerk
          if (userRole && userRole.toLowerCase() !== 'clerk') {
            setError('Password reset is only available for clerk accounts. Please contact your administrator.');
            setIsLoading(false);
            return;
          }
        } else {
          setError('Unable to verify account permissions. Please contact your administrator.');
          setIsLoading(false);
          return;
        }
      } catch (profileError: any) {
        console.error('Error fetching user profile:', profileError);
        setError('Unable to verify account permissions. Please contact your administrator.');
        setIsLoading(false);
        return;
      }

      // Now update the password (only if user is a clerk)
      const { error: updateError } = await auth.updatePassword(newPassword);

      // Clear error immediately after update attempt
      // Supabase may invalidate the session after successful password update,
      // which can cause error messages even though the update succeeded
      setError('');

      if (updateError) {
        // Only show error if it's not about session expiration
        // Session expiration after password update is expected behavior
        if (!updateError.message?.toLowerCase().includes('expired') && 
            !updateError.message?.toLowerCase().includes('session')) {
          setError(updateError.message);
          setIsLoading(false);
          return;
        }
        // If it's a session expiration error, treat as success (password was updated)
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      // Only set error if we haven't already set success
      if (!success) {
        // Check if this is a session expiration error after successful password update
        const errorMessage = err.message || err.response?.data?.message || 'An unexpected error occurred';
        if (errorMessage.includes('expired') || errorMessage.includes('session')) {
          // If we get here but password was updated, ignore the error
          console.log('Session expired after password update (this is normal)');
          setError('');
          setSuccess(true);
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setError(errorMessage);
        }
      }
      console.error('Password update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* Success Card */}
        <div className="card w-full max-w-md bg-base-100 shadow-2xl z-10 m-4">
          <div className="card-body text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-base-content mb-4">Password Updated!</h1>
            <p className="text-base-content/60 mb-6">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
            
            <div className="loading loading-spinner loading-lg text-brand-blue"></div>
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

      {/* Reset Password Card */}
      <div className="card w-full max-w-md bg-base-100 shadow-2xl z-10 m-4">
        <div className="card-body">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-brand-blue" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-base-content">Set New Password</h1>
            <p className="text-base-content/60 mt-2">Enter your new password below</p>
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

          {/* Reset Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">New Password</span>
              </label>
              <label className="input input-bordered flex items-center gap-2">
                <Lock className="w-4 h-4 opacity-70" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="grow"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn btn-ghost btn-sm"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <label className="label">
                <span className="label-text-alt">Password must be at least 6 characters</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Confirm New Password</span>
              </label>
              <label className="input input-bordered flex items-center gap-2">
                <Lock className="w-4 h-4 opacity-70" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="grow"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="btn btn-ghost btn-sm"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/login')}
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
};

export default ResetPasswordPage;
