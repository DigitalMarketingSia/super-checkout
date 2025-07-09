
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

serve(async (req) => {
  console.log('🔔 Webhook MercadoPago - Nova requisição:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📋 Respondendo OPTIONS (CORS preflight)');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Always accept GET requests for health check
  if (req.method === 'GET') {
    console.log('❤️ Health check recebido');
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: 'Webhook MercadoPago está funcionando'
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  // Only process POST requests for actual webhooks
  if (req.method !== 'POST') {
    console.log('⚠️ Método não suportado:', req.method);
    return new Response(
      JSON.stringify({ error: 'Método não suportado' }),
      { 
        status: 405,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  try {
    console.log('🔍 Processando webhook POST...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook data
    let webhookData;
    try {
      const bodyText = await req.text();
      console.log('📥 Body recebido (raw):', bodyText);
      
      if (!bodyText) {
        console.log('⚠️ Body vazio recebido');
        return new Response(
          JSON.stringify({ received: true, message: 'Body vazio processado' }),
          { 
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      webhookData = JSON.parse(bodyText);
      console.log('📥 Dados do webhook parseados:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'JSON inválido',
          received: true,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, // Retornar 200 para não causar retry no MP
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Log do webhook recebido para auditoria
    await logWebhookReceived(supabase, webhookData, req.headers);

    // Process different webhook types
    if (webhookData.type === 'payment') {
      console.log('💳 Processando webhook de pagamento...');
      await processPaymentWebhook(supabase, webhookData);
    } else {
      console.log('ℹ️ Tipo de webhook não processado:', webhookData.type);
    }

    // Always return 200 to prevent retries from MercadoPago
    return new Response(
      JSON.stringify({ 
        received: true, 
        timestamp: new Date().toISOString(),
        type: webhookData.type || 'unknown',
        processed: true
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral no webhook:', error);
    
    // Always return 200 to prevent infinite retries
    return new Response(
      JSON.stringify({
        received: true,
        error: 'Erro processado',
        message: error.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function logWebhookReceived(supabase: any, webhookData: any, headers: Headers) {
  try {
    console.log('📝 Registrando webhook recebido...');
    
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'mercadopago',
        event_type: webhookData.type || 'unknown',
        payload: webhookData,
        headers: Object.fromEntries(headers.entries()),
        processed_at: new Date().toISOString()
      });
      
    console.log('✅ Webhook registrado nos logs');
  } catch (error) {
    console.error('❌ Erro ao registrar webhook:', error);
    // Não falhar o webhook por causa do log
  }
}

async function processPaymentWebhook(supabase: any, webhookData: any) {
  const paymentId = webhookData.data?.id;
  
  if (!paymentId) {
    console.log('⚠️ Webhook sem ID de pagamento');
    return;
  }

  console.log('💳 Processando webhook para pagamento:', paymentId);

  // Buscar access token dos gateways configurados
  let accessToken = null;
  let workingGateway = null;
  
  try {
    console.log('🔍 Buscando credenciais dos gateways...');
    const { data: gateways, error: gatewayError } = await supabase
      .from('gateways')
      .select('*')
      .eq('type', 'mercado_pago')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (gatewayError) {
      console.error('❌ Erro ao buscar gateways:', gatewayError);
      return;
    }

    if (!gateways || gateways.length === 0) {
      console.error('❌ Nenhum gateway MercadoPago ativo encontrado');
      return;
    }

    // Tentar com cada gateway até encontrar um que funcione
    for (const gateway of gateways) {
      console.log('🔧 Testando gateway:', gateway.name, 'Environment:', gateway.environment);
      
      const credentials = gateway.credentials as any;
      const testTokens = [];
      
      // Priorizar tokens baseados no ambiente do gateway
      if (gateway.environment === 'production') {
        if (credentials.accessTokenProd) {
          testTokens.push({ token: credentials.accessTokenProd, env: 'production' });
        }
        if (credentials.accessToken && credentials.accessToken.startsWith('APP_USR-')) {
          testTokens.push({ token: credentials.accessToken, env: 'production' });
        }
      }
      
      if (gateway.environment === 'sandbox' || !gateway.environment) {
        if (credentials.accessTokenSandbox) {
          testTokens.push({ token: credentials.accessTokenSandbox, env: 'sandbox' });
        }
        if (credentials.accessToken && credentials.accessToken.startsWith('TEST-')) {
          testTokens.push({ token: credentials.accessToken, env: 'sandbox' });
        }
      }
      
      for (const { token, env } of testTokens) {
        console.log(`🔑 Testando token ${env}:`, token.substring(0, 20) + '...');
        
        try {
          const testResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (testResponse.ok) {
            accessToken = token;
            workingGateway = gateway;
            console.log(`✅ Token ${env} funcionou! Usando gateway: ${gateway.name}`);
            break;
          } else {
            const errorText = await testResponse.text();
            console.log(`❌ Token ${env} retornou status:`, testResponse.status, errorText);
          }
        } catch (err) {
          console.log(`❌ Erro ao testar token ${env}:`, err.message);
        }
      }
      
      if (accessToken) break;
    }

  } catch (error) {
    console.error('❌ Erro ao buscar credenciais dos gateways:', error);
  }
  
  if (!accessToken) {
    console.error('❌ Nenhum access token válido encontrado nos gateways');
    return;
  }

  console.log('🔑 Usando access token encontrado do gateway:', workingGateway?.name);

  try {
    // Get payment details from Mercado Pago API
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Erro na API do MercadoPago:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('📄 Resposta de erro:', errorText);
      return;
    }

    const paymentDetails = await response.json();
    console.log('💳 Detalhes do pagamento obtidos:', {
      id: paymentDetails.id,
      status: paymentDetails.status,
      transaction_amount: paymentDetails.transaction_amount,
      external_reference: paymentDetails.external_reference,
      payer_email: paymentDetails.payer?.email,
      payment_method_id: paymentDetails.payment_method_id,
      payment_type_id: paymentDetails.payment_type_id
    });

    // Update payment status in our database
    await updateSaleStatus(supabase, paymentDetails);

  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do pagamento:', error);
  }
}

async function updateSaleStatus(supabase: any, paymentDetails: any) {
  const { id: paymentId, status, transaction_amount, external_reference, payer } = paymentDetails;
  
  console.log('🔄 Atualizando status da venda:', {
    paymentId,
    status,
    transaction_amount,
    external_reference,
    payer_email: payer?.email
  });
  
  let updateData: any = {
    payment_id: paymentId.toString(),
    updated_at: new Date().toISOString(),
    webhook_data: paymentDetails
  };
  
  // Map MercadoPago status to our status
  switch (status) {
    case 'approved':
      updateData.status = 'concluida';
      console.log('✅ Pagamento aprovado - mudando para concluida');
      break;
    case 'rejected':
    case 'cancelled':
      updateData.status = 'cancelada';
      console.log('❌ Pagamento rejeitado/cancelado - mudando para cancelada');
      break;
    case 'pending':
    case 'in_process':
      updateData.status = 'pendente';
      console.log('⏳ Pagamento pendente - mantendo pendente');
      break;
    default:
      console.log('❓ Status desconhecido:', status, '- atualizando payment_id apenas');
      break;
  }

  console.log('📝 Dados para update:', updateData);

  let saleUpdated = false;

  // Estratégia 1: Buscar por external_reference (mais confiável)
  if (external_reference && !saleUpdated) {
    console.log('🔍 Estratégia 1 - Buscando por external_reference:', external_reference);
    
    const { data: saleByRef, error: refError } = await supabase
      .from('vendas')
      .update(updateData)
      .eq('external_reference', external_reference)
      .select();

    if (refError) {
      console.error('❌ Erro ao atualizar por external_reference:', refError);
    } else if (saleByRef && saleByRef.length > 0) {
      console.log('✅ Venda atualizada por external_reference:', saleByRef[0].id);
      saleUpdated = true;
    }
  }
  
  // Estratégia 2: Buscar por payment_id se não atualizou ainda
  if (paymentId && !saleUpdated) {
    console.log('🔍 Estratégia 2 - Buscando por payment_id:', paymentId);
    
    const { data: saleByPaymentId, error: paymentIdError } = await supabase
      .from('vendas')
      .update(updateData)
      .eq('payment_id', paymentId.toString())
      .select();

    if (paymentIdError) {
      console.error('❌ Erro ao atualizar por payment_id:', paymentIdError);
    } else if (saleByPaymentId && saleByPaymentId.length > 0) {
      console.log('✅ Venda atualizada por payment_id:', saleByPaymentId[0].id);
      saleUpdated = true;
    }
  }

  // Estratégia 3: Buscar por email e valor
  if (payer?.email && transaction_amount && !saleUpdated) {
    console.log('🔍 Estratégia 3 - Buscando por email e valor');
    
    const { data: saleByDetails, error: detailsError } = await supabase
      .from('vendas')
      .update(updateData)
      .eq('email_cliente', payer.email)
      .eq('valor_total', transaction_amount)
      .in('status', ['pendente', 'processando'])
      .order('created_at', { ascending: false })
      .limit(1)
      .select();

    if (detailsError) {
      console.error('❌ Erro ao atualizar por email e valor:', detailsError);
    } else if (saleByDetails && saleByDetails.length > 0) {
      console.log('✅ Venda atualizada por email e valor:', saleByDetails[0].id);
      saleUpdated = true;
    }
  }

  if (!saleUpdated) {
    console.log('❌ Nenhuma venda foi atualizada para o pagamento:', paymentId);
    console.log('📊 Dados tentados:', {
      external_reference,
      paymentId,
      payer_email: payer?.email,
      transaction_amount
    });
  } else {
    console.log('✅ Venda atualizada com sucesso via webhook');
  }
}
