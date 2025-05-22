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
