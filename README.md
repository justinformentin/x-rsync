#

Script to run 

```json
{
  "scripts": {
    "sync": "sftp-sync sync ./dist",
    "deploy": "sftp-sync deploy ./dist"
  }
}
```

Values set in .env
```
DEPLOY_HOST=your.server.ip \
DEPLOY_USER=root \
DEPLOY_PRIVATE_KEY=C:/Users/you/.ssh/id_rsa \
DEPLOY_REMOTE_DIR=/var/www/website \
```