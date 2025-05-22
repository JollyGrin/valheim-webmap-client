import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiClient } from './apiClient';
import type { PinDTO } from '$lib/types';

export async function getAllPins() {
  const result = await apiClient.get<PinDTO[]>('/pins');
  return result.data;
}

export interface CreatePinRequest {
  x: number;
  z: number;
  type: string;
  label: string;
}

export async function postNewPin(pinData: CreatePinRequest): Promise<PinDTO> {
  const result = await apiClient.post<PinDTO>('/pins', {
    ...pinData,
    userId: '515e04f2-002c-45bb-8828-b69db1e6cf46' // Static userId from your deployment
  });
  return result.data;
}

export const useAllPins = () =>
  createQuery({
    queryKey: ['pins'],
    queryFn: getAllPins
  });

export const useNewPin = () =>
  createMutation({
    mutationKey: ['new-pin'],
    mutationFn: postNewPin
  });

export async function deletePin(id: string): Promise<PinDTO> {
  // DELETE endpoint expects only the pin ID in the URL path
  // No request body is needed for deletion
  const result = await apiClient.delete<PinDTO>(`/pins/${id}`);
  return result.data;
}

export const useDeletePin = () => {
  const client = useQueryClient();
  return createMutation({
    mutationKey: ['delete-pin'],
    mutationFn: deletePin,
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ['pins']
      });
    }
  });
};
