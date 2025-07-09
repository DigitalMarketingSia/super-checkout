

export const PixSection = () => {
  const getPaymentIconSrc = () => {
    return '/lovable-uploads/c632bc7c-b801-4e34-8b6c-21f8edec3efa.png';
  };

  return (
    <div className="checkout-padrao-pix-section">
      <div className="checkout-padrao-pix-header">
        <img 
          src={getPaymentIconSrc()} 
          alt="Ícone PIX"
          className="w-6 h-6"
        />
        <h3>Pagamento via PIX</h3>
      </div>
      
      <div className="checkout-padrao-pix-step">
        <div className="checkout-padrao-pix-step-icon">1</div>
        <div className="checkout-padrao-pix-step-content">
          <h4 className="checkout-padrao-pix-step-title">Copie os dados de pagamento</h4>
          <p className="checkout-padrao-pix-step-description">
            Após apertar no botão verde abaixo, você poderá escanear o QR CODE ou copiar o nosso código.
          </p>
        </div>
      </div>

      <div className="checkout-padrao-pix-step">
        <div className="checkout-padrao-pix-step-icon">2</div>
        <div className="checkout-padrao-pix-step-content">
          <h4 className="checkout-padrao-pix-step-title">Faça o Pagamento</h4>
          <p className="checkout-padrao-pix-step-description">
            Abra o aplicativo do seu banco, escolha a opção PIX copie e cole o código. Ou escaneie o QR Code.
          </p>
        </div>
      </div>

      <div className="checkout-padrao-pix-step">
        <div className="checkout-padrao-pix-step-icon">3</div>
        <div className="checkout-padrao-pix-step-content">
          <h4 className="checkout-padrao-pix-step-title">Pronto!</h4>
          <p className="checkout-padrao-pix-step-description">
            Após realizar o pagamento, nosso sistema processará e liberará o seu pedido em instantes.
          </p>
        </div>
      </div>
    </div>
  );
};

