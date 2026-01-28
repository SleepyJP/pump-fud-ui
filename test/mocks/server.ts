import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// ═══════════════════════════════════════════════════════════════════════════════
// MSW SERVER SETUP
// ═══════════════════════════════════════════════════════════════════════════════

export const server = setupServer(...handlers);
