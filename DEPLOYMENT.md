# IQX Backend Deployment Guide

## Overview
IQX Backend is configured to run on **port 2024** using PM2 process manager.

## Prerequisites
- Node.js 18+ 
- PostgreSQL database
- PM2 (`npm install -g pm2`)

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/iqx_db
JWT_SECRET=your-super-secret-jwt-key
PORT=2024
```

## Database Setup

1. Run migrations:
```bash
npm run db:migrate
```

2. Seed initial data:
```bash
npm run seed:stocks
```

3. Fetch peer comparison data:
```bash
npm run fetch:peer-comparison
```

## PM2 Deployment

### Start Application

**Production mode (port 2024):**
```bash
npm run pm2:start
# or
pm2 start ecosystem.config.js --env production
```

**Development mode (port 2024, with watch):**
```bash
npm run pm2:start:dev
# or
pm2 start ecosystem.config.js --env development
```

### Management Commands

```bash
# Check status
npm run pm2:status

# View logs
npm run pm2:logs

# Stop application
npm run pm2:stop

# Restart application
npm run pm2:restart

# Reload with zero-downtime
npm run pm2:reload

# Monitor resources
npm run pm2:monit

# Delete from PM2
npm run pm2:delete
```

### Auto-start on System Boot

1. Generate startup script:
```bash
pm2 startup
# Follow the instructions shown
```

2. Save PM2 process list:
```bash
pm2 save
```

## API Endpoints

The API is accessible at `http://localhost:2024`

### Health Check
```bash
curl http://localhost:2024/health
```

### API Documentation
- Swagger UI: `http://localhost:2024/docs` (development only)

### Main Endpoints
- Auth: `/api/auth/*`
- Stock Symbols: `/api/stocks/*`
- Peer Comparison: `/api/peer-comparison/*`
- User Favorites: `/api/favorites/*`
- Admin: `/api/admin/*`

## Logs

Logs are stored in the `logs/` directory:
- `logs/iqx-backend-out.log` - Standard output
- `logs/iqx-backend-error.log` - Error logs
- `logs/iqx-backend-combined.log` - Combined logs

View real-time logs:
```bash
pm2 logs iqx-backend --lines 100
```

Flush logs:
```bash
pm2 flush iqx-backend
```

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
```

### Process Information
```bash
pm2 show iqx-backend
```

### Resource Usage
```bash
pm2 status
```

## Troubleshooting

### Application won't start
1. Check logs: `pm2 logs iqx-backend --lines 200`
2. Verify database connection: `npm run db:migrate`
3. Check port availability: `lsof -i:2024`

### High Memory Usage
- Restart with memory limit: Already configured to restart at 1GB
- Manual restart: `pm2 restart iqx-backend`

### Database Connection Issues
1. Verify DATABASE_URL in ecosystem.config.js
2. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

## Production Considerations

1. **Security:**
   - Change JWT_SECRET to a strong, random value
   - Set appropriate CORS_ORIGIN
   - Use HTTPS in production

2. **Performance:**
   - Application auto-restarts if memory exceeds 1GB
   - Daily restart at 3 AM (configurable in ecosystem.config.js)
   - Consider using cluster mode for high traffic

3. **Backup:**
   - Regular database backups
   - Log rotation (configure with pm2-logrotate)

## Cluster Mode (Optional)

For high traffic, you can run multiple instances:

Edit `ecosystem.config.js`:
```javascript
instances: 'max', // or specific number like 4
exec_mode: 'cluster',
```

Then restart:
```bash
pm2 reload ecosystem.config.js
```

## Support

For issues or questions, check:
- Logs: `pm2 logs iqx-backend`
- Process details: `pm2 show iqx-backend`
- Health endpoint: `curl http://localhost:2024/health`