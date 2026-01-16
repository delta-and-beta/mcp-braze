import { config } from "dotenv";
import { BrazeClient, type BrazeResponse } from "../src/lib/client.js";

config();

interface EmailTemplateCreateResponse extends BrazeResponse {
  email_template_id?: string;
}

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const client = new BrazeClient({
  apiKey: getRequiredEnvVar("BRAZE_API_KEY"),
  restEndpoint: getRequiredEnvVar("BRAZE_REST_ENDPOINT"),
});

const emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rosewood Hotel</title>
  <style>
    body { margin: 0; padding: 0; font-family: Georgia, serif; background-color: #f8f6f3; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #1a1a1a; padding: 40px 20px; text-align: center; }
    .logo { color: #c9a962; font-size: 28px; font-weight: 300; letter-spacing: 4px; margin: 0; }
    .tagline { color: #888888; font-size: 12px; letter-spacing: 2px; margin-top: 10px; }
    .content { padding: 40px 30px; text-align: center; }
    .greeting { color: #1a1a1a; font-size: 24px; font-weight: 300; margin-bottom: 20px; }
    .message { color: #666666; font-size: 16px; line-height: 1.8; margin-bottom: 30px; }
    .cta { display: inline-block; background-color: #c9a962; color: #ffffff; padding: 15px 40px; text-decoration: none; font-size: 14px; letter-spacing: 2px; }
    .cta:hover { background-color: #b8984f; }
    .amenities { background-color: #f8f6f3; padding: 40px 30px; text-align: center; }
    .amenities-title { color: #1a1a1a; font-size: 18px; letter-spacing: 2px; margin-bottom: 30px; }
    .amenity-grid { display: table; width: 100%; }
    .amenity { display: table-cell; width: 33.33%; text-align: center; padding: 10px; }
    .amenity-icon { font-size: 24px; margin-bottom: 10px; color: #c9a962; }
    .amenity-text { color: #666666; font-size: 12px; letter-spacing: 1px; }
    .footer { background-color: #1a1a1a; padding: 30px 20px; text-align: center; }
    .footer-text { color: #888888; font-size: 11px; line-height: 1.8; }
    .social { margin-bottom: 20px; }
    .social a { color: #c9a962; text-decoration: none; margin: 0 10px; font-size: 12px; }
    .unsubscribe { color: #666666; font-size: 10px; margin-top: 20px; }
    .unsubscribe a { color: #888888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">ROSEWOOD</h1>
      <p class="tagline">A SENSE OF PLACE</p>
    </div>

    <div class="content">
      <h2 class="greeting">Dear {{first_name | default: "Valued Guest"}},</h2>
      <p class="message">
        We are delighted to welcome you to the Rosewood experience.
        Our commitment to exceptional hospitality awaits, where every detail
        has been thoughtfully curated for your comfort and pleasure.
      </p>
      <a href="{{reservation_link | default: 'https://rosewoodhotels.com'}}" class="cta">BOOK YOUR STAY</a>
    </div>

    <div class="amenities">
      <h3 class="amenities-title">SIGNATURE EXPERIENCES</h3>
      <div class="amenity-grid">
        <div class="amenity">
          <div class="amenity-icon">✦</div>
          <div class="amenity-text">FINE DINING</div>
        </div>
        <div class="amenity">
          <div class="amenity-icon">✦</div>
          <div class="amenity-text">WELLNESS SPA</div>
        </div>
        <div class="amenity">
          <div class="amenity-icon">✦</div>
          <div class="amenity-text">CONCIERGE</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="social">
        <a href="#">INSTAGRAM</a>
        <a href="#">FACEBOOK</a>
        <a href="#">TWITTER</a>
      </div>
      <p class="footer-text">
        Rosewood Hotels & Resorts<br>
        Creating unforgettable experiences worldwide
      </p>
      <p class="unsubscribe">
        <a href="{{unsubscribe_url}}">Unsubscribe</a> |
        <a href="{{preferences_url}}">Update Preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;

const plaintextBody = `
ROSEWOOD
A Sense of Place

Dear {{first_name | default: "Valued Guest"}},

We are delighted to welcome you to the Rosewood experience. Our commitment to exceptional hospitality awaits, where every detail has been thoughtfully curated for your comfort and pleasure.

Book Your Stay: {{reservation_link | default: "https://rosewoodhotels.com"}}

SIGNATURE EXPERIENCES
- Fine Dining
- Wellness Spa
- Concierge Services

---
Rosewood Hotels & Resorts
Creating unforgettable experiences worldwide

Unsubscribe: {{unsubscribe_url}}
Update Preferences: {{preferences_url}}
`;

async function main(): Promise<void> {
  console.log("Creating Rosewood Hotel email template...\n");

  const result = await client.request<EmailTemplateCreateResponse>("/templates/email/create", {
    body: {
      template_name: "Rosewood Hotel - Welcome",
      subject: 'Welcome to Rosewood, {{first_name | default: "Valued Guest"}}',
      body: emailBody,
      plaintext_body: plaintextBody,
      preheader: "Experience exceptional hospitality at Rosewood Hotels & Resorts",
    },
    context: { operation: "email_templates_create" },
  });

  console.log("Template created successfully!\n");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error("Failed to create template:", error instanceof Error ? error.message : error);
  process.exit(1);
});
