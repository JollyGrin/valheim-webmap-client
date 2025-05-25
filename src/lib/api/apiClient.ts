import { dev } from '$app/environment';
import axios from 'axios';

const DEV_URL = 'http://localhost:3000';
const PROD_URL = 'https://valheim-webmap-client-production-645a.up.railway.app';

// Cookie key for server password
const SERVER_PASSWORD_COOKIE = 'valheim_server_password';
// Local storage keys
const USER_ID_KEY = 'valheim_user_id';

// Function to get cookie value by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // SSR check
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export const apiClient = axios.create({
  baseURL: dev ? DEV_URL : PROD_URL,
  timeout: 2000
});

// Add a request interceptor to include server password in auth header
apiClient.interceptors.request.use((config) => {
  // Initialize headers if they don't exist
  config.headers = config.headers || {};
  
  // Get the server password from cookie
  const serverPassword = getCookie(SERVER_PASSWORD_COOKIE);
  
  // Add server password as a custom authorization header
  if (serverPassword) {
    config.headers['X-Valheim-Server-Password'] = serverPassword;
  }
  
  // For write operations, add the user ID if available
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    // Check if we need to add userId to the request body
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem(USER_ID_KEY);
      
      if (userId && config.data) {
        // If the data is a string (already stringified), parse it first
        let data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        
        // Only add userId if it's not already set
        if (!data.userId) {
          data.userId = userId;
          // Reassign the modified data
          config.data = typeof config.data === 'string' ? JSON.stringify(data) : data;
        }
      }
    }
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});
