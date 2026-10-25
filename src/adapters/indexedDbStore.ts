import { type RecordingStore, StorageFullError, type StoredRecording } from '../core/ports';

const DB_NAME = 'music-recorder';
const META = 'meta';
const CHUNKS = 'chunks';
const CURRENT = 'current';

interface Meta {
  sampleRate: number;
  complete: boolean;
}

/** RecordingStore on IndexedDB (ADR-005): metadata + audio saved in chunks while recording. */
export function createIndexedDbStore(): RecordingStore {
  let db: Promise<IDBDatabase> | null = null;
  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(META);
        request.result.createObjectStore(CHUNKS, { autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));

  /** Runs `work` in one transaction and resolves when it is committed. */
  async function write(work: (meta: IDBObjectStore, chunks: IDBObjectStore) => void): Promise<void> {
    const transaction = (await open()).transaction([META, CHUNKS], 'readwrite');
    work(transaction.objectStore(META), transaction.objectStore(CHUNKS));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error?.name === 'QuotaExceededError' ? new StorageFullError() : transaction.error);
    });
  }

  async function read<T>(store: string, request: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const r = request((await open()).transaction(store).objectStore(store));
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  return {
    async begin(sampleRate) {
      // Ask the browser not to delete our data when space is low (R12). Not all browsers grant it.
      void navigator.storage?.persist?.();
      await write((meta, chunks) => {
        chunks.clear();
        meta.put({ sampleRate, complete: false } satisfies Meta, CURRENT);
      });
    },
    async append(samples) {
      await write((_meta, chunks) => chunks.add(samples));
    },
    async finish() {
      const meta = await read<Meta | undefined>(META, (s) => s.get(CURRENT));
      if (meta) await write((m) => m.put({ ...meta, complete: true }, CURRENT));
    },
    async load(): Promise<StoredRecording | null> {
      const meta = await read<Meta | undefined>(META, (s) => s.get(CURRENT));
      if (!meta) return null;
      const chunks = await read<Float32Array[]>(CHUNKS, (s) => s.getAll());
      const samples = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
      }
      return { samples, sampleRate: meta.sampleRate, complete: meta.complete };
    },
    async clear() {
      await write((meta, chunks) => {
        meta.clear();
        chunks.clear();
      });
    },
    async freeBytes() {
      const estimate = await navigator.storage?.estimate?.();
      if (!estimate?.quota) return null;
      return estimate.quota - (estimate.usage ?? 0);
    },
  };
}
