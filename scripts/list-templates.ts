import { config } from "dotenv";
import { BrazeClient, type BrazeResponse } from "../src/lib/client.js";

config();

interface EmailTemplateSummary {
  email_template_id: string;
  template_name: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface EmailTemplatesListResponse extends BrazeResponse {
  count: number;
  templates: EmailTemplateSummary[];
}

function validateEnv(): { apiKey: string; restEndpoint: string } {
  const apiKey = process.env.BRAZE_API_KEY;
  const restEndpoint = process.env.BRAZE_REST_ENDPOINT;

  if (!apiKey) {
    throw new Error("BRAZE_API_KEY environment variable is required");
  }
  if (!restEndpoint) {
    throw new Error("BRAZE_REST_ENDPOINT environment variable is required");
  }

  return { apiKey, restEndpoint };
}

async function main(): Promise<void> {
  const { apiKey, restEndpoint } = validateEnv();

  const client = new BrazeClient({ apiKey, restEndpoint });

  const result = await client.request<EmailTemplatesListResponse>(
    "/templates/email/list",
    {
      method: "GET",
      queryParams: { limit: 50 },
      context: { operation: "email_templates_list" },
    }
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
