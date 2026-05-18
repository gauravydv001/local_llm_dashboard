export {};

declare global {
  interface Window {
    electronAPI?: {
      readJson: (relativePath: string) => Promise<any>;
      writeJson: (relativePath: string, data: any) => Promise<boolean>;
      ensureDir: (relativePath: string) => Promise<boolean>;
      saveFile: (relativePath: string, buffer: Uint8Array) => Promise<{ path?: string } | null>;
    };
  }
}
