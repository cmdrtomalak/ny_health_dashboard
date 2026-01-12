export interface DatabaseAdapter {
  ready: Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(sql: string, params?: any[]): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}
