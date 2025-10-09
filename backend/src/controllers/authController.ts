import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {supabase} from '../utils/database';


export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password } = req.body; //gets input from frontend 

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "username/email and password are required"});
        }

        const { data: user, error } = await supabase.from('User')
        .select('UserID, Username, Email, Password, PharmacistYN, IsActive')
        .or(`Username.eq.${identifier},Email.eq.${identifier}`)
        .eq('IsActive',true)
        .single();

        if (error || !user) {
            return res.status(401).json({
                success:false,
                message: "Invalid Login Credentials",
                });
        }

        const isPasswordValid = await bcrypt.compare(password, user.Password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Credentials',
            });
        }

        // create JWT token
        const token = jwt.sign(
            {
                userId: user.UserID,
                username: user.Username,
                email: user.Email,
                isPharmacist: user.PharmacistYN,
                isActive: user.IsActive
            }, 
            process.env.JWT_SECRET || 'test-key', 
                {expiresIn: '24h'}
            
        ); 

        res.json({
            success:true,
            message: 'Login Successful',
            data: {
                token,
                user: {
                    userId: user.UserID,
                    username: user.Username,
                    email: user.Email,
                    isPharmacist: user.PharmacistYN,
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error during Login'
        });
    }

}


//Make Register function
//Extract data from request body

//pulls data from forms
export const register = async ( req: Request, res: Response ) => {
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

        //Validates required fields
        if(!firstName || !lastName || !username || !email ||!password || !contactNumber || !isPharmacist ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const { data: existingUser, error: checkError}  = await supabase
        .from('User')
        .select('UserID')
        .or(`Username.eq.${username},Email.eq.${email}`)
        .single();

        if  ( existingUser ) {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        //Hash Password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);


    // Insert user to database
    const { data: newUser, error: insertError } = await supabase
    .from('User')
    .insert({
        FirstName: firstName,
        LastName: lastName,
        Username: username,
        Email: email,
        Password: hashedPassword,
        ContactNumber: contactNumber,
        PharmacistYN: isPharmacist,
        IsActive: true
    })
    .select('UserID, FirstName, LastName, Username, Email, PharmacistYN, IsActive')
    .single();

    if (insertError) {
        return res.status(500).json({
            success: false,
            message: 'Failed to Register User',
            error: insertError.message
        });
    }
    
    //Success response to user creation
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
            user: {
                userId: newUser.UserID,
                firstName: newUser.FirstName,
                lastName: newUser.LastName,
                username: newUser.Username,
                email: newUser.Email,
                isPharmacist: newUser.PharmacistYN
            }
        }
    });
    } catch ( error ){
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error during Registration."
        });

    }

}




