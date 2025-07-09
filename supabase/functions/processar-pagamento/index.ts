
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
}

serve(async (req) => {
  console.log('🚀 Edge Function processar-pagamento iniciada')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const paymentData: PaymentRequest = await req.json()
    
    console.log('📥 Dados recebidos:', {
      paymentMethod: paymentData.paymentMethod,
      totalAmount: paymentData.totalAmount,
      gatewayId: paymentData.gatewayId,
      environment: paymentData.environment
    })

    // Validações básicas
    if (!paymentData.customerData?.nome?.trim() || !paymentData.customerData?.email?.trim()) {
      throw new Error('Nome e email são obrigatórios')
    }

    if (!paymentData.items?.length || paymentData.totalAmount <= 0) {
      throw new Error('Itens e valor total são obrigatórios')
    }

    // Buscar credenciais do gateway
    let accessToken: string | undefined
    let environment = paymentData.environment || 'sandbox'

    if (paymentData.gatewayId) {
      console.log('🔍 Buscando gateway:', paymentData.gatewayId)
      
      const { data: gateway, error: gatewayError } = await supabase
        .from('gateways')
        .select('credentials, environment, is_active, type')
        .eq('id', paymentData.gatewayId)
        .single()
      
      if (gatewayError || !gateway) {
        console.error('❌ Gateway não encontrado, usando fallback')
        
        // Fallback para qualquer gateway MercadoPago ativo
        const { data: fallbackGateway } = await supabase
          .from('gateways')
          .select('credentials, environment, is_active')
          .eq('type', 'mercado_pago')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (fallbackGateway) {
          console.log('✅ Gateway fallback encontrado')
          const credentials = fallbackGateway.credentials as any
          environment = fallbackGateway.environment || 'sandbox'
          
          accessToken = environment === 'production' 
            ? credentials.accessTokenProd 
            : credentials.accessTokenSandbox || credentials.accessToken
        }
      } else {
        console.log('✅ Gateway encontrado:', gateway.type)
        const credentials = gateway.credentials as any
        environment = gateway.environment || environment
        
        // Determinar access token baseado no ambiente com validação
        if (environment === 'production') {
          accessToken = credentials.accessTokenProd
          if (!accessToken?.startsWith('APP_USR-')) {
            throw new Error('Credenciais de produção inválidas')
          }
        } else {
          accessToken = credentials.accessTokenSandbox || credentials.accessToken
          if (!accessToken?.startsWith('TEST-')) {
            throw new Error('Credenciais de sandbox inválidas')
          }
        }
      }
    }

    if (!accessToken) {
      throw new Error(`Access token não encontrado para ambiente ${environment}`)
    }

    console.log('🔑 Token encontrado para ambiente:', environment)

    // Processar pagamento
    const baseUrl = 'https://api.mercadopago.com'
    let paymentResponse

    if (paymentData.paymentMethod === 'pix') {
      console.log('🟢 Processando PIX...')
      
      const paymentBody = {
        transaction_amount: paymentData.totalAmount,
        description: `Compra - ${paymentData.items.map(i => i.title).join(', ')}`,
        payment_method_id: 'pix',
        external_reference: paymentData.externalReference || `checkout_${Date.now()}`,
        notification_url: 'https://xpljmuqtkdlvsbbsrmjg.supabase.co/functions/v1/mercadopago-webhook',
        payer: {
          email: paymentData.customerData.email,
          first_name: paymentData.customerData.nome.split(' ')[0],
          last_name: paymentData.customerData.nome.split(' ').slice(1).join(' ') || 'Cliente'
        }
      }

      // Adicionar CPF se fornecido
      if (paymentData.customerData.cpf?.replace(/\D/g, '').length === 11) {
        paymentBody.payer.identification = {
          type: 'CPF',
          number: paymentData.customerData.cpf.replace(/\D/g, '')
        }
      }

      const response = await fetch(`${baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(paymentBody)
      })

      paymentResponse = await response.json()
      
      if (!response.ok) {
        console.error('❌ Erro API PIX:', paymentResponse)
        throw new Error(paymentResponse.message || 'Erro ao processar PIX')
      }
      
    } else if (paymentData.paymentMethod === 'credit_card') {
      console.log('💳 Processando cartão...')
      
      if (!paymentData.token) {
        throw new Error('Token do cartão é obrigatório')
      }

      const paymentBody = {
        transaction_amount: paymentData.totalAmount,
        token: paymentData.token,
        description: `Compra - ${paymentData.items.map(i => i.title).join(', ')}`,
        installments: paymentData.installments || 1,
        payment_method_id: 'visa',
        external_reference: paymentData.externalReference || `checkout_${Date.now()}`,
        notification_url: 'https://xpljmuqtkdlvsbbsrmjg.supabase.co/functions/v1/mercadopago-webhook',
        payer: {
          email: paymentData.customerData.email
        }
      }

      // Adicionar CPF se fornecido
      if (paymentData.customerData.cpf?.replace(/\D/g, '').length === 11) {
        paymentBody.payer.identification = {
          type: 'CPF',
          number: paymentData.customerData.cpf.replace(/\D/g, '')
        }
      }

      const response = await fetch(`${baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(paymentBody)
      })

      paymentResponse = await response.json()
      
      if (!response.ok) {
        console.error('❌ Erro API Cartão:', paymentResponse)
        throw new Error(paymentResponse.message || 'Erro ao processar cartão')
      }
    }

    console.log('✅ Pagamento processado:', paymentResponse.id, paymentResponse.status)

    // Salvar no banco de dados
    // Criar/buscar cliente
    let cliente
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', paymentData.customerData.email)
      .maybeSingle()
    
    if (clienteExistente) {
      cliente = clienteExistente
    } else {
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
        console.error('⚠️ Erro ao criar cliente:', clienteError)
        throw new Error('Erro ao processar dados do cliente')
      }
      
      cliente = novoCliente
    }
    
    // Criar venda
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .insert({
        id_cliente: cliente.id,
        email_cliente: paymentData.customerData.email,
        metodo_pagamento: paymentData.paymentMethod === 'pix' ? 'pix' : 'cartao_credito',
        valor_total: paymentData.totalAmount,
        status: 'pendente',
        external_reference: paymentData.externalReference || paymentResponse?.id?.toString(),
        payment_id: paymentResponse?.id?.toString()
      })
      .select('id')
      .single()

    if (vendaError) {
      console.error('⚠️ Erro ao salvar venda:', vendaError)
    }
    
    // Criar itens da venda
    if (venda) {
      const itensVenda = paymentData.items.map(item => ({
        id_venda: venda.id,
        id_produto: item.id,
        preco_unitario: item.unit_price,
        quantidade: item.quantity || 1
      }))
      
      await supabase.from('itens_da_venda').insert(itensVenda)
    }

    const response = {
      success: true,
      payment: paymentResponse,
      orderId: venda?.id || 'temp',
      redirectUrl: paymentData.paymentMethod === 'pix' 
        ? `/pix/${venda?.id || 'temp'}` 
        : `/obrigado/${venda?.id || 'temp'}`,
      environment
    }

    if (paymentData.paymentMethod === 'pix') {
      response.pixData = paymentResponse
      response.orderData = {
        totalAmount: paymentData.totalAmount,
        items: paymentData.items
      }
    }

    console.log('🚀 Retornando sucesso:', response.orderId)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ ERRO:', error)
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
