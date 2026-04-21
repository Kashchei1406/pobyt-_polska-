function hasStorage() {
  try {
    return typeof localStorage !== 'undefined';
  } catch (_) {
    return false;
  }
}

export const storage = {
  get(key) {
    if (!hasStorage()) return null;
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  set(key, value) {
    if (!hasStorage()) return;
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  },
  remove(key) {
    if (!hasStorage()) return;
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  },
  getJSON(key, fallback = null) {
    const raw = this.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },
};

