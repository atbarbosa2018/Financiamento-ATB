window.onload = function(){

  const nome = document.getElementById("nome");
  const telefone = document.getElementById("telefone");
  const endereco = document.getElementById("endereco");
  const email = document.getElementById("email");
  const valor = document.getElementById("valor");
  const juros = document.getElementById("juros");
  const periodo = document.getElementById("periodo");
  const valorPagamento = document.getElementById("valorPagamento");
  const lista = document.getElementById("lista");

  let clientes = JSON.parse(localStorage.getItem("clientes")) || [];
  let clienteAtualId = null;

  // =========================
  // UTIL
  // =========================
  function salvar(){
    localStorage.setItem("clientes", JSON.stringify(clientes));
  }

  function getCliente(id){
    return clientes.find(c => c.id === id);
  }

  function toast(msg){
    const t = document.getElementById("toast");
    if(!t) return alert(msg);
    t.innerText = msg;
    t.style.display = "block";
    setTimeout(()=>t.style.display="none",2000);
  }

  // =========================
  // CADASTRO
  // =========================
  window.adicionarCliente = function(){

    if(!nome.value || !valor.value || !juros.value){
      toast("Preencha os campos obrigatórios");
      return;
    }

    const valorNum = parseFloat(valor.value);
    const jurosNum = parseFloat(juros.value);

    if(isNaN(valorNum) || valorNum <= 0){
      toast("Valor inválido");
      return;
    }

    if(isNaN(jurosNum) || jurosNum < 0){
      toast("Juros inválido");
      return;
    }

    const cliente = {
      id: Date.now(),
      nome: nome.value.trim(),
      telefone: telefone.value || "",
      endereco: endereco.value || "",
      email: email.value || "",
      valorInicial: valorNum,
      saldoDevedor: valorNum,
      juros: jurosNum,
      periodo: periodo?.value || "mensal",
      dataEmprestimo: new Date().toISOString(),
      historico: []
    };

    clientes.push(cliente);
    salvar();
    limparCampos();
    render();
    toast("Cliente adicionado");
  }

  function limparCampos(){
    nome.value = "";
    telefone.value = "";
    endereco.value = "";
    email.value = "";
    valor.value = "";
    juros.value = "";
  }

  // =========================
  // MODAL
  // =========================
  window.abrirModal = function(id){
    clienteAtualId = id;
    document.getElementById("modal").classList.add("active");
    valorPagamento.value = "";
  }

  window.fecharModal = function(){
    document.getElementById("modal").classList.remove("active");
  }

  // =========================
  // PAGAMENTO (JUROS FIXO)
  // =========================
  window.confirmarPagamento = function(){

    const cliente = getCliente(clienteAtualId);
    const valorPago = parseFloat(valorPagamento.value);

    if(!cliente){
      toast("Cliente não encontrado");
      return;
    }

    if(isNaN(valorPago) || valorPago <= 0){
      toast("Valor inválido");
      return;
    }

    const jurosParcela = cliente.valorInicial * (cliente.juros / 100);

    const pagoJuros = Math.min(valorPago, jurosParcela);
    const restante = valorPago - pagoJuros;
    const pagoPrincipal = Math.min(restante, cliente.saldoDevedor);

    cliente.saldoDevedor = Math.max(0, cliente.saldoDevedor - pagoPrincipal);

    cliente.historico.push({
      data: new Date().toLocaleDateString(),
      valorPago,
      pagoJuros,
      pagoPrincipal,
      saldoRestante: cliente.saldoDevedor
    });

    salvar();
    fecharModal();
    render();
    toast("Pagamento registrado");
  }

  // =========================
  // EXCLUIR
  // =========================
  window.excluirCliente = function(id){
    if(confirm("Deseja realmente excluir este cliente?")){
      clientes = clientes.filter(c => c.id !== id);
      salvar();
      render();
      toast("Cliente excluído");
    }
  }

  // =========================
  // EDITAR
  // =========================
  window.editarCliente = function(id){
    const c = getCliente(id);
    if(!c) return;

    nome.value = c.nome;
    telefone.value = c.telefone;
    endereco.value = c.endereco;
    email.value = c.email;
    valor.value = c.valorInicial;
    juros.value = c.juros;
    if(periodo) periodo.value = c.periodo;

    clientes = clientes.filter(x => x.id !== id);
    salvar();
    render();
  }

  // =========================
  // STATUS
  // =========================
  function calcularStatus(c){
    const hoje = new Date();
    const inicio = new Date(c.dataEmprestimo);
    const dias = (hoje - inicio) / (1000 * 60 * 60 * 24);

    let prazo = 30;
    if(c.periodo === "semanal") prazo = 7;
    if(c.periodo === "quinzenal") prazo = 15;

    if(dias > prazo) return "atrasado";
    if(dias >= prazo * 0.75) return "proximo";
    return "em-dia";
  }

  // =========================
  // RENDER
  // =========================
  function render(){

    lista.innerHTML = clientes.map(c => {

      const status = calcularStatus(c);
      const jurosTotal = c.historico.reduce((a,h)=>a+(h.pagoJuros||0),0);

      return `
      <div class="cliente">
        <strong>${c.nome}</strong>
        <p>Saldo: R$ ${c.saldoDevedor.toFixed(2)}</p>
        <p>Juros pagos: R$ ${jurosTotal.toFixed(2)}</p>

        <div class="btn-group">
          <button onclick="abrirModal(${c.id})">Pagamento</button>
          <button onclick="editarCliente(${c.id})">Editar</button>
          <button onclick="excluirCliente(${c.id})">Excluir</button>
          <button onclick="enviarWhatsApp(${c.id})">Whats</button>
        </div>
      </div>
      `;
    }).join("");

    atualizarDashboard();
  }

  // =========================
  // DASHBOARD
  // =========================
  function atualizarDashboard(){

    let totalEmprestado = 0;
    let totalRecebido = 0;
    let jurosRecebidos = 0;

    clientes.forEach(c=>{
      totalEmprestado += c.valorInicial;

      c.historico.forEach(h=>{
        totalRecebido += h.valorPago;
        jurosRecebidos += h.pagoJuros;
      });
    });

    document.getElementById("totalEmprestado").innerText = totalEmprestado.toFixed(2);
    document.getElementById("totalRecebido").innerText = totalRecebido.toFixed(2);
    document.getElementById("jurosRecebidos").innerText = jurosRecebidos.toFixed(2);
    document.getElementById("lucro").innerText = jurosRecebidos.toFixed(2);
  }

  // =========================
  // WHATSAPP
  // =========================
  window.enviarWhatsApp = function(id){
    const c = getCliente(id);
    if(!c || !c.telefone){
      toast("Telefone não informado");
      return;
    }

    const tel = c.telefone.replace(/\D/g,'');
    const msg = `Olá ${c.nome}, esta chegando a data de vencimento de sua parcela e seu saldo é R$ ${c.saldoDevedor.toFixed(2)}`;

    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`);
  }

  render();
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("PWA pronto"))
    .catch(err => console.log("Erro PWA:", err));
}