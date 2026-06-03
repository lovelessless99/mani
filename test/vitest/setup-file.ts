// Vitest setup file
// Add any global test setup here

import { config } from '@vue/test-utils'
import { Quasar } from 'quasar'

config.global.plugins = [[Quasar, {}]]
