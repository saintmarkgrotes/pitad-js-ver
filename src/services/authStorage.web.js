// Browser preview uses sessionStorage; sessions intentionally end with the tab.
// Native builds use Keychain/Keystore via authStorage.js.
export const authStorage = {
  async getItem(key) { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key); },
  async setItem(key, value) { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value); },
  async removeItem(key) { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); },
};
