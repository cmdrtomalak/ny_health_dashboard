#!/usr/bin/env node
import { preview } from 'vite';

const server = await preview({
  preview: {
    port: 4173,
    strictPort: true,
  },
});

server.printUrls();
