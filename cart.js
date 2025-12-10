import { formatMoney, escapeHtml, logAction } from './utils.js';

export const CartManager = {
    items: [],
    storeName: null,
    currentUser: null,
    
    init(storeName, user) {
        this.storeName = storeName;
        this.currentUser = user;
    },

    add(item) {
        if(!item) return;
        const existing = this.items.find(c => c.id === item.id);
        if(existing) existing.qty++;
        else this.items.push({ ...item, qty: 1 });
        
        this.updateUI();
        this.animateButton(item.id);
    },

    updateQty(index, change) {
        const item = this.items[index];
        if (change === -1 && item.qty === 1) {
            this.remove(index);
        } else {
            item.qty += change;
            this.updateUI();
            this.renderModal();
        }
    },

    remove(index) {
        if(confirm("Remove this item?")) {
            this.items.splice(index, 1);
            this.updateUI();
            this.renderModal();
        }
    },

    getTotal() {
        return this.items.reduce((a, b) => a + (b.price * b.qty), 0);
    },

    updateUI() {
        const totalQty = this.items.reduce((a, b) => a + b.qty, 0);
        const badge = document.getElementById('cart-badge');
        const fab = document.getElementById('cart-fab');
        
        if(totalQty > 0) {
            badge.innerText = totalQty;
            badge.classList.remove('hidden');
            fab.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
            fab.classList.add('hidden');
        }
    },

    animateButton(id) {
        const btn = document.getElementById(`add-btn-${id}`);
        if(btn) {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i>`;
            btn.classList.add('bg-emerald-500', 'text-white');
            btn.classList.remove('bg-teal-50', 'text-teal-600');
            if(window.lucide) lucide.createIcons();
            
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('bg-emerald-500', 'text-white');
                btn.classList.add('bg-teal-50', 'text-teal-600');
                if(window.lucide) lucide.createIcons();
            }, 500);
        }
    },

    renderModal() {
        const container = document.getElementById('cart-items');
        container.innerHTML = '';
        if(this.items.length === 0) {
            container.innerHTML = `<div class="text-center text-zinc-400 py-10 flex flex-col items-center gap-3"><i data-lucide="shopping-basket" class="w-10 h-10 opacity-50"></i><span>Cart is empty</span></div>`;
        } else {
            this.items.forEach((item, index) => {
                container.innerHTML += `
                    <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div><div class="font-bold text-zinc-900 dark:text-white">${escapeHtml(item.name)}</div><div class="text-xs text-zinc-500">₦${formatMoney(item.price)}</div></div>
                        <div class="flex items-center gap-3">
                            <button onclick="CartManager.remove(${index})" class="text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            <div class="flex items-center bg-white dark:bg-zinc-700 rounded-xl border border-zinc-200"><button onclick="CartManager.updateQty(${index}, -1)" class="w-8 h-8 font-bold">-</button><span class="w-8 text-center font-bold">${item.qty}</span><button onclick="CartManager.updateQty(${index}, 1)" class="w-8 h-8 font-bold">+</button></div>
                            <div class="font-bold">₦${formatMoney(item.price * item.qty)}</div>
                        </div>
                    </div>`;
            });
        }
        document.getElementById('cart-total').innerText = `₦${formatMoney(this.getTotal())}`;
        document.getElementById('cart-modal').classList.remove('hidden');
        if(window.lucide) lucide.createIcons();
    },

    async checkout() {
        if(this.items.length === 0) return;
        if(!confirm("Complete sale?")) return;
        const total = this.getTotal();
        const itemsCopy = JSON.parse(JSON.stringify(this.items));
        
        await logAction(this.storeName, this.currentUser.email, "Sale", `Sold ${this.items.length} items. Total: ₦${formatMoney(total)}`, { items: itemsCopy, total });
        
        this.items = [];
        this.updateUI();
        document.getElementById('cart-modal').classList.add('hidden');
        
        // Show Receipt (Reuse existing logic or simplified)
        document.getElementById('receipt-total').innerText = `₦${formatMoney(total)}`;
        document.getElementById('receipt-items-list').innerHTML = itemsCopy.map(i => `<div class="flex justify-between border-b border-dashed border-zinc-200 pb-1 mb-1"><div>${escapeHtml(i.name)} <span class="text-xs text-zinc-400">x${i.qty}</span></div><span>₦${formatMoney(i.price*i.qty)}</span></div>`).join('');
        document.getElementById('receipt-modal').classList.remove('hidden');
    }
};
