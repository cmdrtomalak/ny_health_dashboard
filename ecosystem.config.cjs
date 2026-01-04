module.exports = {
    apps: [
        {
            name: 'health-dashboard-backend',
            script: 'npm',
            args: 'run live:server',
            cwd: '/home/bandit/src/tries/ny_health_dashboard',
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
            script: 'npm',
            args: 'run live:frontend',
            cwd: '/home/bandit/src/tries/ny_health_dashboard',
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
