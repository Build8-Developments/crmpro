export interface ListResponseData<T> {
  items: T[];
}

export function toListResponseData<T>(items: T[]): ListResponseData<T> {
  return { items };
}
