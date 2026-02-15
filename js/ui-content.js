const SHARED_RULES = Object.freeze([
    'Any live cell with fewer than two live neighbours dies (underpopulation).',
    'Any live cell with two or three live neighbours lives on.',
    'Any live cell with more than three live neighbours dies (overpopulation).',
    'Any dead cell with exactly three live neighbours becomes alive (reproduction).'
]);

const SHARED_LINKS = Object.freeze([
    {
        kind: 'anchor',
        href: 'https://github.com/lwalden/life/',
        label: 'GitHub Repository'
    },
    {
        kind: 'about',
        label: 'About'
    }
]);

function renderRules() {
    const targets = document.querySelectorAll('[data-rules-target]');
    for (const target of targets) {
        target.textContent = '';

        for (const ruleText of SHARED_RULES) {
            const listItem = document.createElement('li');
            listItem.textContent = ruleText;
            target.appendChild(listItem);
        }
    }
}

function renderLinks() {
    const targets = document.querySelectorAll('[data-links-target]');
    for (const target of targets) {
        const view = target.dataset.linksTarget;
        target.textContent = '';

        for (const link of SHARED_LINKS) {
            if (link.kind === 'anchor') {
                const anchor = document.createElement('a');
                anchor.href = link.href;
                anchor.target = '_blank';
                anchor.rel = 'noopener';
                anchor.className = 'btn btn-outline';
                anchor.textContent = link.label;
                target.appendChild(anchor);
                continue;
            }

            if (link.kind === 'about') {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn btn-outline';
                button.textContent = link.label;
                button.dataset.action = 'about';
                button.dataset.aboutTarget = view === 'mobile' ? 'mobile' : 'desktop';
                target.appendChild(button);
            }
        }
    }
}

export function renderSharedPanelContent() {
    renderRules();
    renderLinks();
}
