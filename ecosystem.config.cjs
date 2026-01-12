const path = require('path');

module.exports = {
    apps: [
        {
            name: 'health-dashboard-backend',
            interpreter: 'bun',
            script: 'server/index.ts',
            // args: '--tsconfig server/tsconfig.json server/index.ts', // bun runs ts directly
            cwd: path.resolve(__dirname),
            env: {
                NODE_ENV: 'production',
                PORT: 3190
            },
            instances: 1,
            autorestart: true,
            watch: false
        },
        {
            name: 'health-dashboard-frontend',
            interpreter: 'bun',
            script: './node_modules/.bin/vite',
            args: 'preview --mode production',
            cwd: path.resolve(__dirname),
            env: {
                NODE_ENV: 'production',
                // PORT: 3000 // Vite preview uses its own port config, usually passed via args or config file
            },
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
