import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminContextType {
    isAdmin: boolean;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Helper function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= expirationTime;
    } catch (error) {
        console.error('Error parsing token:', error);
        return true; // If we can't parse it, consider it expired
    }
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    // Check for existing token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('adminToken');

        if (storedToken) {
            // Check if token is expired
            if (isTokenExpired(storedToken)) {
                // Token expired, clear it
                localStorage.removeItem('adminToken');
                setToken(null);
                setIsAdmin(false);
            } else {
                // Token is valid
                setToken(storedToken);
                setIsAdmin(true);
            }
        }
    }, []);

    useEffect(() => {
        if (token) {
            localStorage.setItem('adminToken', token);
            setIsAdmin(true);
        } else {
            localStorage.removeItem('adminToken');
            setIsAdmin(false);
        }
    }, [token]);

    const login = (newToken: string) => {
        setToken(newToken);
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AdminContext.Provider value={{ isAdmin, token, login, logout }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
