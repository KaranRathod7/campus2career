# Deploying Campus2Career to Vercel (Live Production Guide)

Your Campus2Career repository is **100% pre-configured for Vercel deployment** with zero configuration required.

---

### Method 1: 1-Click Deploy via GitHub & Vercel Dashboard (Easiest)

1. **Push your code to GitHub**:
   - Create a GitHub repository (e.g. `campus2career`).
   - Push this `website` directory to your repository.

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..." &rarr; "Project"**.
   - Select your GitHub repository.
   - Leave Framework Preset as **"Other"**.
   - Root Directory: `./` (or `website` if in a subfolder).
   - Click **"Deploy"**.

3. **Done!**
   - Vercel will give you a live production URL (e.g. `https://campus2career.vercel.app`).
   - All YouTube embedded video masterclasses will play smoothly without Error 153 because `vercel.json` automatically injects the required `strict-origin-when-cross-origin` referrer policy!

---

### Method 2: Deploy via Vercel CLI (From Terminal)

1. Open PowerShell / Command Prompt in this folder:
   ```bash
   npm i -g vercel
   vercel
   ```
2. Follow the 3 prompts (default settings are all pre-configured).
3. To deploy directly to production:
   ```bash
   vercel --prod
   ```

---

### Pre-Configured Features on Vercel:
- **`vercel.json`**: Enforces strict origin referrer policies, CORS headers, and security headers (nosniff, XSS protection).
- **Serverless API Routes**: `/api/send-email` and `/api/emails` are fully supported via serverless functions in `/api`.
- **Offline / Static Fallback**: The client-side application utilizes persistent storage and an in-app simulated mailbox, guaranteeing zero downtime.
- **Sovereign Admin Security Shield**: Only you can access the User Database Management portal with your Master Admin Passcode (`Campus2Career#Admin2026!`).
