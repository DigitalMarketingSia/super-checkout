
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from services/supabase.ts
const supabaseUrl = 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeGx6cm1ocXNiempocGdmd2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzQ5MDMsImV4cCI6MjA3OTI1MDkwM30.RBczB_Ji82DUWCVblvXEGb8U9wHQ5fxIcdkLDIaRr7k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteGhostContent() {
    const contentId = 'dfdcfc1c-34cf-4a96-9d71-a79cb39b7eb5'; // Conteudo 1

    console.log(`Deleting content ${contentId}...`);

    // 1. Delete modules first (if cascade isn't set up perfectly, though it should be)
    const { error: mError } = await supabase.from('modules').delete().eq('content_id', contentId);
    if (mError) console.log('Error deleting modules:', mError.message);

    // 2. Delete content
    const { error } = await supabase.from('contents').delete().eq('id', contentId);

    if (error) {
        console.error('Error deleting content:', error.message);
    } else {
        console.log('Successfully deleted "Conteudo 1".');
    }
}

deleteGhostContent();
