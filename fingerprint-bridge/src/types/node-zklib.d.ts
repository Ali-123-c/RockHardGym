declare module 'node-zklib' {
  export default class ZKLib {
    constructor(ip: string, port: number, timeout: number, inport: number);
    createSocket(): Promise<void>;
    disconnect(): Promise<void>;
    getAttendances(): Promise<{ data: any[] }>;
    getRealTimeLogs(callback: (data: any) => void): void;
    clearAttendanceLog(): Promise<void>;
    getUsers(): Promise<{ data: any[] }>;
    executeCmd(command: number, data: Buffer | string): Promise<void>;
  }
}

declare module 'node-zklib/constants' {
  export const COMMANDS: {
    CMD_USER_WRQ: number;
    CMD_STARTENROLL: number;
    CMD_CAPTUREFINGER: number;
    [key: string]: number;
  };
}
