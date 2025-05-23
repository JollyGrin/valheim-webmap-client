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
  x: number;
  z: number;
}

/**
 * Fetches all photos from the API
 */
export async function getAllPhotos() {
  const result = await apiClient.get<MediaDTO[]>('/media');
  return result.data;
}

/**
 * Interface for the coordinate bounds request
 */
export interface MediaBoundsRequest {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Fetches photos within the specified coordinate boundaries
 */
export async function getPhotosInBounds(bounds: MediaBoundsRequest) {
  const { minX, maxX, minZ, maxZ } = bounds;
  const result = await apiClient.get<MediaDTO[]>(
    `/media/bounds?minX=${minX}&maxX=${maxX}&minZ=${minZ}&maxZ=${maxZ}`
  );
  return result.data;
}

/**
 * Interface for creating a new photo
 */
export interface CreatePhotoRequest {
  imageUrl: string;
  caption?: string;
  x?: number;
  z?: number;
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
 * Hook to fetch photos within coordinate bounds
 */
export const usePhotosInBounds = (bounds: MediaBoundsRequest) =>
  createQuery({
    queryKey: ['photos', 'bounds', bounds],
    queryFn: () => getPhotosInBounds(bounds),
    enabled: !!bounds.minX && !!bounds.maxX && !!bounds.minZ && !!bounds.maxZ
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
