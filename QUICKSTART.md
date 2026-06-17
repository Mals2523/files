# Quick Start Guide - 5 Minutes to Running

## Step 1: Check Node.js (1 min)

Open terminal/command prompt and run:

```bash
node --version
npm --version
```

If you see version numbers, skip to Step 2.
**If "command not found":**
- Download Node.js from https://nodejs.org/ (LTS version)
- Install it
- Restart your terminal

## Step 2: Download Project (1 min)

Option A: If you have the code files
```bash
cd /path/to/xeno-validator
```

Option B: Clone from Git (if uploaded)
```bash
git clone <your-repo-url>
cd xeno-validator
```

## Step 3: Install Dependencies (2 min)

```bash
npm install
```

This downloads all required packages. You'll see a lot of output - that's normal.

## Step 4: Start Development Server (1 min)

```bash
npm run dev
```

Expected output:
```
  VITE v4.3.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

Your browser should automatically open. If not, manually go to:
```
http://localhost:5173
```

## Step 5: Test It

1. Download sample CSV (button in app)
2. Upload it back
3. Configure country rules
4. Click "Run Validation"
5. See results!

## Stop the Server

Press `Ctrl + C` in the terminal.

## Build for Deployment

When ready to deploy:

```bash
npm run build
```

This creates a `dist/` folder with production files.

## Deploy to Vercel (Free & Instant)

```bash
npm install -g vercel
vercel
```

Follow the prompts. You'll get a live URL instantly!

---

**Stuck?** Check:
- Terminal shows no errors during `npm install`
- Port 5173 is available (or change in `vite.config.js`)
- Browser console (F12) for any errors
