import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiClient } from './apiClient';

// Define the MediaDTO type for the response data
export interface MediaDTO {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches all photos from the API
 */
export async function getAllPhotos() {
  const result = await apiClient.get<MediaDTO[]>('/media');
  return result.data;
}

/**
 * Interface for creating a new photo
 */
export interface CreatePhotoRequest {
  imageUrl: string;
  caption?: string;
}

/**
 * Posts a new photo to the API
 */
export async function postNewPhoto(photoData: CreatePhotoRequest): Promise<MediaDTO> {
  const result = await apiClient.post<MediaDTO>('/media', {
    ...photoData,
    userId: '1' // Static userId from your deployment
  });
  return result.data;
}

/**
 * Deletes a photo by ID
 */
export async function deletePhoto(id: string): Promise<MediaDTO> {
  const result = await apiClient.delete<MediaDTO>(`/media/${id}`);
  return result.data;
}

/**
 * Hook to fetch all photos
 */
export const useAllPhotos = () =>
  createQuery({
    queryKey: ['photos'],
    queryFn: getAllPhotos
  });

/**
 * Hook to create a new photo
 */
export const useNewPhoto = () => {
  const client = useQueryClient();
  return createMutation({
    mutationKey: ['new-photo'],
    mutationFn: postNewPhoto,
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ['photos']
      });
    }
  });
};

/**
 * Hook to delete a photo
 */
export const useDeletePhoto = () => {
  const client = useQueryClient();
  return createMutation({
    mutationKey: ['delete-photo'],
    mutationFn: deletePhoto,
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ['photos']
      });
    }
  });
};
