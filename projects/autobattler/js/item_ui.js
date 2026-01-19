
export class ItemUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        // Create Item View container dynamically if not exists
        this.itemView = document.createElement('div');
        this.itemView.id = 'item-view';
        this.itemView.className = 'hidden';

        // Tooltip Reference
        this.tooltip = document.getElementById('tooltip');

        document.getElementById('ui-layer').appendChild(this.itemView);
    }

    update(unit, isSynergyPanelOpen) {
        if (!unit) {
            this.itemView.classList.add('hidden');
            return;
        }

        this.itemView.classList.remove('hidden');
        this.itemView.innerHTML = '';

        // Unit Header
        const header = document.createElement('div');
        header.className = 'item-view-header';
        header.innerText = `${unit.family} ${unit.cls}`;
        this.itemView.appendChild(header);

        // Stats
        const stats = document.createElement('div');
        stats.className = 'item-view-stats';
        stats.innerHTML = `
            HP: ${Math.floor(unit.hp)}/${unit.maxHp}<br>
            DMG: ${Math.floor(unit.damage)}<br>
            Mana: ${Math.floor(unit.mana)}/${unit.maxMana}
        `;
        this.itemView.appendChild(stats);

        // Items Title
        const itemsTitle = document.createElement('div');
        itemsTitle.className = 'items-title';
        itemsTitle.innerText = 'Items:';
        this.itemView.appendChild(itemsTitle);

        // Item Slots Row
        const slotsRow = document.createElement('div');
        slotsRow.className = 'item-slots-row';

        const maxSlots = 3;
        for (let i = 0; i < maxSlots; i++) {
            const slot = document.createElement('div');
            const item = unit.items[i]; // Get item at index

            if (item) {
                slot.className = 'item-slot filled';

                // Icon Placeholder
                const icon = document.createElement('div');
                icon.className = 'item-icon-placeholder';
                icon.innerText = item.name.charAt(0).toUpperCase();

                // Color based on Item Name hash or type?
                // Simple hash
                const hash = item.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
                icon.style.backgroundColor = colors[hash % colors.length];

                slot.appendChild(icon);

                // Events
                slot.addEventListener('mouseenter', (e) => this.showTooltip(e, item, slot));
                slot.addEventListener('mouseleave', () => this.hideTooltip());
                slot.addEventListener('contextmenu', (e) => e.preventDefault());
            } else {
                slot.className = 'item-slot empty';
            }
            slotsRow.appendChild(slot);
        }
        this.itemView.appendChild(slotsRow);
    }

    showTooltip(e, item, targetElem) {
        if (!this.tooltip) return;

        this.tooltip.innerHTML = `
            <div style="font-weight:bold; color:#ffd700; margin-bottom:4px;">${item.name}</div>
            <div style="font-size:0.8rem; color:#ccc;">${this.formatStats(item.stats)}</div>
        `;

        // Position
        const rect = targetElem.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect(); // Need to show it first to get width?

        this.tooltip.classList.remove('hidden');

        // Re-measure after showing
        const validTooltipRect = this.tooltip.getBoundingClientRect();

        let top = rect.top - validTooltipRect.height - 10;
        let left = rect.left + (rect.width / 2) - (validTooltipRect.width / 2);

        // Bounds check
        if (top < 0) top = rect.bottom + 10;
        if (left < 0) left = 10;

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.classList.add('hidden');
    }

    formatStats(stats) {
        return Object.entries(stats).map(([k, v]) => {
            if (k === 'atkSpeed') return `+${(v * 100).toFixed(0)}% Attack Speed`;
            if (k === 'damage') return `+${v} Attack Damage`;
            if (k === 'hp') return `+${v} Health`;
            if (k === 'manaStart') return `+${v} Starting Mana`;
            if (k === 'armor') return `+${v} Armor`;
            if (k === 'magicResist') return `+${v} Magic Resist`;
            if (k === 'ap') return `+${v} Ability Power`;
            if (k === 'critChance') return `+${(v * 100).toFixed(0)}% Crit Chance`;
            return `+${v} ${k}`;
        }).join('<br>'); // New line for tooltip
    }

    renderInventory(inventory, selectedItem, onSelect, onDragStart) {
        // Create or get container
        let invContainer = document.getElementById('general-inventory');
        if (!invContainer) {
            invContainer = document.createElement('div');
            invContainer.id = 'general-inventory';
            invContainer.className = 'inventory-panel';
            document.getElementById('ui-layer').appendChild(invContainer);
        }

        invContainer.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'inventory-title';
        title.innerText = 'Loot';
        invContainer.appendChild(title);

        const row = document.createElement('div');
        row.className = 'inventory-row';

        // Render items safely
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'item-slot filled';
            slot.setAttribute('draggable', 'false'); // Prevent native drag

            // Highlight if selected
            if (selectedItem && selectedItem.origin === 'inventory' && selectedItem.item === item) {
                slot.style.borderColor = '#00ff00';
                slot.style.boxShadow = '0 0 10px #00ff00';
            }

            const icon = document.createElement('div');
            icon.className = 'item-icon-placeholder';
            icon.innerText = item.name.charAt(0).toUpperCase();
            icon.setAttribute('draggable', 'false');

            // Simple hash for color
            const hash = item.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
            icon.style.backgroundColor = colors[hash % colors.length];

            slot.appendChild(icon);

            // Pointer Down -> Drag Start
            slot.onpointerdown = (e) => {
                if (e.button !== 0) return; // Only Left Click
                e.preventDefault();

                // If onDragStart provided, use it
                if (onDragStart) {
                    onDragStart(item, e);
                }

                if (onSelect) onSelect(item);
            };

            // Tooltip
            slot.addEventListener('mouseenter', (e) => this.showTooltip(e, item, slot));
            slot.addEventListener('mouseleave', () => this.hideTooltip());
            slot.addEventListener('contextmenu', (e) => e.preventDefault());

            row.appendChild(slot);
        });
        invContainer.appendChild(row);
    }
}
