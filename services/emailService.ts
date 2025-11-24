import { storage, supabase } from './storageService';
import { Order } from '../types';

interface EmailData {
    to: string;
    subject: string;
    html: string;
}

class EmailService {
    private async sendEmail(data: EmailData): Promise<boolean> {
        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: data
            });

            if (error) {
                console.error('[EmailService] Error sending email:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[EmailService] Network error:', error);
            return false;
        }
    }

    async sendPaymentApproved(order: Order) {
        const productName = order.items?.[0]?.name || 'seu produto';

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Liberado!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6;">
    <center style="width: 100%; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px 0; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; text-align: center;">
                        <p style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-top: 0; margin-bottom: 20px;">
                            Olá, ${order.customer_name}!
                        </p>
                        <p style="font-size: 16px; line-height: 1.5; color: #555555; margin-bottom: 30px;">
                            Seu pagamento para o produto <strong>${productName}</strong> foi aprovado com sucesso!
                            <br>Você já pode acessar seu produto e começar agora mesmo.
                        </p>
                        <div style="margin: 0 auto 40px auto; display: block;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: #007bff; text-align: center;">
                                        <a href="#" target="_blank" 
                                           style="background: #007bff; border: 1px solid #007bff; padding: 12px 25px; color: #ffffff; display: inline-block; 
                                                  font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; text-decoration: none; border-radius: 6px;">
                                            ACESSAR ÁREA DE MEMBROS
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <p style="font-size: 14px; line-height: 1.5; color: #555555; margin-top: 0; margin-bottom: 20px;">
                            Conte com nosso time de suporte se precisar de qualquer ajuda.<br>
                            Atenciosamente,<br>
                            <strong>Super Checkout</strong>
                        </p>
                    </td>
                </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #AAAAAA; text-align: center; border-top: 1px solid #eeeeee; margin-top: 30px;">
                        Este é um e-mail automático transacional e não deve ser respondido.<br>
                        Seu ${productName} é um lançamento da Super Checkout.
                    </td>
                </tr>
            </table>
        </div>
    </center>
</body>
</html>
    `;

        await this.sendEmail({
            to: order.customer_email,
            subject: `Pagamento Aprovado - Acesso Liberado!`,
            html
        });
    }

    async sendBoletoGenerated(order: Order, boletoUrl: string, barcode: string) {
        const productName = order.items?.[0]?.name || 'seu produto';

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boleto Gerado</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6;">
    <center style="width: 100%; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px 0; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; text-align: center;">
                        <p style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-top: 0; margin-bottom: 20px;">
                            Olá, ${order.customer_name}!
                        </p>
                        <p style="font-size: 16px; line-height: 1.5; color: #555555; margin-bottom: 30px;">
                            Seu boleto para o produto <strong>${productName}</strong> foi gerado com sucesso!
                            <br>Efetue o pagamento para liberar o acesso.
                        </p>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 30px; text-align: left;">
                            <p style="font-size: 14px; color: #856404; margin: 0 0 10px 0; font-weight: bold;">⚠️ Atenção</p>
                            <p style="font-size: 13px; color: #856404; margin: 0; line-height: 1.5;">
                                O boleto pode levar até 3 dias úteis para ser compensado após o pagamento.
                            </p>
                        </div>

                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                            <p style="font-size: 14px; color: #888888; margin: 0 0 10px 0;">Valor do Boleto</p>
                            <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 0 0 20px 0;">R$ ${order.amount.toFixed(2)}</p>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: #28a745; text-align: center;">
                                        <a href="${boletoUrl}" target="_blank" 
                                           style="background: #28a745; border: 1px solid #28a745; padding: 12px 25px; color: #ffffff; display: inline-block; 
                                                  font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; text-decoration: none; border-radius: 6px;">
                                            VISUALIZAR BOLETO
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                            <p style="font-size: 12px; color: #888888; margin: 0 0 8px 0;">Código de Barras</p>
                            <p style="font-size: 13px; font-family: 'Courier New', monospace; color: #1a1a1a; margin: 0; word-break: break-all; line-height: 1.6;">
                                ${barcode}
                            </p>
                        </div>

                        <p style="font-size: 14px; line-height: 1.5; color: #555555; margin-top: 0; margin-bottom: 20px;">
                            Após a confirmação do pagamento, você receberá um e-mail com os dados de acesso.<br><br>
                            Conte com nosso time de suporte se precisar de qualquer ajuda.<br>
                            Atenciosamente,<br>
                            <strong>Super Checkout</strong>
                        </p>
                    </td>
                </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #AAAAAA; text-align: center; border-top: 1px solid #eeeeee; margin-top: 30px;">
                        Este é um e-mail automático transacional e não deve ser respondido.<br>
                        Seu ${productName} é um lançamento da Super Checkout.
                    </td>
                </tr>
            </table>
        </div>
    </center>
</body>
</html>
    `;

        await this.sendEmail({
            to: order.customer_email,
            subject: `Boleto Gerado - ${productName}`,
            html
        });
    }
}

export const emailService = new EmailService();
