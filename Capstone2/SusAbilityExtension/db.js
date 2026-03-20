//db.js - data base js
// uses seed_sources list

// buckets are: left, lean_left, center, lean_right, right
// each seed is split into those categories ^^

// open and create database
// create a table object called sourceRatings
// insert rows (putMany)
// look up row by domain (getRating(domain))

const DB_NAME = "susability";
const DB_VERSION = 1;

export function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sourceRatings")) {
        const store = db.createObjectStore("sourceRatings", { keyPath: "domain" });
        store.createIndex("bucket", "bucket", { unique: false });
        store.createIndex("x", "x", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMany(storeName, rows) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    rows.forEach((r) => store.put(r));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRating(domain) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sourceRatings", "readonly");
    const req = tx.objectStore("sourceRatings").get(domain);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
