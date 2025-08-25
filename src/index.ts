#!/usr/bin/env node

import React from 'react'
import { render } from 'ink'
import { GameApplication } from './components/GameApplication'

interface CommandLineArgs {
  cmd?: string
  debug?: boolean
}

function parseCommandLineArgs(): CommandLineArgs {
  const args: CommandLineArgs = {}
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    
    if (arg === '--cmd' && i + 1 < process.argv.length) {
      args.cmd = process.argv[i + 1]
      i++ // Skip the next argument as it's the command value
    } else if (arg === '--debug') {
      args.debug = true
    }
  }
  
  // Check for debug mode from environment variable
  if (process.env.AI_DEBUG_LOGGING === 'true') {
    args.debug = true
  }
  
  return args
}

// Entry point for the Shadow Kingdom game
function main() {
  const args = parseCommandLineArgs()
  
  // Clear the screen on startup for interactive mode
  if (!args.cmd) {
    process.stdout.write('\x1b[2J\x1b[0f')
  }
  
  const app = React.createElement(GameApplication, {
    programmaticCommand: args.cmd,
    debugMode: args.debug || false
  })
  
  render(app)
}

// Run the application
if (require.main === module) {
  main()
}