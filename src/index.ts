#!/usr/bin/env node

import React from 'react'
import { render } from 'ink'
import { InkTUI } from './components/InkTUI'

// Entry point for the Shadow Kingdom Ink-based TUI
function main() {
  // Clear the screen on startup
  process.stdout.write('\x1b[2J\x1b[0f')
  
  const app = React.createElement(InkTUI)
  render(app)
}

// Run the application
if (require.main === module) {
  main()
}