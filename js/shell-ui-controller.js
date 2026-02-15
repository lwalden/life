export class ShellUiController {
    constructor(elements) {
        this.elements = elements;
        this.mobileMenuOpen = false;
    }

    isMobileMenuOpen() {
        return this.mobileMenuOpen;
    }

    openMobileMenu() {
        if (!this.elements.mobileSidePanel || !this.elements.btnMobileMenu) return;

        this.mobileMenuOpen = true;
        this.elements.mobileSidePanel.removeAttribute('inert');
        this.elements.mobileSidePanel.classList.add('is-open');
        this.elements.mobileSidePanel.setAttribute('aria-hidden', 'false');
        this.elements.btnMobileMenu.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mobile-menu-open');

        if (this.elements.btnMobileMenuClose) {
            this.elements.btnMobileMenuClose.focus({ preventScroll: true });
        }
    }

    closeMobileMenu() {
        if (!this.elements.mobileSidePanel || !this.elements.btnMobileMenu) return;

        if (this.elements.mobileSidePanel.contains(document.activeElement)) {
            this.elements.btnMobileMenu.focus({ preventScroll: true });
        }

        this.mobileMenuOpen = false;
        this.elements.mobileSidePanel.classList.remove('is-open');
        this.elements.mobileSidePanel.setAttribute('aria-hidden', 'true');
        this.elements.mobileSidePanel.setAttribute('inert', '');
        this.elements.btnMobileMenu.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-menu-open');
    }

    openModal() {
        if (!this.elements.aboutModal) return;
        this.elements.aboutModal.showModal();
    }

    closeModal() {
        if (!this.elements.aboutModal) return;
        if (this.elements.aboutModal.open) {
            this.elements.aboutModal.close();
        }
    }
}
