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
            exec_mode: 'fork',
            autorestart: true,
            watch: false
        },
        {
            name: 'health-dashboard-frontend',
            interpreter: 'none',
            script: 'bun',
            args: 'run vite preview --mode production',
            cwd: path.resolve(__dirname),
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
            },
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
