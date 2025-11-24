import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { TrendingUp, Lock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const LoginPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAdmin();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const formData = new FormData();
            formData.append('username', 'admin');
            formData.append('password', password);

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            login(data.access_token);
            navigate('/admin');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center selection:bg-emerald-500/30">
            <div className="w-full max-w-md p-8">
                {/* Logo/Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center space-x-3 mb-4">
                        <div className="bg-gradient-to-br from-emerald-400 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <TrendingUp className="text-slate-900 w-7 h-7" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Portfolio<span className="font-light">Tracker</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">Admin Access</p>
                </div>

                {/* Login Form */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 shadow-lg shadow-black/20 backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                            <Lock className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white text-center mb-6">Sign In</h2>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                placeholder="Enter admin password"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                            Sign In
                        </button>
                    </form>
                </div>

                {/* Back to Home Link */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => navigate('/')}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
