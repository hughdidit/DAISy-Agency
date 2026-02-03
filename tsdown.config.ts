import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: 'src/index.ts',
    platform: 'node',
  },
  {
    entry: 'src/entry.ts',
    platform: 'node',
  },
<<<<<<< HEAD
])
=======
  {
    dts: true,
    entry: "src/plugin-sdk/index.ts",
    outDir: "dist/plugin-sdk",
    env,
    fixedExtension: false,
    platform: "node",
  },
  {
    entry: "src/extensionAPI.ts",
    env,
    fixedExtension: false,
    platform: "node",
  },
]);
>>>>>>> 425003417 (fix: Remove `tsconfig.oxlint.json` AGAIN.)
