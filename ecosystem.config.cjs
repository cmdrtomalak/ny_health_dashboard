const path = require('path');

module.exports = {
    apps: [
        {
            name: 'health-dashboard',
            interpreter: 'bun',
            script: 'server/index.ts',
            cwd: path.resolve(__dirname),
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false
        }
    ]
};
