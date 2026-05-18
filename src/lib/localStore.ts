/* eslint-disable no-console */
type Json = any;

function hasElectron() {
  // @ts-ignore
  return typeof window !== 'undefined' && typeof (window as any).electronAPI !== 'undefined';
}

async function readJson(relativePath: string): Promise<Json | null> {
  if (hasElectron()) {
    // @ts-ignore
    return await (window as any).electronAPI.readJson(relativePath);
  }
  try {
    const txt = localStorage.getItem(`disk:${relativePath}`);
    return txt ? JSON.parse(txt) : null;
  } catch (e) {
    return null;
  }
}

async function writeJson(relativePath: string, data: Json): Promise<boolean> {
  if (hasElectron()) {
    // @ts-ignore
    return await (window as any).electronAPI.writeJson(relativePath, data);
  }
  try {
    localStorage.setItem(`disk:${relativePath}`, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

async function ensureDir(relativePath: string): Promise<boolean> {
  if (hasElectron()) {
    // @ts-ignore
    return await (window as any).electronAPI.ensureDir(relativePath);
  }
  // localStorage has no dirs, just noop
  return true;
}

async function saveFile(relativePath: string, buffer: Uint8Array): Promise<{ path?: string } | null> {
  if (hasElectron()) {
    // @ts-ignore
    return await (window as any).electronAPI.saveFile(relativePath, buffer);
  }
  // no-op in browser
  return null;
}

export const localStore = {
  isAvailable: hasElectron,
  readJson,
  writeJson,
  ensureDir,
  saveFile,
};

export default localStore;
