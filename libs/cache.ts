// cache.ts
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

function setCache<T>(key: string, value: T, ttl: number) {
  const expiry = Date.now() + ttl;
  const cacheEntry: CacheEntry<T> = { value, expiry };
  localStorage.setItem(key, JSON.stringify(cacheEntry));
}

function getCache<T>(key: string): T | null {
  const cacheEntry = localStorage.getItem(key);
  if (!cacheEntry) return null;

  const parsedEntry: CacheEntry<T> = JSON.parse(cacheEntry);
  if (Date.now() > parsedEntry.expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return parsedEntry.value;
}

function clearCache(key: string) {
  localStorage.removeItem(key);
}

export { setCache, getCache, clearCache };
