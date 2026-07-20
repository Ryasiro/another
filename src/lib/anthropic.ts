import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
const baseURL = process.env.ANTHROPIC_BASE_URL;

// Safe initialization: prevents crash at startup/import time if credentials are not set yet.
// If both are missing, it uses a dummy apiKey string so construction succeeds.
export const anthropic = new Anthropic({
  apiKey: apiKey || (!authToken ? 'dummy-key-configure-anthropic-api-key' : undefined),
  authToken: authToken,
  baseURL: baseURL,
});

// Fall back to environment-specified models in sandbox/testing environments, otherwise use standard claude-opus-4-8
export const DEFAULT_MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'claude-opus-4-8';
