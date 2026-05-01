# Switch Frontend to Local Backend

## ✅ .env File Fixed

The `.env` file has been updated with:
```
VITE_API_URL=http://localhost:5000
```

## ⚠️ CRITICAL: Restart Frontend Dev Server

**Vite only reads environment variables when it starts!**

You MUST restart your frontend dev server for the change to take effect:

### Steps:

1. **Stop the current frontend server:**
   - Press `Ctrl+C` in the terminal running the frontend

2. **Start it again:**
   ```bash
   cd asli-frontend
   npm run dev
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Look for this message:
   ```
   🔌 API Base URL: http://localhost:5000 (LOCAL)
   ```
   
   If you still see a remote/production URL label instead of `(LOCAL)`, the restart didn't work or there's another issue.

## Verify It's Working

### In Browser Console:
Should see:
```
🔌 API Base URL: http://localhost:5000 (LOCAL)
```

### Test Chatbot:
1. Send a message
2. Check Network tab in DevTools
3. Look for request to: `http://localhost:5000/api/ai-chat`
4. NOT a remote host you did not configure in `.env`

### Check Backend Console:
When you send a message, you should see:
```
🤖 Attempting to use Ollama for response...
📤 Calling Ollama API...
```

## If the frontend still hits a remote API

1. **Hard refresh browser:** `Ctrl+Shift+R` or `Ctrl+F5`
2. **Clear browser cache**
3. **Check if frontend actually restarted** - look for Vite startup messages
4. **Check .env file location** - must be in `asli-frontend/` folder (root of frontend project)

## Troubleshooting

### Problem: Still shows a remote API URL after restart

**Check:**
1. Is `.env` file in `asli-frontend/` folder? (not in parent folder)
2. Does it have exactly: `VITE_API_URL=http://localhost:5000`
3. Did you actually restart the dev server? (not just refresh browser)
4. Check browser console - what does it say?

### Problem: Vite not reading .env

**Try:**
1. Delete `.env` and recreate it
2. Make sure no spaces: `VITE_API_URL=http://localhost:5000` (not `VITE_API_URL = http://localhost:5000`)
3. Restart dev server again

---

**Remember: Vite only reads .env when the dev server starts!**

