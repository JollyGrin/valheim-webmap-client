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
	userId?: string;
}

// Local storage key for user ID
const USER_ID_KEY = 'valheim_user_id';

export async function postNewPin(pinData: CreatePinRequest): Promise<PinDTO> {
	// Get userId from localStorage if available, otherwise use provided userId or null
	let userId = null;

	// Check if we're in a browser environment
	if (typeof window !== 'undefined' && window.localStorage) {
		userId = localStorage.getItem(USER_ID_KEY) || null;
	}

	// Use provided userId if available, otherwise use the one from localStorage
	// if (pinData?.userId) {
	// 	userId = pinData.userId;
	// }

	// If no userId is available, throw an error
	if (!userId || userId === null) {
		alert('User authentication required to create pins. Pin not saved to database');
		console.error('User authentication required to create pins');
		throw new Error('User authentication required to create pins');
	}

	const result = await apiClient.post<PinDTO>('/pins', {
		...pinData,
		userId
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
