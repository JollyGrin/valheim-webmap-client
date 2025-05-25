import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiClient } from './apiClient';

// Define types for user authentication and data
export interface UserDTO {
  id: string;
  username: string;
  steamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthRequest {
  username: string;    // Valheim username
  password: string;    // Server password (same for everyone)
  steamId?: string;    // Optional Steam user ID
}

export interface AuthResponse {
  user: UserDTO;
  success: boolean;
  message?: string;
}

// Function to authenticate a user
export async function authenticateUser(authData: AuthRequest): Promise<AuthResponse> {
  try {
    // Instead of the normal /users endpoint, we'll create a custom auth endpoint
    // This will be implemented on the backend later
    const result = await apiClient.post<AuthResponse>('/auth', authData);
    return result.data;
  } catch (error: any) {
    // Return a structured error response
    return {
      user: {} as UserDTO,
      success: false,
      message: error.response?.data?.error || 'Authentication failed'
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

// Create a mutation hook for authentication
export const useAuthenticate = () => {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationKey: ['authenticate'],
    mutationFn: authenticateUser,
    onSuccess: (data) => {
      if (data.success) {
        // If authentication is successful, invalidate and update the users cache
        queryClient.invalidateQueries({
          queryKey: ['users']
        });
        
        // Optionally store the user in the query cache for easy access
        queryClient.setQueryData(['currentUser'], data.user);
      }
    }
  });
};

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