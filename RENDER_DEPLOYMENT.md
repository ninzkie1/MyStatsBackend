# Render Deployment Guide for MERN Backend

## Prerequisites
- Render account (https://render.com)
- GitHub repository with your code pushed

## Step-by-Step Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create Database on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL" (or "MongoDB" if using MongoDB Atlas)
3. Fill in:
   - **Name**: `mern-auth-db`
   - **Region**: Choose closest to you
   - **Plan**: Free
4. Note the **Internal Database URL** (you'll need this)

### 3. Deploy Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Fill in the form:
   - **Name**: `mern-auth-backend`
   - **Environment**: Node
   - **Region**: Same as database
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. Add Environment Variables (in Settings → Environment):
```
NODE_ENV=production
MONGODB_URI=<paste your MongoDB URI or connection string from database>
PORT=3000
FRONTEND_URL=https://your-frontend-render-url.onrender.com
JWT_SECRET=<your-secure-jwt-secret>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
```

5. Click "Create Web Service"

### 4. Update Frontend CORS
Once your backend is deployed, update your `FRONTEND_URL` in the environment variables to match your actual frontend URL on Render.

### 5. Configure Database Connection
If using MongoDB Atlas:
- Get your connection string from MongoDB Atlas
- Replace `MONGODB_URI` in Render environment variables

If using Render PostgreSQL:
- Use the Internal Database URL provided
- You'll need to update your Mongoose models if switching databases

## Important Notes

- **Free Tier Limitations**: Services spin down after 15 minutes of inactivity. Use paid tier for production.
- **Database**: Keep the connection string secure - never commit it to GitHub
- **CORS**: The `FRONTEND_URL` must match your deployed frontend URL exactly
- **JWT_SECRET**: Use a strong random string, never commit to repo
- **Deployments**: Push to GitHub to trigger automatic deploys

## Troubleshooting

### Build fails
- Check if all dependencies are in `package.json`
- Verify Node version compatibility

### Database connection errors
- Ensure `MONGODB_URI` is correct in environment variables
- Check database is created and accessible

### CORS errors
- Verify `FRONTEND_URL` matches your actual frontend domain
- Check credentials are set to `true` in backend CORS config

### Application crashes
- Check Render logs: Dashboard → Service → Logs
- Verify all required environment variables are set
