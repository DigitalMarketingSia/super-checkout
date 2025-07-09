
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CredentialTestRequest {
  publicKey: string
  accessToken: string
  environment: 'sandbox' | 'production'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { publicKey, accessToken, environment }: CredentialTestRequest = await req.json()
    
    console.log('🧪 Testando credenciais MercadoPago:', {
      environment,
      publicKeyPrefix: publicKey?.substring(0, 10) + '...',
      accessTokenPrefix: accessToken?.substring(0, 10) + '...'
    })

    // Validar formato das credenciais
    if (environment === 'sandbox') {
      if (!publicKey?.startsWith('TEST-') || !accessToken?.startsWith('TEST-')) {
        throw new Error('Credenciais de sandbox devem começar com TEST-')
      }
    } else {
      if (!publicKey?.startsWith('APP_USR-') || !accessToken?.startsWith('APP_USR-')) {
        throw new Error('Credenciais de produção devem começar com APP_USR-')
      }
    }

    // Testar credenciais fazendo uma chamada para a API do MercadoPago
    // Usar endpoint de account info que é mais adequado para teste de credenciais
    const testUrl = 'https://api.mercadopago.com/users/me'
    
    console.log('🔍 Fazendo requisição de teste para:', testUrl)
    console.log('🔑 Access token usado:', accessToken.substring(0, 20) + '...')
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SuperCheckout/1.0'
      }
    })

    console.log('📡 Status da resposta:', response.status)
    console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()))

    let responseData
    try {
      responseData = await response.json()
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta:', parseError)
      const responseText = await response.text()
      console.log('📄 Resposta em texto:', responseText)
      throw new Error(`Erro ao fazer parse da resposta da API: ${response.status}`)
    }
    
    console.log('📥 Resposta da API MercadoPago:', {
      status: response.status,
      ok: response.ok,
      hasData: !!responseData,
      userInfo: responseData ? {
        id: responseData.id,
        nickname: responseData.nickname,
        email: responseData.email
      } : null
    })

    if (!response.ok) {
      console.error('❌ Erro na API MercadoPago:', responseData)
      
      // Diferentes tipos de erro
      if (response.status === 401) {
        throw new Error('Credenciais inválidas ou token expirado')
      } else if (response.status === 403) {
        throw new Error('Token sem permissões adequadas')
      } else if (response.status === 404) {
        throw new Error('Endpoint não encontrado - verifique se as credenciais são válidas')
      } else {
        throw new Error(responseData?.message || `HTTP ${response.status}: Erro na validação das credenciais`)
      }
    }

    // Verificar se a resposta contém informações do usuário
    if (!responseData || !responseData.id) {
      throw new Error('Resposta inválida da API - credenciais podem estar incorretas')
    }

    // Se chegou até aqui, as credenciais são válidas
    console.log('✅ Credenciais validadas com sucesso para usuário:', responseData.nickname || responseData.email)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Credenciais de ${environment} validadas com sucesso para ${responseData.nickname || responseData.email}`,
        environment,
        userInfo: {
          id: responseData.id,
          nickname: responseData.nickname,
          email: responseData.email
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Erro ao testar credenciais:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
