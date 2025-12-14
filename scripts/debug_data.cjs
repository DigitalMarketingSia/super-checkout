
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from services/supabase.ts for debugging
const supabaseUrl = 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeGx6cm1ocXNiempocGdmd2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzQ5MDMsImV4cCI6MjA3OTI1MDkwM30.RBczB_Ji82DUWCVblvXEGb8U9wHQ5fxIcdkLDIaRr7k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- PRODUCTS ---');
    const { data: products, error: pError } = await supabase.from('products').select('id, name');
    if (pError) console.error(pError);
    if (products) products.forEach(p => console.log(`[${p.id}] ${p.name}`));

    console.log('\n--- CONTENTS ---');
    const { data: contents, error: cError } = await supabase.from('contents').select(`
    id, 
    title, 
    member_area_id,
    product_contents!left (
      product_id,
      products (name)
    )
  `);
    if (cError) console.error(cError);

    if (contents) {
        contents.forEach(c => {
            const prod = c.product_contents?.[0]?.products;
            const linkedProduct = prod ? prod.name : 'None';
            console.log(`[${c.id}] Title: "${c.title}" | Linked Product: ${linkedProduct}`);
        });
    }
}

debugData();
