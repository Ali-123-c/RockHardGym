declare module 'zkteco-js' {
  export default class ZktecoJs {
    constructor(ip: string, port: number, timeout: number, inport: number);
    createSocket(): Promise<boolean>;
    disconnect(): Promise<void>;
    getAttendances(callbackInProcess?: (received: number, total: number) => void): Promise<{ data: any[] }>;
    getRealTimeLogs(callback: (data: { userId?: string; attTime?: Date }) => void): void;
    clearAttendanceLog(): Promise<void>;
    getUsers(): Promise<{ data: any[] }>;
    setUser(uid: number, userid: string, name: string, password: string, role?: number, cardno?: number): Promise<void>;
    deleteUser(uid: number): Promise<void>;
    freeData(): Promise<void>;
    disableDevice(): Promise<void>;
    enableDevice(): Promise<void>;
    executeCmd(command: number, data: Buffer | string): Promise<Buffer>;
    getInfo(): Promise<{ userCounts: number; logCounts: number; logCapacity: number }>;
    getTime(): Promise<Date>;
    setTime(t: Date | number): Promise<void>;
    getDeviceName(): Promise<string>;
    getDeviceVersion(): Promise<string>;
    getMacAddress(): Promise<string>;
    getSerialNumber(): Promise<string>;
    getPlatform(): Promise<string>;
    getOS(): Promise<string>;
    getVendor(): Promise<string>;
    getAttendanceSize(): Promise<number>;
    clearData(): Promise<void>;
  }
}
