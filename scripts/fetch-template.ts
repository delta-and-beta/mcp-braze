import { config } from "dotenv";
import { BrazeClient, type BrazeResponse } from "../src/lib/client.js";

config();

interface EmailTemplateInfoResponse extends BrazeResponse {
  email_template_id: string;
  template_name: string;
  description: string;
  subject: string;
  preheader: string;
  body: string;
  plaintext_body: string;
  should_inline_css: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

function validateEnvironment(): { apiKey: string; restEndpoint: string } {
  const apiKey = process.env.BRAZE_API_KEY;
  const restEndpoint = process.env.BRAZE_REST_ENDPOINT;

  if (!apiKey || !restEndpoint) {
    console.error("Missing required environment variables:");
    if (!apiKey) console.error("  - BRAZE_API_KEY");
    if (!restEndpoint) console.error("  - BRAZE_REST_ENDPOINT");
    process.exit(1);
  }

  return { apiKey, restEndpoint };
}

async function main(): Promise<void> {
  const { apiKey, restEndpoint } = validateEnvironment();

  const client = new BrazeClient({ apiKey, restEndpoint });

  const templateId = process.argv[2] || "563fb010-23ea-497a-9951-e343f3935cf9";

  console.log(`Fetching template: ${templateId}\n`);

  const result = await client.request<EmailTemplateInfoResponse>(
    "/templates/email/info",
    {
      method: "GET",
      queryParams: { email_template_id: templateId },
      context: { operation: "email_templates_info" },
    }
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
