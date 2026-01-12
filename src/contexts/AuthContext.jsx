import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('audicare_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem('audicare_users') || '[]');
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const userWithoutPassword = { ...foundUser };
      delete userWithoutPassword.password;
      setUser(userWithoutPassword);
      localStorage.setItem('audicare_user', JSON.stringify(userWithoutPassword));
      return { success: true };
    }
    
    if (email === 'admin@audicare.com' && password === 'admin123') {
      const adminUser = {
        id: '1',
        name: 'Administrador',
        email: 'admin@audicare.com',
        role: 'admin'
      };
      setUser(adminUser);
      localStorage.setItem('audicare_user', JSON.stringify(adminUser));
      return { success: true };
    }
    
    return { success: false, error: 'Credenciais inválidas' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('audicare_user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const permissions = {
      reception: ['patients', 'appointments', 'crm', 'repairs'],
      clinical: ['patients', 'appointments', 'repairs'],
      financial: ['patients', 'crm']
    };
    
    return permissions[user.role]?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};