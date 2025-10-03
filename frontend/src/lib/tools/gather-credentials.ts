export const gatherCredentialsTool = {
  name: 'gather_credentials',
  description: 'Gather and store API credentials needed for a service',
  parameters: {
    service: { type: 'string', description: 'Service name (e.g., airtable, gmail)' },
    required_fields: { type: 'array', description: 'Fields needed based on API docs' }
  },
  execute: async ({ service, required_fields }: { service: string; required_fields: string[] }) => {
    // This just returns a message with input fields that the chat UI will render
    return {
      type: 'credential_request',
      service,
      fields: required_fields,
      message: `I need your ${service} credentials to continue:`,
      render_inputs: true
    };
  }
};
