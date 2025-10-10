import { useState } from 'react';
import { UserPlus, Lock, Mail, Eye, EyeOff, User } from 'lucide-react';
import supabase from '../services/supabase';


const RegisterPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [loading, isLoading] = useState('');
    const [showPassword, isShowPassword] = useState(false);
    const [showConfirmPassword, isShowConfirmPassword] = useState(false); 

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        })); //Always remembers the data that the user typed.
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { email, password } = formData;

        const {data, error} = await supabase.auth.signUp({
            email,
            password,
        });
        
        if (error) {
            console.error('Signup failed:', error.message);
            alert(error.message);
        } else {
            console.log("Registration success:" ,data);
        }
    }
    



    return(
        <form onSubmit={handleSubmit}>
        <div>
            <label>Email</label>
            <input type="email" name="email" placeholder="yourname@email.com" value={formData.email} onChange={handleInputChange}></input>

            <label>Password</label>
            <input type="password" name="password" placeholder="password_12345" value={formData.password} onChange={handleInputChange}></input>

            <button type="submit">Submit</button>
        </div>
   
    </form>
     );
}




export default RegisterPage;
