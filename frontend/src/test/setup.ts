import { vi } from 'vitest';

// Stub VITE_API_URL pour tous les tests
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
