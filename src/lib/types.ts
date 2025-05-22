export interface Coordinate {
  x: string;
  z: string;
}

export interface Status {
  message: string;
  isError: boolean;
}

type PinCategory = 'dot' | 'house' | 'fire' | 'mine' | 'cave';

export interface PinType {
  value: PinCategory;
  label: string;
}

export type PinDTO = {
  createdAt: string;
  id: string;
  label: string;
  type: PinCategory;
  userId: string;
  x: number;
  z: number;
};
