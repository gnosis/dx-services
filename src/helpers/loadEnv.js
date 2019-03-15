const SECRET_ENV_VARS = [
  'PK',
  'MNEMONIC'
]
const ENV_PATH = process.env.ENV_PATH

// Load env vars
initEnv()

function initEnv () {
  const { error, parsed } = require('dotenv').config(ENV_PATH && { path: ENV_PATH })

  if (ENV_PATH && error) {
    console.error(`
---------------------- Missing config file ----------------------
  Error configuring ENV vars with file "${ENV_PATH}"

  Make sure you've created the file "${ENV_PATH}" using "${ENV_PATH}.example" as a template
  i.e)
        cp ${ENV_PATH}.example ${ENV_PATH}
        vim ${ENV_PATH}
-----------------------------------------------------------------
`)
    throw error
  }

  if (ENV_PATH) {
    console.log(`Overriding defaults with ENV file: ${ENV_PATH}`)
  }

  if (parsed) {
    console.log('Overrided config using ENV vars: ')
    for (let key in parsed) {
      if (SECRET_ENV_VARS.includes(key)) {
        console.log('  %s: %s', key, `<SECRET-${key}>`)
      } else {
        console.log('  %s: %s', key, parsed[key])
      }
    }
  }
}
