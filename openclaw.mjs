#!/usr/bin/env node

import module from 'node:module';

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors
  }
}

<<<<<<< HEAD
await import("./dist/entry.js");
=======
await import('./dist/entry.js');
>>>>>>> 76361ae3a (revert: Switch back to `tsc` for compiling.)
