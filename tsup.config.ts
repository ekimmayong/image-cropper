import { defineConfig } from 'tsup';

export default defineConfig([
  // Main web build
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    minify: true,
  },
  // React Native build (separate config for .js extension)
  {
    entry: { 'react-native': 'src/react-native.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    target: 'es2020',
    minify: true,
    outExtension: ({ format }) => ({
      js: format === 'esm' ? '.js' : '.cjs'
    })
  }
]);
