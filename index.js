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

class ServerlessInjectionPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.serverless.service.provider.environment =
      this.serverless.service.provider.environment || {};
    this.config =
      (this.serverless.service.custom && this.serverless.service.custom['injection']) || {};
    this.logging = typeof this.config.logging !== 'undefined' ? this.config.logging : true;
    this.envVars = this.loadEnv(this.getEnvironment()) || {};
    this.hooks = {
      'package:initialize': () => {
        if (this.logging) {
          this.serverless.cli.log(
            'Injecting environments into function variables as function level.....'
          );
        }
        this.serverless.service.getAllFunctions().forEach(f => {
          const fn = this.serverless.service.getFunction(f);
          Object.keys(fn.environment).forEach(e => fn.environment[e] = this.envVars[e] || fn.environment[e]);
        });
      },
      'invoke:local:loadEnvVars': () => {
          const fn = this.options.functionObj;
          Object.keys(fn.environment).forEach(e => fn.environment[e] = this.envVars[e] || fn.environment[e]);
        }
    };
  }

  getEnvironment() {
    return this.options.stage || 'development'
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
            this.serverless.cli.log('\t - ' + key);
          }

          if (this.config.injectProviderEnv) {
            this.serverless.service.provider.environment[key] = envVars[key];
          }
        });
      } else {
        if (this.logging) {
          this.serverless.cli.log('DOTENV: Could not find .env file. The ServerlessInjectionPlugin is using your local environments');
        }
      }
      return envVars;
    } catch (e) {
      console.error(
        chalk.red(
          '\n ServerlessInjectionPlugin Error --------------------------------------\n'
        )
      )
      console.error(chalk.red('  ' + e.message))
    }
  }
}

module.exports = ServerlessInjectionPlugin
