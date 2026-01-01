# NY Health Dashboard

A React + TypeScript + Vite application for monitoring New York health data.

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

### Production (Live)

There are two ways to run the application in a production-like environment:

#### 1. Preview Mode (Vite)
Build the application and serve it locally on port 8080:

```bash
npm run live
```

#### 2. Process Manager (PM2)
Run the application using PM2 as configured in `ecosystem.config.cjs`:

```bash
npm start
```

## Additional Commands

- `npm run build`: Build the application for production.
- `npm run preview`: Serve the built application (default Vite preview).
- `npm run lint`: Run ESLint to check for code quality issues.
