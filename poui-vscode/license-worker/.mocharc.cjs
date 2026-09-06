process.env.TS_NODE_PROJECT = 'tsconfig.test.json';

module.exports = {
  require: 'ts-node/register',
  timeout: 15000,
  spec: 'test/**/*.test.ts',
};
