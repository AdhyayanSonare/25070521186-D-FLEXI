// Emails of the seeded evaluation accounts. They are protected from edits and deletion.
export const DEMO_EMAILS = new Set(['riya.sharma@humanatlas.test', 'admin@humanatlas.test']);
export const isDemoEmail = (email) => DEMO_EMAILS.has(String(email).toLowerCase());
