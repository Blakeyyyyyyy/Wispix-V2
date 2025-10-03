"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_NAMES = exports.ALL_TEMPLATES = exports.AirtableRowToEmail = exports.DailyDigestEmail = exports.LeadCaptureNotify = void 0;
exports.LeadCaptureNotify = {
    name: "Lead Capture & Notify",
    description: "Capture new leads in Airtable and send immediate notification email to sales team",
    steps: [
        {
            id: "capture-lead",
            name: "Record Lead in Database",
            type: "adapter",
            provider: "airtable",
            action: "createRecord",
            config: {
                table: "Leads",
                baseId: "app_leads_base",
                fields: {
                    Name: "{{lead.name}}",
                    Email: "{{lead.email}}",
                    Source: "{{lead.source}}",
                    Status: "New",
                    CreatedDate: "{{now}}"
                }
            }
        },
        {
            id: "notify-sales",
            name: "Send Notification Email",
            type: "adapter",
            provider: "gmail",
            action: "sendEmail",
            config: {
                to: "sales@company.com",
                subject: "New Lead: {{lead.name}}",
                body: "A new lead has been captured!\n\nName: {{lead.name}}\nEmail: {{lead.email}}\nSource: {{lead.source}}\n\nPlease follow up promptly."
            }
        }
    ],
    limits: {
        maxSteps: 5,
        timeoutSec: 300
    }
};
exports.DailyDigestEmail = {
    name: "Daily Digest Email",
    description: "Daily digest from Notion at 9am",
    trigger: {
        type: "cron",
        schedule: "0 9 * * *"
    },
    steps: [
        {
            id: "fetch-updates",
            name: "Get Recent Updates",
            type: "adapter",
            provider: "notion",
            action: "listDatabaseRows",
            config: {
                databaseId: "{{NOTION_DATABASE_ID}}",
                maxRecords: 10
            }
        },
        {
            id: "send-digest",
            name: "Send Daily Digest",
            type: "adapter",
            provider: "gmail",
            action: "sendEmail",
            inputFrom: "fetch-updates",
            config: {
                to: "{{USER_EMAIL}}",
                subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
                body: "Your daily updates are attached"
            }
        }
    ],
    limits: {
        maxSteps: 3,
        timeoutSec: 600
    }
};
exports.AirtableRowToEmail = {
    name: "Airtable to Email",
    description: "Email new Airtable records",
    trigger: {
        type: "cron",
        schedule: "0 9 * * *"
    },
    steps: [
        {
            id: "fetch-records",
            name: "Fetch Records",
            type: "adapter",
            provider: "airtable",
            action: "listRecords",
            config: {
                maxRecords: 10
            }
        },
        {
            id: "send-email",
            name: "Send Email",
            type: "adapter",
            provider: "gmail",
            action: "sendEmail",
            inputFrom: "fetch-records",
            config: {
                to: "{{USER_EMAIL}}",
                subject: "Airtable Update",
                body: "New records found"
            }
        }
    ],
    limits: {
        maxSteps: 2,
        timeoutSec: 180
    }
};
exports.ALL_TEMPLATES = {
    LeadCaptureNotify: exports.LeadCaptureNotify,
    DailyDigestEmail: exports.DailyDigestEmail,
    AirtableRowToEmail: exports.AirtableRowToEmail
};
exports.TEMPLATE_NAMES = Object.keys(exports.ALL_TEMPLATES);
//# sourceMappingURL=library.js.map