
export class SynergyUI {
    constructor(containerId, toggleId) {
        this.container = document.getElementById(containerId);
        this.toggleBtn = document.getElementById(toggleId);
        this.list = this.container.querySelector('.synergy-list');

        this.visible = true;

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
    }

    toggle() {
        this.visible = !this.visible;
        this.container.classList.toggle('minimized', !this.visible);
    }

    update(statusList) {
        if (!this.list) return;
        this.list.innerHTML = '';

        for (const syn of statusList) {
            const row = document.createElement('div');
            row.className = 'synergy-row';
            if (syn.activeTier > 0) row.classList.add('active');

            // Icon Container
            const iconDiv = document.createElement('div');
            iconDiv.className = `synergy-icon tier-${syn.activeTier}`;
            // Simple hexagon symbol or just background shape
            iconDiv.innerHTML = `<div class="icon-inner"><span class="icon-symbol">⬢</span></div>`;

            // Info Container (Count + Name + Thresholds)
            const infoDiv = document.createElement('div');
            infoDiv.className = 'synergy-info';

            // Header: Count + Name
            const headerDiv = document.createElement('div');
            headerDiv.className = 'synergy-header';
            headerDiv.innerHTML = `<span class="synergy-count">${syn.count}</span> <span class="synergy-name">${syn.name}</span>`;

            // Thresholds
            const threshDiv = document.createElement('div');
            threshDiv.className = 'synergy-thresholds';

            // Format: 2 > 4 > 6
            syn.thresholds.forEach((t, i) => {
                const isActive = (syn.count >= t);
                const span = document.createElement('span');
                span.className = isActive ? 't-active' : 't-inactive';
                span.innerText = t;
                threshDiv.appendChild(span);

                if (i < syn.thresholds.length - 1) {
                    const arrow = document.createElement('span');
                    arrow.className = 't-sep';
                    arrow.innerText = ' › ';
                    threshDiv.appendChild(arrow);
                }
            });

            infoDiv.appendChild(headerDiv);
            infoDiv.appendChild(threshDiv);

            // Event Listeners for Description
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showTooltip(e, syn.description);
            });
            row.addEventListener('mouseenter', (e) => {
                // User asked for Right Click, but hover is standard. 
                // Let's stick to Right Click for now to be distinct or maybe both?
                // Let's do hover as title (already there) but custom tooltip on Right Click.
                // Actually Custom Tooltip is nicer. Let's use custom for both.
                this.showTooltip(e, syn.description);
            });
            row.addEventListener('mouseleave', () => this.hideTooltip());

            row.appendChild(iconDiv);
            row.appendChild(infoDiv);
            this.list.appendChild(row);
        }
    }

    showTooltip(e, text) {
        let tooltip = document.getElementById('tooltip');
        if (!tooltip) return;

        tooltip.innerHTML = `<div style="max-width:200px; color:#ddd;">${text}</div>`;
        tooltip.classList.remove('hidden');

        const x = e.clientX + 15;
        const y = e.clientY + 15;

        // Bounds check
        // Simple positioning
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    hideTooltip() {
        let tooltip = document.getElementById('tooltip');
        if (tooltip) tooltip.classList.add('hidden');
    }
}
