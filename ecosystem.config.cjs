const path = require('path');

module.exports = {
    apps: [
        {
            name: 'health-dashboard-backend',
            script: './node_modules/.bin/tsx',
            args: '--tsconfig server/tsconfig.json server/index.ts',
            cwd: path.resolve(__dirname),
            env: {
                NODE_ENV: 'production',
                PORT: 3191
            },
            instances: 1,
            autorestart: true,
            watch: false
        },
        {
            name: 'health-dashboard-frontend',
            script: './node_modules/.bin/vite',
            args: 'preview --mode production',
            cwd: path.resolve(__dirname),
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
