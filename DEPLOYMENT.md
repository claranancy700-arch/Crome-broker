# Deploying to Render.com

This guide will help you deploy Crome-broker to Render.com.

## Prerequisites

1. A GitHub account (or GitLab/Bitbucket)
2. A Render.com account (sign up at https://render.com)
3. Your code pushed to a Git repository

## Step 1: Push Your Code to GitHub

If you haven't already, push your code to GitHub:

```powershell
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - ready for Render deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

## Step 2: Deploy to Render

### Option A: Automatic Deployment (Using render.yaml)

1. Log in to [Render.com](https://render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click **"Apply"** to create the service
6. Wait for the deployment to complete (usually 2-3 minutes)

### Option B: Manual Deployment

1. Log in to [Render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `crome-broker`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Add environment variables (optional):
   - `NODE_ENV` = `production`
6. Click **"Create Web Service"**

## Step 3: Access Your Application

Once deployed, Render will provide a URL like:
```
https://crome-broker.onrender.com
```

Your app will be live at this URL!

## Important Notes

### File-Based Storage
The app uses file-based storage (`data/` directory) which works on Render's free tier. However, **data will be lost when the service restarts** (Render free tier has ephemeral storage).

**For production use**, you should:
1. Add a PostgreSQL database (see below)
2. Migrate from file-based storage to database storage

### Adding PostgreSQL Database (Recommended for Production)

1. In your Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Choose the **Free** plan
3. After creation, copy the **Internal Database URL**
4. Go to your web service → **Environment** tab
5. Add environment variable:
   - Key: `DATABASE_URL`
   - Value: (paste the Internal Database URL)
6. Your app will automatically use the database when `DATABASE_URL` is set

### Free Tier Limitations

- Service spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- 750 hours/month of usage
- Data in `data/` directory is ephemeral (lost on restart)

### Custom Domain (Optional)

1. Go to your service settings
2. Click **"Custom Domain"**
3. Add your domain and configure DNS as instructed

## Troubleshooting

### Build Fails
- Check that `package.json` has all dependencies listed
- Verify Node version is 18.x (specified in `engines` field)

### App Crashes
- Check the Render logs: Dashboard → Your Service → **"Logs"** tab
- Ensure PORT environment variable is not hardcoded (Render assigns it automatically)

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check that `db.js` has proper SSL configuration for production

## Monitoring

View your app's logs and metrics in the Render Dashboard:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory usage, and response times
- **Events**: Deployment history and service events

## Updating Your App

Render automatically redeploys when you push to your repository:

```powershell
git add .
git commit -m "Your update message"
git push
```

Render will detect the push and automatically rebuild and deploy your app.
