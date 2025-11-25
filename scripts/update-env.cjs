
const fs = require('fs');
const path = require('path');

const content = `VITE_SUPABASE_URL=https://vixlzrmhqsbzjhpgfwdn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeGx6cm1ocXNiempocGdmd2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzQ5MDMsImV4cCI6MjA3OTI1MDkwM30.RBczB_Ji82DUWCVblvXEGb8U9wHQ5fxIcdkLDIaRr7k
# Vercel Domain Integration
VERCEL_TOKEN=mMVSND6jVzwcsuq5gkr2LqAe
VERCEL_PROJECT_ID=prj_LeAEfmtf9qctEIu2rfBqlNH3QCRg
VERCEL_TEAM_ID=team_W7MgEBSahzDnB31cE7XrTINk
`;

fs.writeFileSync(path.join(__dirname, '../.env.local'), content);
console.log('Updated .env.local');
