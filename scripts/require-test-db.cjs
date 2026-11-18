if (!process.env.TEST_MONGO_URI || !/\/social_test(?:[/?]|$)/.test(process.env.TEST_MONGO_URI)) {
  console.error('TEST_MONGO_URI must point to a disposable social_test database (replica set).');
  process.exit(1);
}
