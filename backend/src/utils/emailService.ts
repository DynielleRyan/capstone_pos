import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment
const sendGridApiKey = process.env.SENDGRID_API_KEY;

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
 * Send OTP verification email via SendGrid
 */
export const sendOTPEmail = async ({ to, otp, userName }: SendOTPEmailParams): Promise<boolean> => {
  try {
    // If SendGrid is not configured, log and return false
    if (!sendGridApiKey || sendGridApiKey === 'SG.your_api_key_here' || !sendGridApiKey.startsWith('SG.')) {
      console.warn('⚠️  SendGrid API key not configured or invalid. OTP will be logged to console.');
      console.log(`📧 OTP for ${to}: ${otp}`);
      return false;
    }
    
    // Check if SendGrid is properly initialized
    if (!sgMail || typeof sgMail.send !== 'function') {
      console.error('❌ SendGrid mail client not properly initialized');
      console.log(`📧 OTP for ${to} (fallback): ${otp}`);
      return false;
    }

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

    await sgMail.send(msg);
    console.log(`✅ OTP email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending OTP email via SendGrid:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('SendGrid API Error Response:', JSON.stringify(error.response.body, null, 2));
      console.error('SendGrid Error Status:', error.response.status);
      console.error('SendGrid Error Code:', error.response.body?.errors?.[0]?.message || 'Unknown error');
    } else if (error.message) {
      console.error('SendGrid Error Message:', error.message);
    }
    
    // Check for common issues
    if (error.code === 401) {
      console.error('⚠️  SendGrid API Key is invalid or missing');
    } else if (error.code === 403) {
      console.error('⚠️  SendGrid API Key does not have Mail Send permission, or sender email is not verified');
    }
    
    // Fallback: log OTP to console if email fails
    console.log(`📧 OTP for ${to} (fallback): ${otp}`);
    return false;
  }
};

/**
 * Check if SendGrid is properly configured
 */
export const isEmailServiceConfigured = (): boolean => {
  return !!sendGridApiKey && sendGridApiKey !== 'SG.your_api_key_here' && sendGridApiKey.startsWith('SG.');
};

