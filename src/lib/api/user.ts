import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiClient } from './apiClient';

// Define types for user data and registration
export interface UserDTO {
  id: string;
  username: string;
  steamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  username: string;    // Valheim username
  password: string;    // Server password (same for everyone)
  steamId?: string;    // Optional Steam user ID
}

export interface RegisterResponse {
  user: UserDTO;
  success: boolean;
  error?: string;
}

// Function to register/authenticate a user
export async function registerUser(userData: RegisterRequest): Promise<RegisterResponse> {
  try {
    // Use the /auth endpoint we created on the backend
    const result = await apiClient.post<RegisterResponse>('/auth', userData);
    return result.data;
  } catch (error: any) {
    // Return a structured error response
    return {
      user: {} as UserDTO,
      success: false,
      error: error.response?.data?.error || 'Registration/authentication failed'
    };
  }
}

// Function to get all users (admin function)
export async function getAllUsers(): Promise<UserDTO[]> {
  const result = await apiClient.get<UserDTO[]>('/users');
  return result.data;
}

// Function to get a specific user by ID
export async function getUserById(id: string): Promise<UserDTO> {
  const result = await apiClient.get<UserDTO>(`/users/${id}`);
  return result.data;
}

// Create a mutation hook for registration/authentication
export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationKey: ['register'],
    mutationFn: registerUser,
    onSuccess: (data) => {
      if (data.success) {
        // If registration/authentication is successful, invalidate users cache
        queryClient.invalidateQueries({
          queryKey: ['users']
        });
        
        // Store the user in the query cache for easy access across the app
        queryClient.setQueryData(['currentUser'], data.user);
      }
    }
  });
};

// Helper function to check if user is already authenticated (client-side)
export function getCurrentUser() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<UserDTO>(['currentUser']);
}

// Query hook for getting all users
export const useAllUsers = () =>
  createQuery({
    queryKey: ['users'],
    queryFn: getAllUsers
  });

// Query hook for getting a specific user
export const useUser = (id: string) =>
  createQuery({
    queryKey: ['users', id],
    queryFn: () => getUserById(id),
    enabled: !!id // Only run the query if an ID is provided
  });