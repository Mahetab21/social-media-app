process.env.NODE_ENV='test';process.env.SALT_ROUND='4';process.env.BEARER_USER='Bearer';process.env.BEARER_ADMIN='Admin';
for(const name of ['ACCESS_TOKEN_USER','ACCESS_TOKEN_ADMIN','REFRESH_TOKEN_USER','REFRESH_TOKEN_ADMIN'])process.env[name]='test-only-'+name+'-not-a-real-secret-123456789';
process.env.DB_URL=process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/social_test?replicaSet=rs0';
