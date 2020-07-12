'use strict'
// See here: https://www.serverless.com/blog/writing-serverless-plugins
/**
 * Lifecycle Events:
 * cleanup
 * initialize
 * setupProviderConfiguration
 * createDeploymentArtifacts
 * compileFunctions
 * compileEvents
 * deploy
**/

const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')
const chalk = require('chalk')
const fs = require('fs')

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless
    this.serverless.service.provider.environment =
      this.serverless.service.provider.environment || {};
    this.config =
      (this.serverless.service.custom && this.serverless.service.custom['dotenv']) || {};
    this.logging = typeof this.config.logging !== 'undefined' ? this.config.logging : true;

    this.loadEnv(this.getEnvironment(options))
  }

  getEnvironment(options) {
    return options.stage || 'development'
  }

  resolveEnvFileName(env) {
    if (this.config.path) {
      return this.config.path
    }

    let basePath = this.config.basePath ? this.config.basePath : ''

    let defaultPath = basePath + '.env'
    let path = basePath + '.env.' + env

    return fs.existsSync(path) ? path : defaultPath
  }

  loadEnv(env) {
    var envFileName = this.resolveEnvFileName(env)
    try {
      let envVars = this.config.expandDotEnv
        ? dotenvExpand(dotenv.config({ path: envFileName })).parsed
        : dotenv.config({ path: envFileName }).parsed

      var include = false
      var exclude = false

      if (this.config.include) {
        include = this.config.include
      }

      if (this.config.exclude && !include) {
        exclude = this.config.exclude
      }

      if (envVars) {
        if (this.logging) {
          this.serverless.cli.log(
            'DOTENV: Loading environment variables from ' + envFileName + ':'
          )
        }
        if (include) {
          Object.keys(envVars)
            .filter(key => !include.includes(key))
            .forEach(key => {
              delete envVars[key]
            })
        }
        if (exclude) {
          Object.keys(envVars)
            .filter(key => exclude.includes(key))
            .forEach(key => {
              delete envVars[key]
            })
        }
        Object.keys(envVars).forEach(key => {
          if (this.logging) {
            this.serverless.cli.log('\t - ' + key)
          }
          this.serverless.service.provider.environment[key] = envVars[key]
        })
      } else {
        if (this.logging) {
          this.serverless.cli.log('DOTENV: Could not find .env file.')
        }
      }
    } catch (e) {
      console.error(
        chalk.red(
          '\n Serverless Plugin Error --------------------------------------\n'
        )
      )
      console.error(chalk.red('  ' + e.message))
    }
  }
}

module.exports = ServerlessPlugin
