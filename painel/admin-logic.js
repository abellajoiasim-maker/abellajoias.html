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
    
    if (id === 'categorias') carregarCategorias();
    if (id === 'produtos') carregarProdutos();
    if (id === 'pedidos') carregarPedidos();
    if (id === 'empresa') carregarEmpresa();
}

// FUNÇÕES DE EMPRESA/ESTOQUE (Copiadas do seu fonte)
function carregarEmpresa() {
    db.ref('settings/empresa').once('value', s => {
        const v = s.val() || {};
        if(document.getElementById('empNome')) {
            document.getElementById('empNome').value = v.nome || '';
            document.getElementById('empSub').value = v.subtitulo || '';
            document.getElementById('empWhats').value = v.whats || '';
            document.getElementById('empDesc').value = v.descontoPix || 0;
            document.getElementById('empParc').value = v.parcelas || 0;
        }
    });
}

function salvarEmpresa() {
    db.ref('settings/empresa').update({
        nome: document.getElementById('empNome').value,
        subtitulo: document.getElementById('empSub').value,
        whats: document.getElementById('empWhats').value,
        descontoPix: +document.getElementById('empDesc').value,
        parcelas: +document.getElementById('empParc').value
    }).then(() => alert('Configurações atualizadas!'));
}

function carregarCategorias() {
    db.ref('categories').on('value', s => {
        const lista = document.getElementById('listaCategorias');
        if(!lista) return;
        lista.innerHTML = '';
        s.forEach(c => {
            lista.innerHTML += `<div class="card flex justify-between items-center">
                <span class="uppercase text-xs font-bold">${c.val().name}</span>
                <div class="flex gap-2">
                    <button class="btn text-red-500" onclick="excluirCat('${c.key}')">🗑</button>
                </div>
            </div>`;
        });
    });
}

function novaCategoria() {
    const n = document.getElementById('newCatName').value;
    if(n) db.ref('categories').push({name:n}).then(() => document.getElementById('newCatName').value = '');
}

function carregarProdutos() {
    const lista = document.getElementById('listaProdutos');
    if(!lista) return;
    db.ref('categories').once('value', sCats => {
        db.ref('products').once('value', sProds => {
            lista.innerHTML = '';
            sCats.forEach(cat => {
                let htmlP = '';
                sProds.forEach(p => {
                    const prod = p.val();
                    if(prod.category === cat.key) {
                        htmlP += `<div class="card flex justify-between items-center py-2 px-3 bg-[#0d0d0d] mb-1 text-[11px]">
                            <div class="flex items-center gap-3">
                                <img src="${prod.image || ''}" class="w-8 h-8 object-cover rounded">
                                <span><b class="text-[#caa85c]">[${prod.sku || '---'}]</b> ${prod.name}</span>
                            </div>
                        </div>`;
                    }
                });
                if(htmlP) lista.innerHTML += `<div class="mb-4"><b class="text-[10px] text-[#caa85c] ml-1 uppercase">${cat.val().name}</b><div class="mt-1">${htmlP}</div></div>`;
            });
        });
    });
}

// FUNÇÕES DE PEDIDOS E ROMANEIO
function carregarPedidos() {
    db.ref('orders').on('value', s => {
        const lista = document.getElementById('listaPedidos');
        if(!lista) return;
        lista.innerHTML = '';
        s.forEach(ped => {
            const p = ped.val();
            lista.innerHTML += `<div class="card border-l-4 border-[#caa85c] mb-2">
                <div class="flex justify-between items-start">
                    <div>
                        <b class="text-[#caa85c] uppercase text-sm">${p.cliente?.nome || 'Cliente'}</b><br>
                        <small class="text-gray-500">${p.data || ''}</small>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-xs">${fMoeda(p.total)}</div>
                        <button class="btn p-1 mt-2" onclick="abrirEditorPedido('${ped.key}')">EDITAR / IMPRIMIR</button>
                    </div>
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
        document.getElementById('edNomeEntrega').value = p.entrega?.nomeEntrega || '';
        document.getElementById('edRua').value = p.entrega?.rua || '';
        document.getElementById('edBairro').value = p.entrega?.bairro || '';
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
    div.className = "card bg-black/40 border-[#222] mb-2 p-2";
    div.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input placeholder="SKU" value="${i.sku||''}" class="!mb-0 text-[10px]">
            <input placeholder="Nome" value="${i.name||''}" class="!mb-0 text-[10px]">
            <input type="number" placeholder="Peso" value="${i.peso||i.weight||0}" class="!mb-0 text-[10px]" oninput="recalcularTotalEd()">
            <input type="number" placeholder="Preço" value="${i.price||i.precoFinal||0}" class="!mb-0 text-[10px]" oninput="recalcularTotalEd()">
            <input type="number" placeholder="Qtd" value="${i.quantidade||i.qtd||1}" class="!mb-0 text-[10px]" oninput="recalcularTotalEd()">
        </div>
        <button class="text-red-500 text-[9px] uppercase font-bold mt-1" onclick="this.parentElement.remove();recalcularTotalEd();">Remover</button>`;
    document.getElementById('edItens').appendChild(div);
}

function recalcularTotalEd() {
    let subtotal = 0;
    document.querySelectorAll('#edItens > div').forEach(div => {
        const ins = div.querySelectorAll('input');
        subtotal += (Number(ins[3].value) * Number(ins[4].value));
    });
    const total = subtotal - Number(document.getElementById('edDescPromo').value) - Number(document.getElementById('edDescPix').value) + Number(document.getElementById('edFrete').value);
    document.getElementById('totalPreview').innerText = fMoeda(total);
}

function salvarPedidoEditado() {
    const itens = [];
    let subtotal = 0, pesoTotal = 0, totalPecas = 0;
    document.querySelectorAll('#edItens > div').forEach(div => {
        const ins = div.querySelectorAll('input');
        const item = { sku: ins[0].value, name: ins[1].value, peso: Number(ins[2].value), price: Number(ins[3].value), quantidade: Number(ins[4].value) };
        subtotal += (item.price * item.quantidade);
        pesoTotal += (item.peso * item.quantidade);
        totalPecas += item.quantidade;
        itens.push(item);
    });
    const dPromo = Number(document.getElementById('edDescPromo').value);
    const dPix = Number(document.getElementById('edDescPix').value);
    const frete = Number(document.getElementById('edFrete').value);
    db.ref('orders/'+pedidoEditando).update({
        cliente: { nome: document.getElementById('edClienteNome').value, telefone: document.getElementById('edClienteTel').value },
        entrega: { nomeEntrega: document.getElementById('edNomeEntrega').value, rua: document.getElementById('edRua').value, bairro: document.getElementById('edBairro').value, cidade: document.getElementById('edCidade').value },
        itens, subtotal, pesoTotal, totalPecas, descontoPromo: dPromo, descontoPix: dPix, frete, total: (subtotal - dPromo - dPix + frete)
    }).then(() => { alert("Pedido Salvo!"); fecharEditorPedido(); });
}

function imprimirRomaneio(id, tipo) {
    db.ref('orders/' + id).once('value', sPed => {
        const p = sPed.val();
        db.ref('settings/empresa').once('value', sEmp => {
            const emp = sEmp.val() || { nome: "Abella Joias", whats: "---" };
            const itens = Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {});
            const isFin = [2, 3, 5, 6].includes(tipo);
            const comFoto = [3, 6].includes(tipo);
            const emGrid = tipo >= 4;
            
            let html = `<div style="padding:10mm; background:#fff; color:#000;">
                <h1 style="text-align:center; border-bottom:2px solid #000;">${emp.nome}</h1>
                <p>Cliente: ${p.cliente?.nome}</p>
                <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <tr style="background:#eee;"><th>Produto</th><th>Qtd</th>${isFin ? '<th>Total</th>' : ''}</tr>`;
            
            itens.forEach(i => {
                html += `<tr style="border-bottom:1px solid #ddd;">
                    <td>${i.sku} - ${i.name}</td>
                    <td style="text-align:center">${i.quantidade}</td>
                    ${isFin ? `<td style="text-align:right">${fMoeda(i.price * i.quantidade)}</td>` : ''}
                </tr>`;
            });
            html += `</table><h2 style="text-align:right; margin-top:20px;">TOTAL: ${fMoeda(p.total)}</h2></div>`;
            
            document.getElementById('print-area').innerHTML = html;
            setTimeout(() => { window.print(); }, 500);
        });
    });
}

function fecharEditorPedido() { document.getElementById('editorPedido').classList.add('hidden'); }
function excluirCat(id) { if(confirm("Excluir?")) db.ref('categories/'+id).remove(); }
