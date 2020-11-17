const { eslint } = require('@stae/linters')

module.exports = {
  ...eslint,
  overrides: [
    ...eslint.overrides || [],
    {
      files: [
        '**/tests/**'
      ],
      rules: {
        'no-magic-numbers': 0
      }
    }
  ]
}
