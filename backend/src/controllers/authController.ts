import { Request, Response } from 'express';
import { supabase } from '../utils/database';

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
            .select('UserID, FirstName, LastName, Username, ContactNumber, DateTimeLastLoggedIn, Roles')
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
                    role: userProfile.Roles
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