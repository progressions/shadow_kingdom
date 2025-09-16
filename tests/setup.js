// Optional global stubs for environments where certain APIs are missing
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    getRandomValues(arr) {
      if (!arr) return arr;
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
  };
}
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

