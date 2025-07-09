
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('📢 Webhook MercadoPago recebido')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente não configuradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const webhookData = await req.json()
    
    console.log('📥 Dados do webhook:', {
      action: webhookData.action,
      type: webhookData.type,
      dataId: webhookData.data?.id,
      topic: webhookData.topic
    })

    // Verificar se é uma notificação de pagamento
    if (webhookData.type === 'payment' || webhookData.topic === 'payment') {
      const paymentId = webhookData.data?.id
      
      if (!paymentId) {
        console.log('⚠️ Webhook sem payment ID')
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      console.log('💳 Processando pagamento:', paymentId)

      // Buscar gateway para obter access token
      const { data: gateway } = await supabase
        .from('gateways')
        .select('credentials, environment')
        .eq('type', 'mercado_pago')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!gateway) {
        console.error('❌ Nenhum gateway MercadoPago ativo encontrado')
        return new Response('Gateway não encontrado', { status: 400, headers: corsHeaders })
      }

      const credentials = gateway.credentials as any
      const environment = gateway.environment || 'sandbox'
      
      const accessToken = environment === 'production' 
        ? credentials.accessTokenProd 
        : credentials.accessTokenSandbox || credentials.accessToken

      if (!accessToken) {
        console.error('❌ Access token não encontrado')
        return new Response('Credenciais não configuradas', { status: 400, headers: corsHeaders })
      }

      // Consultar detalhes do pagamento na API do MercadoPago
      console.log('🔍 Consultando pagamento na API...')
      
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!paymentResponse.ok) {
        console.error('❌ Erro ao consultar pagamento:', paymentResponse.status)
        return new Response('Erro ao consultar pagamento', { status: 400, headers: corsHeaders })
      }

      const paymentDetails = await paymentResponse.json()
      
      console.log('📊 Detalhes do pagamento:', {
        id: paymentDetails.id,
        status: paymentDetails.status,
        externalReference: paymentDetails.external_reference,
        amount: paymentDetails.transaction_amount
      })

      // Atualizar status da venda no banco
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('id, status')
        .eq('payment_id', paymentId.toString())
        .maybeSingle()

      if (!venda) {
        // Tentar buscar por external_reference
        const { data: vendaByRef } = await supabase
          .from('vendas')
          .select('id, status')
          .eq('external_reference', paymentDetails.external_reference)
          .maybeSingle()
        
        if (vendaByRef) {
          console.log('📝 Venda encontrada por external_reference')
          
          // Atualizar com payment_id
          await supabase
            .from('vendas')
            .update({ payment_id: paymentId.toString() })
            .eq('id', vendaByRef.id)
        } else {
          console.log('⚠️ Venda não encontrada para payment_id:', paymentId)
          return new Response('OK', { status: 200, headers: corsHeaders })
        }
      }

      // Determinar novo status baseado no status do MercadoPago
      let novoStatus = 'pendente'
      
      switch (paymentDetails.status) {
        case 'approved':
          novoStatus = 'paga'
          break
        case 'rejected':
        case 'cancelled':
          novoStatus = 'cancelada'
          break
        case 'pending':
        case 'in_process':
          novoStatus = 'pendente'
          break
        case 'refunded':
          novoStatus = 'cancelada'
          break
        default:
          console.log('⚠️ Status desconhecido:', paymentDetails.status)
          novoStatus = 'pendente'
      }

      // Atualizar status da venda
      const vendaId = venda?.id || vendaByRef?.id
      
      if (vendaId) {
        const { error: updateError } = await supabase
          .from('vendas')
          .update({ 
            status: novoStatus,
            payment_id: paymentId.toString()
          })
          .eq('id', vendaId)

        if (updateError) {
          console.error('❌ Erro ao atualizar venda:', updateError)
        } else {
          console.log('✅ Status da venda atualizado:', {
            vendaId,
            novoStatus,
            paymentStatus: paymentDetails.status
          })
        }
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    return new Response('Erro interno', { status: 500, headers: corsHeaders })
  }
})
