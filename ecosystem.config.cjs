module.exports = {
    apps: [
        {
            name: 'nyc-health-dashboard',
            script: 'npm',
            args: 'run live',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        }
    ]
};
