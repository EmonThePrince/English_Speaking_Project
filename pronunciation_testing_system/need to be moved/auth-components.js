// AuthComponents.js
import React, { useState } from 'react';
import axios from 'axios';

export const LoginForm = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/users/login/', formData);
      
      if (response.data && response.data.user) {
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Login failed. Please check your credentials and try again.'
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input 
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input 
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button 
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const RegisterForm = ({ onRegistrationSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password2) {
      setError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/users/register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      if (response.data && response.data.id) {
        onRegistrationSuccess();
      }
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        // Format validation errors
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError('Registration failed. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create an Account</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded whitespace-pre-line">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input 
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input 
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input 
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password2">
            Confirm Password
          </label>
          <input 
            type="password"
            id="password2"
            name="password2"
            value={formData.password2}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button 
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const GuestSession = ({ onStartGuestSession }) => {
  const [isCreating, setIsCreating] = useState(false);
  
  const startGuestSession = async () => {
    setIsCreating(true);
    
    try {
      // Generate a random session ID for the guest
      const guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 15);
      onStartGuestSession(guestSessionId);
    } catch (err) {
      console.error('Failed to create guest session', err);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="text-center mt-4">
      <p className="mb-3 text-gray-600">Don't want to create an account?</p>
      <button
        onClick={startGuestSession}
        disabled={isCreating}
        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        {isCreating ? 'Creating Guest Session...' : 'Continue as Guest'}
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Note: Your progress won't be saved when the session ends.
      </p>
    </div>
  );
};
