import bootstrap from './app.controller';
bootstrap().catch(() => { console.error('Startup failed. Check database access and environment configuration.'); process.exitCode = 1; });
