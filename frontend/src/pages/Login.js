import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Wrench, Lock, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      const { access_token, user } = response.data;
      onLogin(user, access_token);
      toast.success(`Welcome back, ${user.full_name}!`);
      
      // Navigate to dashboard
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="login-page">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-red-600 opacity-10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-800 opacity-10 blur-3xl rounded-full"></div>
      </div>

      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 border border-red-600/30">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Wrench className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Exo 2' }}>
            ICD TUNING
          </h1>
          <p className="text-gray-400 text-sm">Performance Tuning | Chennai</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white flex items-center gap-2">
              <User className="w-4 h-4" />
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-600"
              data-testid="username-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-600"
              data-testid="password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg"
            data-testid="login-button"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="spinner w-5 h-5"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-black/30 rounded-lg border border-gray-800">
          <p className="text-xs text-gray-400 mb-2 font-semibold">Demo Credentials:</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p><span className="text-red-500">Manager:</span> admin / admin123</p>
            <p><span className="text-blue-500">Mechanic:</span> rudhan / rudhan123</p>
            <p><span className="text-blue-500">Mechanic:</span> suresh / suresh123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
