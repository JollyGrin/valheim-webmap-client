import { createMutation, createQuery } from '@tanstack/svelte-query';
import { apiClient } from './apiClient';

export async function getAllPins() {
  const result = await apiClient.get('/pins');
  return result.data;
}

export async function postNewPin({
  x,
  z,
  type,
  label
}: {
  x: number;
  z: number;
  type: string;
  label: string;
}) {
  const result = await apiClient.post('/pins', {
    x,
    z,
    type,
    label,
    userId: '515e04f2-002c-45bb-8828-b69db1e6cf46' // Static userId
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
