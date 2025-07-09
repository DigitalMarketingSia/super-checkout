import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🧪 Webhook Test - Iniciando teste de webhook MercadoPago')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, paymentData } = await req.json()
    console.log('📥 Ação solicitada:', action)

    if (action === 'test_webhook') {
      console.log('🔔 Simulando webhook do MercadoPago...')
      
      // Dados de teste do webhook
      const testWebhookData = paymentData || {
        type: 'payment',
        data: {
          id: `test_${Date.now()}`
        }
      }

      console.log('📤 Enviando dados de teste para webhook:', testWebhookData)

      // Chamar o webhook real
      const webhookResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify(testWebhookData)
      })

      const webhookResult = await webhookResponse.text()
      console.log('📨 Resposta do webhook:', webhookResult)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Teste de webhook executado com sucesso',
          webhookResponse: webhookResult,
          testData: testWebhookData
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    if (action === 'simulate_payment') {
      console.log('💳 Simulando pagamento aprovado...')
      
      // Simular um pagamento aprovado
      const simulatedPayment = {
        type: 'payment',
        data: {
          id: paymentData?.paymentId || `sim_${Date.now()}`
        }
      }

      // Dados simulados do MercadoPago API
      const simulatedMPResponse = {
        id: simulatedPayment.data.id,
        status: 'approved',
        transaction_amount: paymentData?.amount || 197.00,
        external_reference: paymentData?.externalReference || `test_ref_${Date.now()}`,
        payer: {
          email: paymentData?.email || 'teste@supercheckout.com',
          id: `payer_${Date.now()}`
        }
      }

      console.log('💰 Dados simulados do pagamento:', simulatedMPResponse)

      // Simular chamada direta para updateSaleStatus
      console.log('🔄 Simulando atualização de status da venda...')

      // Tentar encontrar uma venda pendente para atualizar
      const { data: vendasPendentes, error: vendasError } = await supabase
        .from('vendas')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(1)

      if (vendasError) {
        console.error('❌ Erro ao buscar vendas pendentes:', vendasError)
        throw vendasError
      }

      if (vendasPendentes && vendasPendentes.length > 0) {
        const venda = vendasPendentes[0]
        console.log('📋 Venda pendente encontrada:', {
          id: venda.id,
          valor: venda.valor_total,
          email: venda.email_cliente
        })

        // Atualizar para concluída
        const { data: vendaAtualizada, error: updateError } = await supabase
          .from('vendas')
          .update({
            status: 'concluida',
            payment_id: simulatedPayment.data.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', venda.id)
          .select()

        if (updateError) {
          console.error('❌ Erro ao atualizar venda:', updateError)
          throw updateError
        }

        console.log('✅ Venda atualizada com sucesso:', vendaAtualizada)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Pagamento simulado e venda atualizada com sucesso',
            vendaAtualizada: vendaAtualizada[0],
            simulatedPayment: simulatedMPResponse
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Nenhuma venda pendente encontrada para simular',
            vendasPendentes: 0
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Ação não reconhecida',
        availableActions: ['test_webhook', 'simulate_payment']
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Erro no teste de webhook:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})