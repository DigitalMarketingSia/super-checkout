import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '..', '.env.local');

// Credenciais da Vercel
const VERCEL_CONFIG = `
# Vercel Domain Integration
VERCEL_TOKEN=vck_0eCMVbFvW1DiQcKSJsuAWZroSysqOcZJJlyfyD7pddKThJQG6D2ZfEFq
VERCEL_PROJECT_ID=prj_LeAEfmtf9qctEIu2rfBqlNH3QCRg
`;

try {
    // Lê o arquivo .env.local atual
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');

        // Remove configurações antigas da Vercel
        envContent = envContent
            .split('\n')
            .filter(line => !line.startsWith('VERCEL_TOKEN=') &&
                !line.startsWith('VERCEL_PROJECT_ID=') &&
                !line.startsWith('VERCEL_TEAM_ID='))
            .join('\n');
    }

    // Remove linhas vazias extras no final
    envContent = envContent.trimEnd();

    // Adiciona as novas configurações da Vercel
    const updatedContent = envContent + VERCEL_CONFIG;

    // Salva o arquivo
    fs.writeFileSync(ENV_FILE, updatedContent, 'utf8');

    console.log('✅ Variáveis da Vercel configuradas com sucesso!');
    console.log('📝 Arquivo atualizado:', ENV_FILE);
    console.log('\n🔑 Configurações adicionadas:');
    console.log('   - VERCEL_TOKEN');
    console.log('   - VERCEL_PROJECT_ID');
    console.log('\n⚠️  Lembre-se de reiniciar o servidor de desenvolvimento!');

} catch (error) {
    console.error('❌ Erro ao configurar variáveis:', error.message);
    process.exit(1);
}
