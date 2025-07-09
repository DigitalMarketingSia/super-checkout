
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  checkoutId?: string
  gatewayId?: string
  token?: string
  customerData: {
    nome: string
    email: string
    telefone: string
    cpf: string
  }
  items: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
  }>
  totalAmount: number
  paymentMethod: 'credit_card' | 'pix'
  installments?: number
  environment?: 'sandbox' | 'production'
  externalReference?: string
  // Adicionar suporte para credenciais diretas
  directCredentials?: {
    publicKey: string
    accessToken: string
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function processar-pagamento iniciada')
  console.log('📅 Timestamp:', new Date().toISOString())
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo a preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔧 Inicializando cliente Supabase...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔍 Variáveis de ambiente:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
    })
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Cliente Supabase inicializado')

    console.log('📥 Lendo dados da requisição...')
    let paymentData: PaymentRequest
    try {
      const rawBody = await req.text()
      console.log('📄 Raw body length:', rawBody.length)
      paymentData = JSON.parse(rawBody)
      
      console.log('✅ Dados recebidos:', JSON.stringify({
        paymentMethod: paymentData.paymentMethod,
        totalAmount: paymentData.totalAmount,
        gatewayId: paymentData.gatewayId,
        customerName: paymentData.customerData?.nome,
        environment: paymentData.environment,
        hasToken: !!paymentData.token,
        itemsCount: paymentData.items?.length || 0
      }, null, 2))
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse dos dados:', parseError)
      throw new Error('Dados inválidos na requisição: ' + parseError.message)
    }

      console.log('🔍 Validando dados da requisição...')
      
      // Validar dados do cliente de forma mais robusta
      if (!paymentData.customerData) {
        console.error('❌ Dados do cliente ausentes')
        throw new Error('Dados do cliente são obrigatórios')
      }
      
      // Verificar nome - mais flexível
      if (!paymentData.customerData.nome?.trim()) {
        console.error('❌ Nome do cliente não fornecido:', paymentData.customerData)
        throw new Error('Nome completo é obrigatório')
      }
      
      // Verificar email - mais flexível  
      if (!paymentData.customerData.email?.trim()) {
        console.error('❌ Email do cliente não fornecido:', paymentData.customerData)
        throw new Error('Email é obrigatório')
      }
      
      // Validar email básico - mais flexível
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(paymentData.customerData.email)) {
        console.error('❌ Email inválido:', paymentData.customerData.email)
        throw new Error('Email deve ter um formato válido')
      }
      
      // Validar CPF mais flexível - tornar opcional para PIX
      if (paymentData.customerData.cpf && paymentData.customerData.cpf.replace(/\D/g, '').length > 0) {
        const cpfClean = paymentData.customerData.cpf.replace(/\D/g, '')
        if (cpfClean.length !== 11) {
          console.error('❌ CPF inválido:', paymentData.customerData.cpf)
          throw new Error('CPF deve ter 11 dígitos')
        }
      }

      if (!paymentData.items || paymentData.items.length === 0) {
        console.error('❌ Nenhum item no pedido')
        throw new Error('Pelo menos um item é obrigatório')
      }

      if (!paymentData.totalAmount || paymentData.totalAmount <= 0) {
        console.error('❌ Valor total inválido:', paymentData.totalAmount)
        throw new Error('Valor total deve ser maior que zero')
      }

      if (!['credit_card', 'pix'].includes(paymentData.paymentMethod)) {
        console.error('❌ Método de pagamento inválido:', paymentData.paymentMethod)
        throw new Error('Método de pagamento deve ser "credit_card" ou "pix"')
      }

      console.log('✅ Validações básicas passaram')
      console.log('🔄 Processando pagamento:', paymentData.paymentMethod, 'R$', paymentData.totalAmount)

      // Buscar credenciais do gateway
      let gatewayCredentials = null
      let environment = paymentData.environment || 'sandbox'
      
        // NOVO: Priorizar credenciais diretas se fornecidas
      if (paymentData.directCredentials) {
        console.log('🔑 Usando credenciais diretas fornecidas na requisição')
        console.log('🔍 Credenciais diretas:', {
          hasPublicKey: !!paymentData.directCredentials.publicKey,
          hasAccessToken: !!paymentData.directCredentials.accessToken,
          publicKeyPreview: paymentData.directCredentials.publicKey?.substring(0, 20) + '...',
          accessTokenPreview: paymentData.directCredentials.accessToken?.substring(0, 20) + '...'
        })
        
        // Detectar ambiente com validação rigorosa de credenciais
        const isProductionCreds = paymentData.directCredentials.accessToken?.startsWith('APP_USR-') && 
                                 paymentData.directCredentials.publicKey?.startsWith('APP_USR-');
        const isSandboxCreds = paymentData.directCredentials.accessToken?.startsWith('TEST-') && 
                              paymentData.directCredentials.publicKey?.startsWith('TEST-');
        
        let detectedEnvironment;
        if (isProductionCreds) {
          detectedEnvironment = 'production';
        } else if (isSandboxCreds) {
          detectedEnvironment = 'sandbox';
        } else {
          console.error('❌ Credenciais inválidas:', {
            accessTokenPrefix: paymentData.directCredentials.accessToken?.substring(0, 8),
            publicKeyPrefix: paymentData.directCredentials.publicKey?.substring(0, 8)
          });
          throw new Error('Credenciais do MercadoPago inválidas ou inconsistentes');
        }
        
        console.log('🌍 Ambiente detectado das credenciais diretas:', detectedEnvironment);
        environment = detectedEnvironment; // Sempre usar ambiente detectado automaticamente
        
        // Configurar credenciais baseadas no ambiente detectado
        if (detectedEnvironment === 'production') {
          gatewayCredentials = {
            accessTokenProd: paymentData.directCredentials.accessToken,
            publicKeyProd: paymentData.directCredentials.publicKey,
            accessTokenSandbox: '', // Limpar para evitar confusão
            publicKeySandbox: ''
          }
        } else {
          gatewayCredentials = {
            accessTokenSandbox: paymentData.directCredentials.accessToken,
            publicKeySandbox: paymentData.directCredentials.publicKey,
            accessTokenProd: '', // Limpar para evitar confusão
            publicKeyProd: ''
          }
        }
        
        console.log('✅ Ambiente final definido:', environment);
        // Pular busca no banco e ir direto para o processamento
      } else {
      
      if (paymentData.gatewayId) {
        console.log('🔍 Buscando credenciais do gateway no banco...', paymentData.gatewayId)
        let { data: gateway, error: gatewayError } = await supabase
          .from('gateways')
          .select('credentials, type, environment, name, is_active')
          .eq('id', paymentData.gatewayId)
          .single()
        
        if (gatewayError) {
          console.error('❌ Erro ao buscar gateway:', gatewayError)
          
          // Tentar buscar qualquer gateway MercadoPago ativo como fallback
          console.log('🔄 Tentando fallback para gateway MercadoPago...')
          const { data: fallbackGateway, error: fallbackError } = await supabase
            .from('gateways')
            .select('credentials, type, environment, name, is_active')
            .eq('type', 'mercado_pago')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (fallbackError || !fallbackGateway) {
            console.error('❌ Nenhum gateway MercadoPago ativo encontrado')
            throw new Error('Gateway de pagamento não configurado')
          }
          
          console.log('✅ Gateway fallback encontrado:', fallbackGateway.name)
          gateway = fallbackGateway
        }
        
        if (!gateway) {
          console.error('❌ Gateway não encontrado:', paymentData.gatewayId)
          throw new Error('Gateway não encontrado')
        }

        if (!gateway.is_active) {
          console.error('❌ Gateway inativo:', paymentData.gatewayId)
          throw new Error('Gateway está inativo')
        }
        
        if (gateway.type !== 'mercado_pago') {
          console.error('❌ Gateway não é Mercado Pago:', gateway.type)
          throw new Error('Gateway não é do tipo Mercado Pago')
        }
        
        gatewayCredentials = gateway.credentials
        environment = gateway.environment || environment
        
        console.log('✅ Gateway encontrado:', {
          name: gateway.name,
          type: gateway.type,
          environment: environment,
          hasCredentials: !!gatewayCredentials,
          credentialKeys: gatewayCredentials ? Object.keys(gatewayCredentials) : []
        })
      
    } else {
      console.log('⚠️ Nenhum gateway específico, buscando fallback ativo...')
      
      // Fallback: buscar qualquer gateway MercadoPago ativo
      const { data: fallbackGateway, error: fallbackError } = await supabase
        .from('gateways')
        .select('credentials, type, environment, name, is_active')
        .eq('type', 'mercado_pago')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (fallbackError || !fallbackGateway) {
        console.log('⚠️ Nenhum gateway ativo encontrado, usando credenciais do ambiente...')
        gatewayCredentials = {
          accessTokenSandbox: Deno.env.get('MP_ACCESS_TOKEN_SANDBOX') || 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
          publicKeySandbox: Deno.env.get('MP_PUBLIC_KEY_SANDBOX') || 'TEST-128ed321-c483-4220-b857-275935dd8498',
          accessTokenProd: Deno.env.get('MP_ACCESS_TOKEN_PROD'),
          publicKeyProd: Deno.env.get('MP_PUBLIC_KEY_PROD')
        }
        environment = 'sandbox' // Force sandbox when using default credentials
        console.log('🔧 Usando credenciais padrão de sandbox para desenvolvimento')
      } else {
        console.log('✅ Gateway fallback encontrado:', fallbackGateway.name)
        gatewayCredentials = fallbackGateway.credentials
        environment = fallbackGateway.environment || environment
      }
    }
    } // Fechar o bloco do else que foi aberto

    // Determinar access token baseado no ambiente
    let accessToken: string | undefined
    const isProduction = environment === 'production'
    
    if (isProduction) {
      accessToken = (gatewayCredentials as any).accessTokenProd || (gatewayCredentials as any).accessToken
    } else {
      accessToken = (gatewayCredentials as any).accessTokenSandbox || (gatewayCredentials as any).accessToken
    }

    console.log('🌍 Ambiente determinado:', isProduction ? 'PRODUÇÃO' : 'SANDBOX')
    console.log('🔍 Access token encontrado:', !!accessToken)

    if (!accessToken) {
      console.error('❌ Access token não encontrado para ambiente:', environment)
      console.error('🔍 Credenciais disponíveis:', {
        hasProd: !!(gatewayCredentials as any).accessTokenProd,
        hasSandbox: !!(gatewayCredentials as any).accessTokenSandbox,
        hasLegacy: !!(gatewayCredentials as any).accessToken,
        environment
      })
      throw new Error(`Credenciais do MercadoPago não configuradas para ambiente ${environment}`)
    }

    console.log('🔑 Usando token:', accessToken.substring(0, 20) + '...')

    // Processar pagamento baseado no método
    let paymentResponse
    
    if (paymentData.paymentMethod === 'pix') {
      console.log('🟢 Criando pagamento PIX...')
      paymentResponse = await createPixPayment(accessToken, paymentData, isProduction)
    } else {
      console.log('💳 Criando pagamento com cartão...')
      if (!paymentData.token) {
        console.error('❌ Token do cartão não fornecido para pagamento com cartão')
        throw new Error('Token do cartão é obrigatório para pagamento com cartão')
      }
      paymentResponse = await createCreditCardPayment(accessToken, paymentData, isProduction)
    }

    console.log('💾 Salvando transação no banco de dados...')
    
    // Primeiro criar/buscar cliente
    let cliente: any
    try {
      console.log('👤 Criando/buscando cliente...')
      
      // Buscar cliente existente por email
      const { data: clienteExistente, error: clienteSearchError } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', paymentData.customerData.email)
        .maybeSingle()
      
      if (clienteSearchError) {
        console.error('❌ Erro ao buscar cliente:', clienteSearchError)
      }
      
      if (clienteExistente) {
        console.log('✅ Cliente existente encontrado:', clienteExistente.id)
        cliente = clienteExistente
      } else {
        console.log('👤 Criando novo cliente...')
        const { data: novoCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            nome: paymentData.customerData.nome,
            email: paymentData.customerData.email,
            cpf: paymentData.customerData.cpf || null
          })
          .select('id')
          .single()
        
        if (clienteError) {
          console.error('❌ Erro ao criar cliente:', clienteError)
          throw new Error('Erro ao criar cliente: ' + clienteError.message)
        }
        
        console.log('✅ Cliente criado com ID:', novoCliente.id)
        cliente = novoCliente
      }
    } catch (clienteError) {
      console.error('❌ Erro crítico ao processar cliente:', clienteError)
      throw new Error('Erro ao processar dados do cliente')
    }
    
    // Agora criar a venda
    let venda: any
    try {
      console.log('💰 Criando venda...')
      
      const { data, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          id_cliente: cliente.id,
          email_cliente: paymentData.customerData.email,
          metodo_pagamento: paymentData.paymentMethod === 'pix' ? 'pix' : 'cartao_credito',
          valor_total: paymentData.totalAmount,
          status: 'pendente',
          external_reference: paymentData.externalReference || paymentResponse?.id?.toString() || null,
          payment_id: paymentResponse?.id?.toString() || null
        })
        .select('id')
        .single()

      if (vendaError) {
        console.error('❌ Erro ao salvar venda:', vendaError)
        throw new Error('Erro ao salvar venda: ' + vendaError.message)
      }
      
      venda = data
      console.log('✅ Venda criada com ID:', venda.id)
      
    } catch (insertError) {
      console.error('❌ Erro crítico ao inserir venda:', insertError)
      throw new Error('Erro ao processar venda: ' + insertError.message)
    }
    
    // Criar itens da venda
    try {
      console.log('📦 Criando itens da venda...')
      
      const itensVenda = paymentData.items.map(item => ({
        id_venda: venda.id,
        id_produto: item.id,
        preco_unitario: item.unit_price,
        quantidade: item.quantity || 1
      }))
      
      const { error: itensError } = await supabase
        .from('itens_da_venda')
        .insert(itensVenda)
      
      if (itensError) {
        console.error('⚠️ Erro ao salvar itens da venda:', itensError)
        // Não quebrar o fluxo se der erro nos itens
      } else {
        console.log('✅ Itens da venda salvos:', itensVenda.length)
      }
      
    } catch (itensError) {
      console.error('⚠️ Erro ao processar itens da venda:', itensError)
      // Não quebrar o fluxo se der erro nos itens
    }

    // Preparar resposta
    const response = {
      success: true,
      payment: paymentResponse,
      orderId: venda?.id || 'unknown',
      redirectUrl: paymentData.paymentMethod === 'pix' 
        ? `/pix/${venda?.id || 'temp'}` 
        : `/obrigado/${venda?.id || 'temp'}`,
      environment,
      webhook: {
        url: 'https://xpljmuqtkdlvsbbsrmjg.supabase.co/functions/v1/mercadopago-webhook',
        configured: true
      }
    }

    // Para PIX, incluir dados específicos
    if (paymentData.paymentMethod === 'pix') {
      response.pixData = paymentResponse;
      response.orderData = {
        totalAmount: paymentData.totalAmount,
        items: paymentData.items
      };
    }

    console.log('🚀 Retornando resposta de sucesso')
    console.log('📊 Resumo:', {
      success: response.success,
      orderId: response.orderId,
      paymentMethod: paymentData.paymentMethod,
      redirectUrl: response.redirectUrl,
      environment: response.environment
    })

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ ERRO CRÍTICO na Edge Function:', error)
    console.error('❌ Stack trace:', error.stack)
    console.error('❌ Timestamp do erro:', new Date().toISOString())
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('❌ Mensagem do erro:', errorMessage)
    
    const errorResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      details: 'Verifique os logs da Edge Function para mais detalhes',
      // Adicionar mais contexto para debug
      errorType: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 5) // Primeiras 5 linhas do stack
    }
    
    console.error('📤 Retornando erro detalhado:', JSON.stringify(errorResponse, null, 2))
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, // Usar status 400 para erros de validação/dados
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function createPixPayment(accessToken: string, paymentData: PaymentRequest, isProduction: boolean) {
  const baseUrl = 'https://api.mercadopago.com'
  console.log('🔗 URL base da API:', baseUrl)

  const paymentBody: any = {
    transaction_amount: paymentData.totalAmount,
    description: `Compra - ${paymentData.items.map(i => i.title).join(', ')}`,
    payment_method_id: 'pix',
    external_reference: paymentData.externalReference || `checkout_${Date.now()}`,
    notification_url: 'https://xpljmuqtkdlvsbbsrmjg.supabase.co/functions/v1/mercadopago-webhook',
    payer: {
      email: paymentData.customerData.email,
      first_name: paymentData.customerData.nome.split(' ')[0],
      last_name: paymentData.customerData.nome.split(' ').slice(1).join(' ') || ''
    }
  }

  // Adicionar CPF apenas se fornecido
  if (paymentData.customerData.cpf && paymentData.customerData.cpf.replace(/\D/g, '').length === 11) {
    paymentBody.payer.identification = {
      type: 'CPF', 
      number: paymentData.customerData.cpf.replace(/\D/g, '')
    }
  }

  console.log('📤 Enviando dados PIX para MercadoPago:', JSON.stringify(paymentBody, null, 2))

  const response = await fetch(`${baseUrl}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(paymentBody)
  })

  const result = await response.json()
  console.log('📥 Resposta da API MercadoPago PIX:', JSON.stringify(result, null, 2))
  
  if (!response.ok) {
    console.error('❌ Erro MP PIX - Status:', response.status)
    console.error('❌ Erro MP PIX - Body:', result)
    throw new Error(result.message || `Erro HTTP ${response.status} ao criar pagamento PIX`)
  }

  console.log('✅ PIX criado com sucesso - ID:', result.id, 'Status:', result.status)
  return result
}

async function createCreditCardPayment(accessToken: string, paymentData: PaymentRequest, isProduction: boolean) {
  const baseUrl = 'https://api.mercadopago.com'
  console.log('🔗 URL base da API:', baseUrl)

  const paymentBody: any = {
    transaction_amount: paymentData.totalAmount,
    token: paymentData.token,
    description: `Compra - ${paymentData.items.map(i => i.title).join(', ')}`,
    installments: paymentData.installments || 1,
    payment_method_id: 'visa', // Will be determined by token
    external_reference: paymentData.externalReference || `checkout_${Date.now()}`,
    notification_url: 'https://xpljmuqtkdlvsbbsrmjg.supabase.co/functions/v1/mercadopago-webhook',
    payer: {
      email: paymentData.customerData.email
    }
  }

  // Adicionar CPF apenas se fornecido
  if (paymentData.customerData.cpf && paymentData.customerData.cpf.replace(/\D/g, '').length === 11) {
    paymentBody.payer.identification = {
      type: 'CPF',
      number: paymentData.customerData.cpf.replace(/\D/g, '')
    }
  }

  console.log('📤 Enviando dados Cartão para MercadoPago:', JSON.stringify({
    ...paymentBody,
    token: paymentData.token?.substring(0, 20) + '...'
  }, null, 2))

  const response = await fetch(`${baseUrl}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(paymentBody)
  })

  const result = await response.json()
  console.log('📥 Resposta da API MercadoPago Cartão:', JSON.stringify(result, null, 2))
  
  if (!response.ok) {
    console.error('❌ Erro MP Cartão - Status:', response.status) 
    console.error('❌ Erro MP Cartão - Body:', result)
    throw new Error(result.message || `Erro HTTP ${response.status} ao processar cartão`)
  }

  console.log('✅ Cartão processado com sucesso - ID:', result.id, 'Status:', result.status)
  return result
}
