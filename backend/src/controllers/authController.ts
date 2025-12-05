import { Request, Response } from 'express';
import { supabase } from '../utils/database';
import { createClient } from '@supabase/supabase-js';
import { sendOTPEmail, isEmailServiceConfigured } from '../utils/emailService';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Register a new user
export const register = async (req: Request, res: Response) => {
    try {
        const {
            firstName,
            lastName,
            username,
            email,
            password,
            contactNumber,
            isPharmacist = false
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !username || !email || !password || !contactNumber) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if username already exists in our User table
        const { data: existingUser, error: checkError } = await supabase
            .from('User')
            .select('UserID')
            .eq('Username', username)
            .single();

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm for now, you can change this
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                username: username,
                contact_number: contactNumber,
                is_pharmacist: isPharmacist
            }
        });

        if (authError || !authData.user) {
            return res.status(400).json({
                success: false,
                message: authError?.message || "Failed to create user account"
            });
        }

        // Create user record in our User table
        const { data: newUser, error: insertError } = await supabase
            .from('User')
            .insert({
                AuthUserID: authData.user.id,
                FirstName: firstName,
                LastName: lastName,
                Username: username,
                ContactNumber: contactNumber
            })
            .select('UserID, FirstName, LastName, Username')
            .single();

        if (insertError) {
            // If User table insert fails, clean up the auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create user profile',
                error: insertError.message
            });
        }

        // If user is a pharmacist, create pharmacist record
        if (isPharmacist) {
            const { error: pharmacistError } = await supabase
                .from('Pharmacist')
                .insert({
                    UserID: newUser.UserID,
                    LicenseNumber: '', // Will be updated later
                    Specialization: '',
                    YearsOfExperience: 0,
                    IsActive: true
                });

            if (pharmacistError) {
                console.error('Failed to create pharmacist record:', pharmacistError);
                // Don't fail the registration, just log the error
            }
        }

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    userId: newUser.UserID,
                    firstName: newUser.FirstName,
                    lastName: newUser.LastName,
                    username: newUser.Username,
                    email: email,
                    isPharmacist: isPharmacist
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error during Registration."
        });
    }
};

// Get user profile by auth token
export const getProfile = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Get user profile from our User table
        const { data: userProfile, error: profileError } = await supabase
            .from('User')
            .select('UserID, FirstName, LastName, Username, ContactNumber, DateTimeLastLoggedIn, Roles, HasCompletedFirstLogin')
            .eq('AuthUserID', user.id)
            .single();

        if (profileError || !userProfile) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        // Update last login time
        await supabase
            .from('User')
            .update({ DateTimeLastLoggedIn: new Date().toISOString() })
            .eq('UserID', userProfile.UserID);

        res.json({
            success: true,
            data: {
                user: {
                    userId: userProfile.UserID,
                    firstName: userProfile.FirstName,
                    lastName: userProfile.LastName,
                    username: userProfile.Username,
                    email: user.email,
                    contactNumber: userProfile.ContactNumber,
                    isPharmacist: false, // Default to false since column might not exist
                    isActive: true, // Default to true since column might not exist
                    lastLogin: userProfile.DateTimeLastLoggedIn,
                    role: userProfile.Roles,
                    hasCompletedFirstLogin: userProfile.HasCompletedFirstLogin ?? false
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const { firstName, lastName, username, contactNumber } = req.body;

        // Check if username is being changed and if it's already taken
        if (username) {
            const { data: existingUser, error: checkError } = await supabase
                .from('User')
                .select('UserID')
                .eq('Username', username)
                .neq('AuthUserID', user.id)
                .single();

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Username already exists"
                });
            }
        }

        // Update user profile
        const updateData: any = {};
        if (firstName) updateData.FirstName = firstName;
        if (lastName) updateData.LastName = lastName;
        if (username) updateData.Username = username;
        if (contactNumber) updateData.ContactNumber = contactNumber;
        updateData.UpdatedAt = new Date().toISOString();

        const { data: updatedUser, error: updateError } = await supabase
            .from('User')
            .update(updateData)
            .eq('AuthUserID', user.id)
            .select('UserID, FirstName, LastName, Username, ContactNumber, PharmacistYN, IsActive')
            .single();

        if (updateError) {
            return res.status(500).json({
                success: false,
                message: "Failed to update profile",
                error: updateError.message
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: {
                    userId: updatedUser.UserID,
                    firstName: updatedUser.FirstName,
                    lastName: updatedUser.LastName,
                    username: updatedUser.Username,
                    email: user.email,
                    contactNumber: updatedUser.ContactNumber,
                    isPharmacist: updatedUser.PharmacistYN,
                    isActive: updatedUser.IsActive
                }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// Change password (when user is logged in)
export const changePassword = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Update password using Supabase
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) {
            return res.status(500).json({
                success: false,
                message: "Failed to update password",
                error: updateError.message
            });
        }

        res.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// Deactivate user account
export const deactivateAccount = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Deactivate user in our User table
        const { error: updateError } = await supabase
            .from('User')
            .update({ 
                IsActive: false,
                UpdatedAt: new Date().toISOString()
            })
            .eq('AuthUserID', user.id);

        if (updateError) {
            return res.status(500).json({
                success: false,
                message: "Failed to deactivate account",
                error: updateError.message
            });
        }

        res.json({
            success: true,
            message: "Account deactivated successfully"
        });

    } catch (error) {
        console.error('Deactivate account error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// In your backend (authController.ts or similar)


//email endpoint
// Confirm a user's email using admin API
export const confirmUserEmail = async (req: Request, res: Response) => {
    const { data, error } = await supabase.auth.admin.updateUserById(req.body.userId,  {
        email_confirm: true,

        
    });
    res.status(200).json({message: "Jemsey"});
};

// Verify pharmacist/admin credentials for clerk authorization
export const verifyPharmacistAdmin = async (req: Request, res: Response) => {
    try {
        console.log('=== Verification endpoint called ===');
        console.log('Request body:', { username: req.body?.username, hasPassword: !!req.body?.password });
        
        const { username, password } = req.body;

        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        console.log('Verification attempt for username/email:', username);

        // Check if input looks like an email
        const isEmail = username.includes('@');
        
        let userRecord: any = null;
        let userError: any = null;

        if (isEmail) {
            // If input is an email, find user by email in Supabase Auth first
            console.log('Input appears to be an email, looking up by email...');
            
            // Get all users from Supabase Auth and find matching email
            // Then find corresponding User record
            const { data: allUsers } = await supabase
                .from('User')
                .select('UserID, AuthUserID, Roles, PharmacistYN, Username');
            
            if (allUsers) {
                // For each user, check their email in Supabase Auth
                for (const user of allUsers) {
                    try {
                        const { data: authUser } = await supabase.auth.admin.getUserById(user.AuthUserID);
                        if (authUser?.user?.email?.toLowerCase() === username.toLowerCase()) {
                            userRecord = user;
                            console.log('Found user by email:', authUser.user?.email);
                            break;
                        }
                    } catch (err) {
                        // Continue to next user
                        continue;
                    }
                }
            }
            
            if (!userRecord) {
                userError = { message: 'User not found by email' };
            }
        } else {
            // Find user by username (case-insensitive)
            // First try exact match
            let { data, error } = await supabase
                .from('User')
                .select('UserID, AuthUserID, Roles, PharmacistYN, Username')
                .eq('Username', username)
                .single();

            userRecord = data;
            userError = error;

            // If exact match fails, try case-insensitive search
            if (userError || !userRecord) {
                const { data: allUsers } = await supabase
                    .from('User')
                    .select('UserID, AuthUserID, Roles, PharmacistYN, Username');
                
                if (allUsers) {
                    userRecord = allUsers.find(u => 
                        u.Username?.toLowerCase() === username.toLowerCase()
                    ) || null;
                    userError = userRecord ? null : { message: 'User not found' };
                }
            }
        }

        if (userError || !userRecord) {
            console.log('User not found for username:', username, 'Error:', userError);
            // Return more specific error
            return res.status(401).json({
                success: false,
                message: `User with username "${username}" not found. Please check the username and try again.`
            });
        }

        console.log('User found:', {
            UserID: userRecord.UserID,
            Roles: userRecord.Roles,
            PharmacistYN: userRecord.PharmacistYN
        });

        // Check if user is pharmacist or admin
        const isPharmacist = userRecord.PharmacistYN === true;
        const roleLower = userRecord.Roles?.toLowerCase() || '';
        const isAdmin = roleLower === 'admin';
        const isPharmacistRole = roleLower === 'pharmacist';

        console.log('Role check:', {
            isPharmacist,
            isAdmin,
            isPharmacistRole,
            roleValue: userRecord.Roles
        });

        if (!isPharmacist && !isAdmin && !isPharmacistRole) {
            console.log('User does not have required role');
            return res.status(403).json({
                success: false,
                message: "Only pharmacist or admin accounts can authorize this action"
            });
        }

        // Get the user's email from Supabase Auth using admin API
        const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userRecord.AuthUserID);

        if (authUserError || !authUser?.user || !authUser.user.email) {
            console.log('Error getting auth user:', {
                error: authUserError,
                authUserID: userRecord.AuthUserID,
                hasAuthUser: !!authUser,
                hasEmail: !!authUser?.user?.email
            });
            return res.status(401).json({
                success: false,
                message: "Unable to verify account. The account may not be properly linked. Please contact administrator."
            });
        }

        // At this point, we know authUser.user and authUser.user.email are not null
        const userEmail = authUser.user.email;
        console.log('Auth user email found:', userEmail);

        // Create a completely isolated client instance for verification
        // This prevents any interference with existing sessions
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase configuration');
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                storage: undefined // Don't use any storage
            }
        });

        // Verify password by attempting to sign in with isolated client
        console.log('Attempting password verification for email:', userEmail);
        const { data: signInData, error: signInError } = await isolatedClient.auth.signInWithPassword({
            email: userEmail,
            password: password
        });

        if (signInError || !signInData?.user) {
            console.log('Password verification failed:', {
                message: signInError?.message,
                status: signInError?.status,
                name: signInError?.name,
                email: userEmail
            });
            
            // Provide more specific error message
            let errorMessage = "Invalid password. Please check your credentials and try again.";
            if (signInError?.message) {
                if (signInError.message.includes('Invalid login credentials')) {
                    errorMessage = "Invalid password. The password you entered is incorrect.";
                } else if (signInError.message.includes('Email not confirmed')) {
                    errorMessage = "Account email not confirmed. Please contact administrator.";
                } else {
                    errorMessage = signInError.message;
                }
            }
            
            return res.status(401).json({
                success: false,
                message: errorMessage
            });
        }

        console.log('Password verification successful');

        // Sign out the isolated session immediately
        await isolatedClient.auth.signOut();

        res.json({
            success: true,
            message: "Authorization successful",
            data: {
                authorizedBy: {
                    userId: userRecord.UserID,
                    username: userRecord.Username,
                    role: isAdmin ? 'admin' : (isPharmacistRole ? 'pharmacist' : 'pharmacist')
                }
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Check if user requires first-time login OTP
export const checkFirstLogin = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Get user profile to check first login status
        // Try to get HasCompletedFirstLogin, but handle case where column might not exist
        const { data: userProfile, error: profileError } = await supabase
            .from('User')
            .select('UserID, HasCompletedFirstLogin')
            .eq('AuthUserID', user.id)
            .single();

        if (profileError || !userProfile) {
            console.log('User profile error:', profileError);
            // If column doesn't exist, treat as first login
            if (profileError?.code === 'PGRST116' || profileError?.message?.includes('column') || profileError?.message?.includes('HasCompletedFirstLogin')) {
                console.log('HasCompletedFirstLogin column may not exist - treating as first login');
                return res.json({
                    success: true,
                    data: {
                        requiresOTP: true,
                        hasCompletedFirstLogin: false,
                        note: 'Database migration may be needed'
                    }
                });
            }
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        console.log('User profile found:', {
            UserID: userProfile.UserID,
            HasCompletedFirstLogin: userProfile.HasCompletedFirstLogin
        });

        // Check if HasCompletedFirstLogin field exists and is false/null
        // If the field doesn't exist in the result, treat as first login
        const hasCompletedFirstLogin = userProfile.HasCompletedFirstLogin !== undefined 
            ? (userProfile.HasCompletedFirstLogin ?? false)
            : false; // If field doesn't exist, default to false (first login)
        const requiresOTP = !hasCompletedFirstLogin;

        console.log('First login check result:', {
            hasCompletedFirstLogin,
            requiresOTP,
            fieldExists: userProfile.HasCompletedFirstLogin !== undefined
        });

        res.json({
            success: true,
            data: {
                requiresOTP,
                hasCompletedFirstLogin: hasCompletedFirstLogin
            }
        });

    } catch (error) {
        console.error('Check first login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// Generate and send OTP for first-time login
export const sendOTP = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user || !user.email) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Store OTP in user metadata temporarily
        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                otp: otp,
                otpExpiry: otpExpiry.toISOString()
            }
        });

        // Send OTP via email using SendGrid
        console.log(`📧 Attempting to send OTP to ${user.email}...`);
        const emailSent = await sendOTPEmail({
            to: user.email,
            otp: otp,
            userName: user.user_metadata?.first_name || user.user_metadata?.username
        });

        console.log(`📧 Email send result: ${emailSent}, SendGrid configured: ${isEmailServiceConfigured()}`);

        if (!emailSent && !isEmailServiceConfigured()) {
            // If SendGrid is not configured, return OTP in development mode only
            console.log(`📧 OTP for ${user.email}: ${otp}`);
            res.json({
                success: true,
                message: "Verification code sent to your email",
                // Only include OTP in development when SendGrid is not configured
                ...(process.env.NODE_ENV === 'development' && { otp, warning: 'SendGrid not configured - OTP logged to console' })
            });
        } else if (!emailSent) {
            // SendGrid is configured but email failed
            console.error('❌ SendGrid is configured but email sending failed');
            res.status(500).json({
                success: false,
                message: "Failed to send verification email. Please try again or contact support.",
                ...(process.env.NODE_ENV === 'development' && { 
                    otp: otp, 
                    warning: 'Email failed - OTP provided for development' 
                })
            });
        } else {
            // Email sent successfully
            res.json({
                success: true,
                message: "Verification code sent to your email"
            });
        }

    } catch (error: any) {
        console.error('❌ Error in sendOTP:', error);
        console.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            response: error?.response?.data,
            code: error?.code,
            name: error?.name
        });
        
        // If it's a SendGrid error, provide more details
        if (error?.response) {
            console.error('SendGrid API Error Details:', JSON.stringify(error.response.body, null, 2));
        }
        
        res.status(500).json({
            success: false,
            message: "An error occurred while sending the verification code",
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

// Verify OTP and complete first-time login
export const verifyOTP = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No valid authorization token provided"
            });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const { otp } = req.body;
        if (!otp || otp.length !== 6) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP format"
            });
        }

        // Get stored OTP from user metadata
        const storedOTP = user.user_metadata?.otp;
        const otpExpiry = user.user_metadata?.otpExpiry;

        if (!storedOTP) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request a new code."
            });
        }

        // Check if OTP is expired
        if (otpExpiry && new Date(otpExpiry) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new code."
            });
        }

        // Verify OTP
        if (storedOTP !== otp) {
            return res.status(401).json({
                success: false,
                message: "Invalid verification code. Please try again."
            });
        }

        // OTP verified - mark first login as complete
        const { data: userProfile, error: profileError } = await supabase
            .from('User')
            .select('UserID')
            .eq('AuthUserID', user.id)
            .single();

        if (profileError || !userProfile) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        // Update user to mark first login as complete
        await supabase
            .from('User')
            .update({ 
                HasCompletedFirstLogin: true,
                UpdatedAt: new Date().toISOString()
            })
            .eq('UserID', userProfile.UserID);

        // Clear OTP from metadata
        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                otp: null,
                otpExpiry: null
            }
        });

        res.json({
            success: true,
            message: "Verification successful. First login completed."
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};