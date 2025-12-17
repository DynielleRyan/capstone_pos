/**
 * ============================================================================
 * EMAIL SERVICE - SendGrid Integration
 * ============================================================================
 * 
 * This service handles sending emails via SendGrid, primarily used for OTP
 * (One-Time Password) delivery during first-time login verification.
 * 
 * SENDGRID SETUP:
 * - Requires SENDGRID_API_KEY environment variable
 * - API key format: SG.xxxxxxxxxxxxx (starts with "SG.")
 * - Sender email must be verified in SendGrid dashboard
 * - Free tier: 100 emails/day
 * 
 * FALLBACK BEHAVIOR:
 * If SendGrid is not configured, the OTP is logged to console (development only).
 * This allows development to continue without email service setup.
 */

import sgMail from '@sendgrid/mail';

/**
 * SendGrid API Key Configuration
 * 
 * Loads the API key from environment variables. The key is validated to ensure
 * it's not a placeholder value. SendGrid API keys always start with "SG." which
 * helps identify valid keys.
 * 
 * If the key is missing or invalid, the service will still function but emails
 * won't be sent (OTP will be logged to console instead).
 */
const sendGridApiKey = process.env.SENDGRID_API_KEY;

/**
 * Initialize SendGrid Client
 * 
 * Sets the API key for the SendGrid client. This must be done before sending
 * any emails. The initialization happens at module load time, so the client
 * is ready immediately when the service is imported.
 * 
 * If initialization fails, the service gracefully degrades to console logging
 * mode, allowing development to continue without email service.
 */
if (sendGridApiKey && sendGridApiKey !== 'SG.your_api_key_here') {
  try {
    sgMail.setApiKey(sendGridApiKey);
    console.log('✅ SendGrid initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing SendGrid:', error);
  }
} else {
  console.warn('⚠️  SendGrid API key not configured or using placeholder value');
}

interface SendOTPEmailParams {
  to: string;
  otp: string;
  userName?: string;
}

/**
 * Send OTP Verification Email
 * 
 * Sends a 6-digit OTP code to the user's email address for first-time login
 * verification. The email includes both HTML and plain text versions for
 * maximum compatibility across email clients.
 * 
 * EMAIL CONTENT:
 * - Professional HTML template with pharmacy branding
 * - Large, easy-to-read OTP code (32px font, letter-spacing for clarity)
 * - Clear expiration notice (10 minutes)
 * - Security warning if code wasn't requested
 * 
 * SECURITY FEATURES:
 * - OTP expires in 10 minutes (enforced server-side)
 * - One-time use (cleared after verification)
 * - Stored in user metadata (not in database, faster access)
 * 
 * FALLBACK BEHAVIOR:
 * If SendGrid is not configured or fails, the OTP is logged to console.
 * This allows development and testing without email service setup. In production,
 * this should be properly configured to ensure security.
 * 
 * Returns: true if email sent successfully, false otherwise
 */
export const sendOTPEmail = async ({ to, otp, userName }: SendOTPEmailParams): Promise<boolean> => {
  try {
    /**
     * Validate SendGrid Configuration
     * 
     * Checks if SendGrid is properly configured before attempting to send email.
     * Validates:
     * 1. API key exists
     * 2. API key is not placeholder value
     * 3. API key has correct format (starts with "SG.")
     * 
     * If validation fails, logs OTP to console and returns false. This allows
     * the application to continue functioning in development without email service.
     */
    if (!sendGridApiKey || sendGridApiKey === 'SG.your_api_key_here' || !sendGridApiKey.startsWith('SG.')) {
      console.warn('⚠️  SendGrid API key not configured or invalid. OTP will be logged to console.');
      console.log(`📧 OTP for ${to}: ${otp}`);
      return false;
    }
    
    /**
     * Verify SendGrid Client Initialization
     * 
     * Ensures the SendGrid client was properly initialized. If initialization
     * failed (e.g., invalid API key format), the client might not have the
     * send method available.
     */
    if (!sgMail || typeof sgMail.send !== 'function') {
      console.error('❌ SendGrid mail client not properly initialized');
      console.log(`📧 OTP for ${to} (fallback): ${otp}`);
      return false;
    }

    /**
     * Email Configuration
     * 
     * Sets the sender email and pharmacy name from environment variables,
     * with sensible defaults. The sender email must be verified in SendGrid
     * dashboard, otherwise emails will be rejected.
     */
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@jambospharmacy.com';
    const pharmacyName = process.env.PHARMACY_NAME || "Jambo's Pharmacy";

    const msg = {
      to,
      from: {
        email: fromEmail,
        name: pharmacyName
      },
      subject: 'First-Time Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #145DA0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${pharmacyName}</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Point of Sale System</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <h2 style="color: #145DA0; margin-top: 0;">First-Time Login Verification</h2>
            
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            
            <p>You are logging in for the first time. Please use the verification code below to complete your login:</p>
            
            <div style="background-color: white; border: 2px dashed #145DA0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #145DA0; margin: 0;">${otp}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this code, please ignore this email or contact your administrator.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; margin-bottom: 0;">
              This is an automated email from ${pharmacyName}. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${pharmacyName} - First-Time Login Verification
        
        Hello${userName ? ` ${userName}` : ''},
        
        You are logging in for the first time. Please use the verification code below to complete your login:
        
        Verification Code: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email or contact your administrator.
        
        ---
        This is an automated email from ${pharmacyName}. Please do not reply to this email.
      `
    };

    /**
     * Send Email via SendGrid
     * 
     * Sends the email using SendGrid's API. The message includes both HTML
     * and plain text versions for maximum email client compatibility.
     * 
     * The HTML version provides a professional, branded appearance, while
     * the text version ensures the OTP is readable even in basic email clients.
     */
    await sgMail.send(msg);
    console.log(`✅ OTP email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    /**
     * Error Handling and Diagnostics
     * 
     * SendGrid errors provide detailed information about what went wrong.
     * Common issues:
     * 
     * 401 Unauthorized: API key is invalid or missing
     * 403 Forbidden: API key lacks Mail Send permission, or sender email not verified
     * 400 Bad Request: Invalid email format or missing required fields
     * 
     * We log detailed error information to help diagnose configuration issues,
     * then fall back to console logging so development can continue.
     */
    console.error('❌ Error sending OTP email via SendGrid:', error);
    
    if (error.response) {
      console.error('SendGrid API Error Response:', JSON.stringify(error.response.body, null, 2));
      console.error('SendGrid Error Status:', error.response.status);
      console.error('SendGrid Error Code:', error.response.body?.errors?.[0]?.message || 'Unknown error');
    } else if (error.message) {
      console.error('SendGrid Error Message:', error.message);
    }
    
    if (error.code === 401) {
      console.error('⚠️  SendGrid API Key is invalid or missing');
    } else if (error.code === 403) {
      console.error('⚠️  SendGrid API Key does not have Mail Send permission, or sender email is not verified');
    }
    
    /**
     * Fallback: Console Logging
     * 
     * If email sending fails, log the OTP to console. This allows:
     * - Development to continue without email service
     * - Testing OTP functionality
     * - Debugging when email service is misconfigured
     * 
     * WARNING: In production, this should never happen. Email service must
     * be properly configured for security.
     */
    console.log(`📧 OTP for ${to} (fallback): ${otp}`);
    return false;
  }
};

/**
 * Check Email Service Configuration
 * 
 * Utility function to check if SendGrid is properly configured. Used by
 * controllers to determine if OTP should be returned in API responses
 * (development mode only when email service is unavailable).
 * 
 * Returns: true if SendGrid is configured and ready, false otherwise
 */
export const isEmailServiceConfigured = (): boolean => {
  return !!sendGridApiKey && sendGridApiKey !== 'SG.your_api_key_here' && sendGridApiKey.startsWith('SG.');
};

