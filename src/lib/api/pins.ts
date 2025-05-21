import { createQuery } from '@tanstack/svelte-query';
import { apiClient } from './apiClient';

export async function getAllPins() {
  const result = await apiClient.get('/pins');
  return result.data;
}

export const useAllPins = () =>
  createQuery({
    queryKey: ['pins'],
    queryFn: getAllPins
  });
