window.onload = function(){
  const nome = document.getElementById("nome");
  const telefone = document.getElementById("telefone");
  const endereco = document.getElementById("endereco");
  const email = document.getElementById("email");
  const valor = document.getElementById("valor");
  const juros = document.getElementById("juros");
  const periodo = document.getElementById("periodo");
  const valorPagamento = document.getElementById("valorPagamento");

  let clientes = JSON.parse(localStorage.getItem("clientes")) || [];
  let clienteAtual = null;

  // === ALERT SOUND ===
  const alerta = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

  // === ADICIONAR CLIENTE ===
  window.adicionarCliente = function(){
    if(!nome.value || !valor.value || !juros.value){
      alert("Preencha os campos obrigatórios");
      return;
    }
    let hoje = Date.now();
    let c = {
      nome: nome.value,
      telefone: telefone.value || "",
      endereco: endereco.value || "",
      email: email.value || "",
      valorInicial: parseFloat(valor.value),
      saldoDevedor: parseFloat(valor.value),
      juros: parseFloat(juros.value),
      periodo: periodo.value,
      dataEmprestimo: hoje,
      ultimaAtualizacao: hoje,
      historico: []
    };
    clientes.push(c); salvar(); limparCampos(); render();
  }

  function limparCampos(){
    nome.value = ""; telefone.value = ""; endereco.value = ""; email.value = "";
    valor.value = ""; juros.value = "";
  }

  // === MODAL PAGAMENTO ===
  window.abrirModal = function(i){ clienteAtual = i; document.getElementById("modal").style.display = "flex"; }
  window.fecharModal = function(){ document.getElementById("modal").style.display = "none"; valorPagamento.value=""; }

  function aplicarJuros(c){
    let agora = Date.now();
    let dias = (agora - c.ultimaAtualizacao)/(1000*60*60*24);
    let aplicar=false;
    if(c.periodo==="semanal"&&dias>=7) aplicar=true;
    if(c.periodo==="quinzenal"&&dias>=15) aplicar=true;
    if(c.periodo==="mensal"&&dias>=30) aplicar=true;
    if(aplicar){
      let jurosValor = c.saldoDevedor*(c.juros/100);
      c.saldoDevedor += jurosValor;
      c.ultimaAtualizacao = agora;
    }
  }

  window.confirmarPagamento = function(){
    let c = clientes[clienteAtual];
    let valorPago = parseFloat(valorPagamento.value);
    if(isNaN(valorPago) || valorPago <= 0){ alert("Digite um valor válido"); return; }
    aplicarJuros(c);
    let jurosAtual = c.saldoDevedor*(c.juros/100);
    let pagoJuros = Math.min(valorPago, jurosAtual);
    let restante = valorPago - pagoJuros;
    let pagoPrincipal = Math.min(restante, c.saldoDevedor);
    c.saldoDevedor -= pagoPrincipal;
    c.historico.push({data:new Date().toLocaleDateString(),valorPago,pagoJuros,pagoPrincipal});
    salvar(); fecharModal(); render();
  }

  window.excluirCliente = function(i){ if(confirm("Deseja realmente excluir este cliente?")){ clientes.splice(i,1); salvar(); render(); } }
  window.editarCliente = function(i){
    let c = clientes[i];
    nome.value = c.nome; telefone.value = c.telefone; endereco.value = c.endereco;
    email.value = c.email; valor.value = c.valorInicial; juros.value = c.juros;
    periodo.value = c.periodo;
    clientes.splice(i,1); salvar(); render();
  }

  function salvar(){ localStorage.setItem("clientes",JSON.stringify(clientes)); }

  // === RENDER CLIENTES ===
  function renderClientes(){
  lista.innerHTML="";
  clientes.forEach((c,i)=>{
    aplicarJuros(c); // atualiza saldo antes de renderizar
    const status=calcularStatus(c);
    const statusLabel=status==="em-dia"?"Em dia":status==="proximo"?"Próximo":"Atrasado";
    const jurosTotalPago=c.historico.reduce((acc,p)=>acc+(p.pagoJuros||0),0);
    const principalPago=c.historico.reduce((acc,p)=>acc+(p.pagoPrincipal||0),0);
    const saldoAtual=c.saldoDevedor.toFixed(2);
    const parcelasPagas = c.historico.length;
    const ultimoPagamento = parcelasPagas ? c.historico[c.historico.length-1].valorPago.toFixed(2) : "0.00";

    lista.innerHTML+=`
    <div class="cliente">
      <div class="status ${status}">${statusLabel}</div>
      <strong>${c.nome}</strong>
      <p>📞 ${c.telefone||"N/A"}</p>
      <p>🏠 ${c.endereco||"N/A"}</p>
      <p>✉️ ${c.email||"N/A"}</p>
      <p>💰 Saldo atual: R$ ${saldoAtual}</p>
      <p>💵 Valor emprestado: R$ ${c.valorInicial.toFixed(2)}</p>
      <p>💸 Juros (% por parcela): ${c.juros.toFixed(2)}%</p>
      <p>📅 Periodicidade: ${c.periodo.charAt(0).toUpperCase()+c.periodo.slice(1)}</p>
      <p>📊 Juros pagos: R$ ${jurosTotalPago.toFixed(2)}</p>
      <p>📊 Parcela paga (principal): R$ ${principalPago.toFixed(2)}</p>
      <p>📦 Parcelas pagas: ${parcelasPagas}</p>
      <p>💳 Último pagamento: R$ ${ultimoPagamento}</p>
      <div class="btn-group">
        <button class="btn-pagamento" onclick="abrirModal(${i})">Registrar Pagamento</button>
        <button class="btn-editar" onclick="editarCliente(${i})">Editar</button>
        <button class="btn-excluir" onclick="excluirCliente(${i})">Excluir</button>
        <button class="btn-whatsapp" onclick="enviarWhatsApp(${i})">Enviar WhatsApp</button>
      </div>
    </div>`;
  });

  document.getElementById("clientesAtrasados").innerText = atrasadosCount;
    atualizarDashboard();
    salvar();
  }

  function atualizarDashboard(){
    let totalEmprestado=0,totalRecebido=0,jurosRecebidos=0;
    clientes.forEach(c=>{ totalEmprestado+=c.valorInicial||0; c.historico.forEach(h=>{ totalRecebido+=h.valorPago||0; jurosRecebidos+=h.pagoJuros||0; }); });
    document.getElementById("totalEmprestado").innerText=totalEmprestado.toFixed(2);
    document.getElementById("totalRecebido").innerText=totalRecebido.toFixed(2);
    document.getElementById("jurosRecebidos").innerText=jurosRecebidos.toFixed(2);
    document.getElementById("lucro").innerText=(totalRecebido).toFixed(2);
  }

  render();
}