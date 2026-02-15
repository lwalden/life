export class SidebarLayoutManager {
    constructor(elements) {
        this.controlsSection = elements.controlsSection ?? null;
        this.canvasSection = elements.canvasSection ?? null;
        this.linksPanel = elements.linksPanel ?? null;
        this.rulesPanel = elements.rulesPanel ?? null;
        this.panelToggleLinks = elements.panelToggleLinks ?? null;
        this.panelToggleRules = elements.panelToggleRules ?? null;
    }

    bindEvents() {
        if (this.panelToggleLinks) {
            this.panelToggleLinks.addEventListener('click', () => this.togglePanel('links'));
        }

        if (this.panelToggleRules) {
            this.panelToggleRules.addEventListener('click', () => this.togglePanel('rules'));
        }
    }

    isDesktopSidebarLayout() {
        if (typeof window.matchMedia !== 'function') return false;
        return window.matchMedia('(min-width: 1024px)').matches && !document.body.classList.contains('touch-ui');
    }

    isPanelCollapsed(panel) {
        return panel ? panel.classList.contains('is-collapsed') : false;
    }

    setPanelCollapsed(panel, collapsed) {
        if (!panel) return;

        panel.classList.toggle('is-collapsed', collapsed);

        const toggleButton = panel.querySelector('.panel-toggle');
        if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', String(!collapsed));
        }

        const icon = panel.querySelector('.panel-toggle-icon');
        if (icon) {
            icon.textContent = collapsed ? '+' : '-';
        }
    }

    resetPanelsExpanded() {
        this.setPanelCollapsed(this.linksPanel, false);
        this.setPanelCollapsed(this.rulesPanel, false);
    }

    applyFit(resetPanels = true) {
        if (!this.controlsSection || !this.canvasSection || !this.linksPanel || !this.rulesPanel) return;

        if (!this.isDesktopSidebarLayout()) {
            this.controlsSection.style.maxHeight = '';
            this.controlsSection.style.overflowY = '';
            this.resetPanelsExpanded();
            return;
        }

        const targetHeight = Math.max(0, Math.floor(this.canvasSection.getBoundingClientRect().height));
        this.controlsSection.style.maxHeight = targetHeight > 0 ? `${targetHeight}px` : '';
        this.controlsSection.style.overflowY = 'hidden';

        if (resetPanels) {
            this.resetPanelsExpanded();

            if (this.controlsSection.scrollHeight > this.controlsSection.clientHeight + 1 && !this.isPanelCollapsed(this.rulesPanel)) {
                this.setPanelCollapsed(this.rulesPanel, true);
            }

            if (this.controlsSection.scrollHeight > this.controlsSection.clientHeight + 1 && !this.isPanelCollapsed(this.linksPanel)) {
                this.setPanelCollapsed(this.linksPanel, true);
            }
        }

        if (this.controlsSection.scrollHeight > this.controlsSection.clientHeight + 1) {
            this.controlsSection.style.overflowY = 'auto';
        }
    }

    togglePanel(panelKey) {
        const panel = panelKey === 'links' ? this.linksPanel : this.rulesPanel;
        if (!panel) return;

        this.setPanelCollapsed(panel, !this.isPanelCollapsed(panel));
        this.applyFit(false);
    }
}
