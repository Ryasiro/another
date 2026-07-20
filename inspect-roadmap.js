const Anthropic = require('@anthropic-ai/sdk').default;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || 'mock',
  baseURL: process.env.ANTHROPIC_BASE_URL || 'http://127.0.0.1:20128/v1'
});

async function main() {
  try {
    console.log('Testing messages.create with output_config.format JSON schema...');
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'combo',
      max_tokens: 4096,
      system: 'Output a valid JSON matching {"hello": "world"}',
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              hello: { type: 'string' }
            },
            required: ['hello'],
            additionalProperties: false
          }
        }
      },
      messages: [{ role: 'user', content: 'Respond with the JSON' }]
    });
    console.log('Success! Response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

main();
