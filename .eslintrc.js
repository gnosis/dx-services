module.exports = {
  extends: 'standard',
  plugins: ['jest'],
  rules: {
    'strict': 0,
    'arrow-parens': [2, 'as-needed'],
    'camelcase': 0
  },
  env: {
    'es6': true,
    'node': true,
    'jest/globals': true
  }
}
