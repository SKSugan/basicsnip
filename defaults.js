// Shared default snippet set.
// Used by background.js (seeding storage on install/update), options.js
// (dashboard + "Reset to defaults"), and content.js (fallback if storage
// hasn't loaded yet). Keeping one copy here stops the three contexts from
// drifting out of sync.

// Default sign-off name, seeded into chrome.storage.local under the
// "signature" key. Editable any time from the dashboard's Signature field,
// so anyone using this extension can drop in their own name - no code
// changes needed. Snippets below reference it via the literal "{signature}"
// placeholder; content.js and options.js swap in the real stored value.
const DEFAULT_SIGNATURE = 'S K Sugan';

const DEFAULT_SNIPPETS = [
  {
    id: 'd1',
    shortcut: 'update/',
    content: 'Hi Team,\n\nAny update?\n\n-{signature}',
    tag: 'General',
    updatedAt: 0
  },
  {
    id: 'd2',
    shortcut: 'close/',
    content: 'Hi Team,\n\nNo update has been received for the last {} working days. We are closing this task. Please raise a new ticket if any changes are required.\n\n-{signature}',
    tag: 'Closing',
    updatedAt: 0
  },
  {
    id: 'd3',
    shortcut: 'thanks/',
    content: 'Hi Team,\n\nThank you for the update.\n\n-{signature}',
    tag: 'General',
    updatedAt: 0
  },
  {
    id: 'd4',
    shortcut: 'resubpre/',
    content: 'Hi Team, \n\n Please provide us the detail before proceeding with resubmission creation. \n\n 1. Resubmission Condition \n\n 2. Resubmission Type (RTY/RTN) \n\n 3. Sections & Fields to be Enabled \n\n 4. Button Name \n\n 5. Confirmation message default: - Are you sure want to submit? \n\n 6. Thank You Message default: - Thank You ! \n\n 7. Communication need to be enabled or not if yes provide us the template name \n\n 8. Start Date  \n\n 9. End Date \n\n 10. Multiple Time Edit (Y/N) \n\n -{signature}',
    tag: 'Resubmission',
    updatedAt: 0
  },
  {
    id: 'd5',
    shortcut: 'ent-form-miss/',
    content: 'Hi Team,\n\nPlease provide us the entity name and form name with form id. so we can proceed with the implementation process. \n\n-{signature}',
    tag: 'Missing Info',
    updatedAt: 0
  },
  {
    id: 'd6',
    shortcut: 'formmiss/',
    content: 'Hi Team,\n\nPlease provide us the Form name with form id. so we can proceed with the implementation process. \n\n-{signature}',
    tag: 'Missing Info',
    updatedAt: 0
  },
  {
    id: 'd7',
    shortcut: 'Mailchangedone/',
    content: 'Dear Team,\n\n The request changes mentioned in the ticket have done same chave updated on the ticket. \n\n-{signature}',
    tag: 'General',
    updatedAt: 0
  }
];
