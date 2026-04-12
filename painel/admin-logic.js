// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDPBZSxW8XjtQmDMUknzAyIlFda51MvMJY",
    databaseURL: "https://catalogo-abella-joias-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let pedidoEditando = null;
const fMoeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// NAVEGAÇÃO
function showTab(id, btn) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    if(btn) btn.classList.add('active');
}

// BUSCA AUTOMÁTICA POR SKU (PARA O EDITOR DE PEDIDOS)
function buscarDadosProduto(sku, inputElement) {
    if(!sku) return;
    db.ref('products').once('value', s => {
        let achou = false;
        s.forEach(child => {
            const p = child.val();
            if(p.sku && p.sku.toLowerCase() === sku.toLowerCase()) {
                const card = inputElement.closest('.item-editor');
                card.querySelector('.in-nome').value = p.name || '';
                card.querySelector('.in-peso').value = p.weight || p.peso || 0;
                card.querySelector('.in-preco').value = p.price || 0;
                card.querySelector('.in-foto').value = p.image || '';
                achou = true;
            }
        });
        if(achou) recalcularTotalEd();
        inputElement.style.borderColor = achou ? "#333" : "red";
    });
}

function carregarPedidos() {
    const busca = document.getElementById('buscaPedido')?.value.toLowerCase() || "";
    db.ref('orders').on('value', s => {
        const lista = document.getElementById('listaPedidos');
        if(!lista) return;
        lista.innerHTML = '';
        
        // Inverter para mostrar os mais recentes primeiro
        const pedidos = [];
        s.forEach(child => { pedidos.unshift({key: child.key, ...child.val()}); });

        pedidos.forEach(p => {
            const nomeCli = (p.cliente?.nome || "").toLowerCase();
            if(busca && !nomeCli.includes(busca)) return;

            lista.innerHTML += `
            <div class="card border-l-4 border-[#caa85c] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3 group">
                <div class="flex-grow">
                    <div class="flex items-center gap-2">
                         <b class="text-[#caa85c] uppercase text-sm">${p.cliente?.nome || 'Cliente Sem Nome'}</b>
                         <span class="text-[9px] bg-[#222] px-2 py-0.5 rounded text-gray-400">ID: ${p.key.substring(1,6)}</span>
                    </div>
                    <p class="text-[10px] text-gray-500 mt-1">
                        📅 ${p.data || '---'} | 📦 ${p.totalPecas || 0} peças | ⚖️ ${(p.pesoTotal || 0).toFixed(2)}g
                    </p>
                </div>

                <div class="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-[#222] pt-2 md:pt-0">
                    <div class="text-right mr-4">
                        <div class="font-bold text-white text-sm">${fMoeda(p.total)}</div>
                    </div>
                    
                    <button class="btn bg-blue-900/20 text-blue-400 border-blue-900/50 hover:bg-blue-900" 
                            onclick="abrirEditorPedido('${p.key}')" title="Editar Pedido">
                        ✏️ <span class="hidden md:inline ml-1">Editar</span>
                    </button>

                    <button class="btn hover:border-[#caa85c]" 
                            onclick="duplicarPedido('${p.key}')" title="Duplicar Pedido">
                        👯
                    </button>

                    <button class="btn bg-red-900/10 text-red-500 border-red-900/30 hover:bg-red-600 hover:text-white" 
                            onclick="excluirPedido('${p.key}')" title="Excluir Pedido">
                        🗑️
                    </button>
                </div>
            </div>`;
        });
    });
}
function abrirEditorPedido(id) {
    pedidoEditando = id;
    db.ref('orders/'+id).once('value', s => {
        const p = s.val();
        document.getElementById('edClienteNome').value = p.cliente?.nome || '';
        document.getElementById('edClienteTel').value = p.cliente?.telefone || '';
        document.getElementById('edRua').value = p.entrega?.rua || '';
        document.getElementById('edCidade').value = p.entrega?.cidade || '';
        document.getElementById('edDescPromo').value = p.descontoPromo || 0;
        document.getElementById('edDescPix').value = p.descontoPix || 0;
        document.getElementById('edFrete').value = p.frete || 0;
        
        document.getElementById('edItens').innerHTML = '';
        const itens = Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {});
        itens.forEach(addItemEditor);
        
        recalcularTotalEd();
        document.getElementById('editorPedido').classList.remove('hidden');
    });
}

function addItemEditor(i={}) {
    const div = document.createElement('div');
    div.className = "item-editor card bg-black/40 border-[#222] p-3 relative group mb-2";
    div.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div>
                <label class="text-[8px] text-gray-500 uppercase">SKU</label>
                <input class="in-sku !mb-0 text-[10px]" value="${i.sku||''}" onblur="buscarDadosProduto(this.value, this)">
            </div>
            <div class="md:col-span-2">
                <label class="text-[8px] text-gray-500 uppercase">Produto</label>
                <input class="in-nome !mb-0 text-[10px]" value="${i.name||i.nome||''}">
            </div>
            <div>
                <label class="text-[8px] text-gray-500 uppercase">Peso(g)</label>
                <input type="number" class="in-peso !mb-0 text-[10px]" value="${i.peso||i.weight||0}" oninput="recalcularTotalEd()">
            </div>
            <div>
                <label class="text-[8px] text-gray-500 uppercase">Preço</label>
                <input type="number" class="in-preco !mb-0 text-[10px]" value="${i.price||i.precoFinal||0}" oninput="recalcularTotalEd()">
            </div>
            <div>
                <label class="text-[8px] text-gray-500 uppercase">Qtd</label>
                <input type="number" class="in-qtd !mb-0 text-[10px] font-bold text-[#caa85c]" value="${i.quantidade||i.qtd||1}" oninput="recalcularTotalEd()">
            </div>
            <input type="hidden" class="in-foto" value="${i.image||i.foto||''}">
        </div>
        <button class="absolute -right-2 -top-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs" onclick="this.parentElement.remove();recalcularTotalEd();">×</button>
    `;
    document.getElementById('edItens').appendChild(div);
}

function recalcularTotalEd() {
    let subtotal = 0, qtdT = 0;
    document.querySelectorAll('.item-editor').forEach(div => {
        const p = Number(div.querySelector('.in-preco').value);
        const q = Number(div.querySelector('.in-qtd').value);
        subtotal += (p * q);
        qtdT += q;
    });
    const dP = Number(document.getElementById('edDescPromo').value);
    const dX = Number(document.getElementById('edDescPix').value);
    const f = Number(document.getElementById('edFrete').value);
    const total = subtotal - dP - dX + f;
    
    document.getElementById('totalPreview').innerText = fMoeda(total);
    document.getElementById('edQtdTotal').value = qtdT;
}

function salvarPedidoEditado() {
    const itens = [];
    document.querySelectorAll('.item-editor').forEach(div => {
        itens.push({
            sku: div.querySelector('.in-sku').value,
            name: div.querySelector('.in-nome').value,
            peso: Number(div.querySelector('.in-peso').value),
            price: Number(div.querySelector('.in-preco').value),
            quantidade: Number(div.querySelector('.in-qtd').value),
            image: div.querySelector('.in-foto').value
        });
    });

    const totalPecas = itens.reduce((acc, i) => acc + i.quantidade, 0);
    const subtotal = itens.reduce((acc, i) => acc + (i.price * i.quantidade), 0);
    const dP = Number(document.getElementById('edDescPromo').value);
    const dX = Number(document.getElementById('edDescPix').value);
    const f = Number(document.getElementById('edFrete').value);

    db.ref('orders/'+pedidoEditando).update({
        cliente: { nome: document.getElementById('edClienteNome').value, telefone: document.getElementById('edClienteTel').value },
        entrega: { rua: document.getElementById('edRua').value, cidade: document.getElementById('edCidade').value },
        itens, totalPecas, subtotal, 
        descontoPromo: dP, descontoPix: dX, frete: f,
        total: (subtotal - dP - dX + f)
    }).then(() => { alert("Salvo!"); fecharEditorPedido(); });
}

function duplicarPedido(id) {
    db.ref('orders/'+id).once('value', s => {
        const novo = s.val();
        novo.data = new Date().toLocaleString('pt-BR') + " (Cópia)";
        db.ref('orders').push(novo).then(() => alert("Pedido Duplicado!"));
    });
}

function excluirPedido(id) {
    if(confirm("Excluir este pedido permanentemente?")) {
        db.ref('orders/'+id).remove().then(() => fecharEditorPedido());
    }
}

function fecharEditorPedido() { 
    document.getElementById('editorPedido').classList.add('hidden'); 
}

// SISTEMA DE ROMANEIO (6 TIPOS)
function imprimirRomaneio(id, tipo) {
    db.ref('orders/'+id).once('value', async s => {
        const p = s.val();
        const empSnap = await db.ref('settings/empresa').once('value');
        const emp = empSnap.val() || { nome: "Abella Joias" };
        const itens = Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {});
        
        let cabecalho = `<div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:10px;">
            <h1 style="margin:0; font-family:serif;">${emp.nome}</h1>
            <p style="font-size:10px; margin:0;">PEDIDO: ${id.substring(1,8).toUpperCase()} | DATA: ${p.data}</p>
        </div>
        <div style="font-size:11px; margin-bottom:15px;">
            <b>CLIENTE:</b> ${p.cliente?.nome} | <b>WHATS:</b> ${p.cliente?.telefone}<br>
            <b>ENDEREÇO:</b> ${p.entrega?.rua}, ${p.entrega?.cidade}
        </div>`;

        let corpo = "";
        const mostrarPreco = [2, 5, 6].includes(tipo);
        const mostrarFoto = [3, 6].includes(tipo);
        const emGrade = [4, 5, 6].includes(tipo);

        if (emGrade) {
            corpo = `<div class="grid-romaneio">`;
            itens.forEach(i => {
                corpo += `
                <div class="item-grade">
                    ${mostrarFoto ? `<img src="${i.image || ''}">` : ''}
                    <div class="item-grade-info">
                        <b>${i.sku}</b> - ${i.name}<br>
                        Qtd: ${i.quantidade} | Peso: ${i.peso}g
                        ${mostrarPreco ? `<br><b>${fMoeda(i.price * i.quantidade)}</b>` : ''}
                    </div>
                </div>`;
            });
            corpo += `</div>`;
        } else {
            corpo = `<table style="width:100%; border-collapse:collapse;">
                <thead><tr style="background:#eee;"><th>SKU</th><th>Produto</th><th>Qtd</th>${mostrarPreco?'<th>Total</th>':''}</tr></thead>
                <tbody>`;
            itens.forEach(i => {
                corpo += `<tr>
                    <td style="text-align:center">${i.sku}</td>
                    <td>${mostrarFoto ? `<img src="${i.image}" style="width:30px; vertical-align:middle; margin-right:5px;">`:''}${i.name}</td>
                    <td style="text-align:center">${i.quantidade}</td>
                    ${mostrarPreco?`<td style="text-align:right">${fMoeda(i.price * i.quantidade)}</td>`:''}
                </tr>`;
            });
            corpo += `</tbody></table>`;
        }

        const rodape = `<div style="margin-top:20px; border-top:1px solid #000; pt:10px; text-align:right;">
            <p>Total de Peças: ${p.totalPecas || 0} | Peso Total: ${p.pesoTotal || 0}g</p>
            ${mostrarPreco ? `<h2 style="margin:0;">TOTAL: ${fMoeda(p.total)}</h2>` : '<h2>CONFERÊNCIA</h2>'}
        </div>`;

        document.getElementById('print-area').innerHTML = cabecalho + corpo + rodape;
        window.print();
    });
}
