# Development Server Configuration

## Port Configuration

**IMPORTANT: Always run the dev server on PORT 3002**

```bash
PORT=3002 npm run dev
```

## Why Port 3002?

This project uses port 3002 to avoid conflicts with other development servers that may be running on the default port 3000.

## Starting the Server

Always use:
```bash
cd /Users/evanlee/Desktop/2.\ Cursor/Foracle_V2
PORT=3002 npm run dev
```

The application will be available at:
- Local: http://localhost:3002
- Network: http://172.20.10.2:3002

## Quick Commands

Kill any existing processes on port 3002:
```bash
lsof -ti:3002 | xargs kill -9
```

Start fresh server:
```bash
PORT=3002 npm run dev
```
