/* global window, document, acquireVsCodeApi, console */
// Main script for webview
(function() {
    const vscode = acquireVsCodeApi();

    window.addEventListener('DOMContentLoaded', () => {
        // Signal that webview is ready to receive data
        vscode.postMessage({ command: 'webviewReady' });
    });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'update':
                renderView(message.data);
                break;
        }
    });

    function clearContent() {
        const content = document.getElementById('content');
        if (!content) {
            return null;
        }
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }
        return content;
    }

    function createEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) {
            el.className = className;
        }
        if (text !== undefined) {
            el.textContent = text;
        }
        return el;
    }

    function renderView(data) {
        try {
            if (!data) {
                throw new Error('No data received from extension');
            }

            if (data.error) {
                renderError(data.error);
                return;
            }

            switch (data.type) {
                case 'repositories':
                    renderRepositories(data);
                    break;
                case 'menu':
                    renderNavigation(data);
                    break;
                case 'setup':
                    renderSetup(data);
                    break;
                case 'changes':
                    renderChanges(data);
                    break;
                case 'commits':
                    renderCommits(data);
                    break;
                default:
                    renderError('Unknown view data type');
                    break;
            }
        } catch (error) {
            console.error('Render failed:', error);
            renderError('Failed to render view. Check Developer Tools console.');
        }
    }

    function renderError(message) {
        const content = clearContent();
        if (!content) {
            return;
        }
        const emptyState = createEl('div', 'empty-state');
        const icon = createEl('div', null, '⚠️');
        icon.style.fontSize = '32px';
        icon.style.marginBottom = '8px';
        emptyState.appendChild(icon);
        emptyState.appendChild(createEl('div', null, message));
        content.appendChild(emptyState);
    }
    
    function renderRepositories(data) {
        const content = clearContent();
        if (!content) {
            return;
        }

        const header = createEl('div', 'section-header');
        header.style.padding = '12px';
        header.style.borderBottom = '1px solid var(--vscode-list-focusOutlineOffset)';
        const headerText = createEl('span', null, 'REPOSITORIES');
        headerText.style.fontSize = '13px';
        headerText.style.fontWeight = '600';
        header.appendChild(headerText);
        content.appendChild(header);

        const list = createEl('div');
        list.style.padding = '4px';

        data.repos.forEach(repo => {
            const isSelected = repo.path === data.selectedRepo;
            const item = createEl('div', `nav-item clickable${isSelected ? ' selected' : ''}`);
            item.addEventListener('click', () => switchRepo(repo.path));

            const icon = createEl('span', 'nav-icon', isSelected ? '✓' : '📁');
            item.appendChild(icon);

            const textWrap = createEl('div');
            textWrap.style.flex = '1';
            textWrap.appendChild(createEl('div', 'nav-label', repo.name));

            const branch = createEl('div', 'nav-description', `🌿 ${repo.branch || 'unknown'}`);
            branch.style.fontSize = '11px';
            textWrap.appendChild(branch);

            const desc = createEl('div', 'nav-description', repo.path);
            desc.style.fontSize = '11px';
            textWrap.appendChild(desc);

            item.appendChild(textWrap);
            list.appendChild(item);
        });

        content.appendChild(list);
    }

    function renderNavigation(data) {
        const content = clearContent();
        if (!content) {
            return;
        }

        const header = createEl('div', 'section-header');
        header.style.padding = '12px';
        header.style.borderBottom = '1px solid var(--vscode-list-focusOutlineOffset)';

        if (data.showBackButton) {
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '8px';
            const back = createEl('span', 'nav-icon clickable', '←');
            back.style.cursor = 'pointer';
            back.addEventListener('click', () => navigateBack());
            header.appendChild(back);
        }

        const headerText = createEl('span', null, 'MENU');
        headerText.style.fontSize = '13px';
        headerText.style.fontWeight = '600';
        header.appendChild(headerText);
        content.appendChild(header);

        const list = createEl('div');
        list.style.padding = '4px';

        if (data.menuItems && data.menuItems.length > 0) {
            data.menuItems.forEach(item => {
                const hasSubmenu = item.hasSubmenu || false;
                const hasView = item.view !== undefined;
                const icon = item.icon || '•';

                const row = createEl('div', 'nav-item clickable');
                row.addEventListener('click', () => {
                    if (hasView) {
                        navigateToView(item.view);
                    } else if (hasSubmenu) {
                        navigateTo(item.menuId);
                    } else {
                        execMenuCommand(item.command);
                    }
                });

                row.appendChild(createEl('span', 'nav-icon', icon));
                row.appendChild(createEl('span', 'nav-label', item.label));

                if (hasSubmenu) {
                    const arrow = createEl('span', null, '→');
                    arrow.style.marginLeft = 'auto';
                    row.appendChild(arrow);
                }

                list.appendChild(row);
            });
        } else {
            const empty = createEl('div', null, 'No menu items');
            empty.style.padding = '12px';
            empty.style.color = 'var(--vscode-descriptionForeground)';
            list.appendChild(empty);
        }

        content.appendChild(list);
    }

    function renderChanges(data) {
        const content = clearContent();
        if (!content) {
            return;
        }

        if (data.staged.length === 0 && data.unstaged.length === 0) {
            const emptyState = createEl('div', 'empty-state');
            const icon = createEl('div', null, '✓');
            icon.style.fontSize = '32px';
            icon.style.marginBottom = '8px';
            emptyState.appendChild(icon);
            emptyState.appendChild(createEl('div', null, 'No changes'));
            const detail = createEl('div', null, 'Working tree clean');
            detail.style.fontSize = '11px';
            detail.style.marginTop = '4px';
            emptyState.appendChild(detail);
            content.appendChild(emptyState);
            return;
        }

        if (data.staged.length > 0) {
            const section = createEl('div', 'section');
            const header = createEl('div', 'section-header');
            header.appendChild(createEl('span', 'section-icon', '☁'));
            header.appendChild(createEl('span', null, 'STAGED CHANGES'));
            const count = createEl('span', null, String(data.staged.length));
            count.style.marginLeft = 'auto';
            header.appendChild(count);
            section.appendChild(header);
            data.staged.forEach(file => section.appendChild(renderFileItem(file, true)));
            content.appendChild(section);
        }

        if (data.unstaged.length > 0) {
            const section = createEl('div', 'section');
            const header = createEl('div', 'section-header');
            header.appendChild(createEl('span', 'section-icon', '≠'));
            header.appendChild(createEl('span', null, 'CHANGES'));
            const count = createEl('span', null, String(data.unstaged.length));
            count.style.marginLeft = 'auto';
            header.appendChild(count);
            section.appendChild(header);
            data.unstaged.forEach(file => section.appendChild(renderFileItem(file, false)));
            content.appendChild(section);
        }
    }

    function renderFileItem(file, staged) {
        const statusChar = file.status === '?' ? '?' : file.status;
        const statusClass = file.status === '?' ? 'U' : file.status;
        const statusLabel = getStatusLabel(file.status);
        const action = staged ? 'unstageFile' : 'stageFile';
        const actionLabel = staged ? 'Unstage' : 'Stage';

        const row = createEl('div', 'file-item');
        row.addEventListener('click', () => openDiff(file.path, staged));

        const status = createEl('span', `file-status ${statusClass}`, statusChar);
        status.title = statusLabel;
        row.appendChild(status);

        row.appendChild(createEl('span', 'file-name', file.path));

        const actions = createEl('div', 'file-actions');
        const button = createEl('button', 'file-action-btn', actionLabel);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (action === 'unstageFile') {
                unstageFile(file.path);
            } else {
                stageFile(file.path);
            }
        });
        actions.appendChild(button);
        row.appendChild(actions);

        return row;
    }

    function renderCommits(data) {
        if (!data.commits || data.commits.length === 0) {
            const content = clearContent();
            if (!content) {
                return;
            }
            const emptyState = createEl('div', 'empty-state');
            const icon = createEl('div', null, 'ℹ');
            icon.style.fontSize = '32px';
            icon.style.marginBottom = '8px';
            emptyState.appendChild(icon);
            emptyState.appendChild(createEl('div', null, 'No commits'));
            content.appendChild(emptyState);
            return;
        }

        const content = clearContent();
        if (!content) {
            return;
        }

        const container = createEl('div', 'commits-container');
        container.style.position = 'relative';
        data.commits.forEach((commit, index) => {
            container.appendChild(renderCommitItem(commit, index));
        });
        content.appendChild(container);
        setupCommitTooltips(data.commits);
    }
    
    function renderSetup(data) {
        const content = clearContent();
        if (!content) {
            return;
        }

        const header = createEl('div', 'section-header');
        header.style.padding = '12px';
        header.style.borderBottom = '1px solid var(--vscode-list-focusOutlineOffset)';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '8px';
        const back = createEl('span', 'nav-icon clickable', '←');
        back.style.cursor = 'pointer';
        back.addEventListener('click', () => navigateBack());
        header.appendChild(back);
        const headerText = createEl('span', null, 'SETUP');
        headerText.style.fontSize = '13px';
        headerText.style.fontWeight = '600';
        header.appendChild(headerText);
        content.appendChild(header);

        const body = createEl('div');
        body.style.padding = '16px';
        const form = createEl('form');
        form.id = 'setupForm';
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            saveSetup();
        });

        const prefixBlock = createEl('div');
        prefixBlock.style.marginBottom = '16px';
        const prefixLabel = createEl('label', null, 'Commit Prefix');
        prefixLabel.style.display = 'block';
        prefixLabel.style.marginBottom = '4px';
        prefixLabel.style.fontWeight = '600';
        prefixLabel.style.fontSize = '12px';
        prefixBlock.appendChild(prefixLabel);
        const prefixInput = createEl('input');
        prefixInput.type = 'text';
        prefixInput.id = 'commitPrefix';
        prefixInput.value = data.config.commitPrefix || '';
        prefixInput.placeholder = 'e.g., [{{branch}}] or {{ticket}}: ';
        prefixInput.style.width = '100%';
        prefixInput.style.padding = '4px 8px';
        prefixInput.style.background = 'var(--vscode-input-background)';
        prefixInput.style.color = 'var(--vscode-input-foreground)';
        prefixInput.style.border = '1px solid var(--vscode-input-border)';
        prefixInput.style.borderRadius = '2px';
        prefixBlock.appendChild(prefixInput);
        const prefixHelp = createEl('div', null, 'Use {{branch}} or {{ticket}} as placeholders');
        prefixHelp.style.fontSize = '11px';
        prefixHelp.style.color = 'var(--vscode-descriptionForeground)';
        prefixHelp.style.marginTop = '4px';
        prefixBlock.appendChild(prefixHelp);
        form.appendChild(prefixBlock);

        const testsBlock = createEl('div');
        testsBlock.style.marginBottom = '16px';
        const testsLabel = createEl('label', null, 'Require Tests Before Commit');
        testsLabel.style.display = 'block';
        testsLabel.style.marginBottom = '4px';
        testsLabel.style.fontWeight = '600';
        testsLabel.style.fontSize = '12px';
        testsBlock.appendChild(testsLabel);
        const testsSelect = createEl('select');
        testsSelect.id = 'requireTests';
        testsSelect.style.width = '100%';
        testsSelect.style.padding = '4px 8px';
        testsSelect.style.background = 'var(--vscode-dropdown-background)';
        testsSelect.style.color = 'var(--vscode-dropdown-foreground)';
        testsSelect.style.border = '1px solid var(--vscode-dropdown-border)';
        testsSelect.style.borderRadius = '2px';
        const optionDisabled = createEl('option', null, 'Disabled');
        optionDisabled.value = 'disabled';
        const optionWarn = createEl('option', null, 'Warn if tests fail');
        optionWarn.value = 'warn';
        const optionPrevent = createEl('option', null, 'Prevent commit if tests fail');
        optionPrevent.value = 'prevent';
        testsSelect.appendChild(optionDisabled);
        testsSelect.appendChild(optionWarn);
        testsSelect.appendChild(optionPrevent);
        testsSelect.value = data.config.requireTests || 'disabled';
        testsBlock.appendChild(testsSelect);
        const testsHelp = createEl('div', null, 'Runs tests before committing when enabled');
        testsHelp.style.fontSize = '11px';
        testsHelp.style.color = 'var(--vscode-descriptionForeground)';
        testsHelp.style.marginTop = '4px';
        testsBlock.appendChild(testsHelp);
        form.appendChild(testsBlock);

        const saveButton = createEl('button', 'primary-button', 'Save Configuration');
        saveButton.type = 'submit';
        form.appendChild(saveButton);
        body.appendChild(form);
        content.appendChild(body);
    }
    
    function setupCommitTooltips(commits) {
        const commits_by_hash = {};
        commits.forEach(c => {
            commits_by_hash[c.hash] = c;
        });
        
        function removeAllTooltips() {
            document.querySelectorAll('.custom-tooltip').forEach(t => t.remove());
        }
        
        // Remove any existing context menus
        function removeContextMenu() {
            const existing = document.querySelector('.commit-context-menu');
            if (existing) existing.remove();
        }
        
        document.querySelectorAll('.commit-item').forEach(item => {
            // Tooltip handlers
            item.addEventListener('mouseenter', function(e) {
                removeAllTooltips();
                
                const hash = this.getAttribute('data-hash');
                const commit = commits_by_hash[hash];
                if (commit) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip';
                    tooltip.textContent = `${commit.hash}\n${commit.message}\n${commit.author}\n${commit.date}`;
                    tooltip.style.cssText = `
                        position: fixed;
                        background: var(--vscode-editorHoverWidget-background);
                        border: 1px solid var(--vscode-editorHoverWidget-border);
                        border-radius: 4px;
                        padding: 8px 12px;
                        font-size: 12px;
                        color: var(--vscode-foreground);
                        z-index: 10000;
                        max-width: 500px;
                        white-space: pre-wrap;
                        word-break: break-word;
                        font-family: monospace;
                        pointer-events: none;
                        left: ${e.clientX + 15}px;
                        top: ${e.clientY + 10}px;
                    `;
                    document.body.appendChild(tooltip);
                }
            });
            
            item.addEventListener('mouseleave', removeAllTooltips);
            
            item.addEventListener('mousemove', function(e) {
                const tooltip = document.querySelector('.custom-tooltip');
                if (tooltip) {
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                }
            });
            
            // Context menu handlers
            item.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                removeContextMenu();
                removeAllTooltips();
                
                const hash = this.getAttribute('data-hash');
                const index = parseInt(this.getAttribute('data-index'), 10);
                const commit = commits_by_hash[hash];
                if (!commit) return;
                
                const menu = document.createElement('div');
                menu.className = 'commit-context-menu';
                menu.style.cssText = `
                    position: fixed;
                    background: var(--vscode-menu-background);
                    border: 1px solid var(--vscode-menu-border);
                    border-radius: 4px;
                    padding: 4px 0;
                    font-size: 13px;
                    color: var(--vscode-menu-foreground);
                    z-index: 10001;
                    min-width: 200px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    left: ${e.clientX}px;
                    top: ${e.clientY}px;
                `;
                
                const menuItems = [];
                
                // Only show reword for HEAD (first commit, index 0)
                if (index === 0) {
                    menuItems.push({ label: 'Reword Commit Message', action: () => rewordCommit(hash) });
                }
                
                menuItems.push(
                    { label: 'Squash to Single Commit', action: () => squashToSingle(hash) },
                    { label: 'Copy Hash', action: () => copyHash(hash) },
                    { label: 'Copy Message', action: () => copyMessage(commit.message) }
                );
                
                menuItems.forEach(item => {
                    const menuItem = document.createElement('div');
                    menuItem.textContent = item.label;
                    menuItem.style.cssText = `
                        padding: 6px 12px;
                        cursor: pointer;
                        transition: background-color 0.1s;
                    `;
                    menuItem.addEventListener('mouseenter', function() {
                        this.style.backgroundColor = 'var(--vscode-menu-selectionBackground)';
                        this.style.color = 'var(--vscode-menu-selectionForeground)';
                    });
                    menuItem.addEventListener('mouseleave', function() {
                        this.style.backgroundColor = '';
                        this.style.color = '';
                    });
                    menuItem.addEventListener('click', function(e) {
                        e.stopPropagation();
                        item.action();
                        removeContextMenu();
                    });
                    menu.appendChild(menuItem);
                });
                
                document.body.appendChild(menu);
                
                // Remove menu on any subsequent click
                window.setTimeout(() => {
                    const clickHandler = function(e) {
                        if (!menu.contains(e.target)) {
                            removeContextMenu();
                            document.removeEventListener('click', clickHandler);
                        }
                    };
                    document.addEventListener('click', clickHandler);
                }, 0);
            });
        });
        
        // Global cleanup on any mouse movement outside commit items
        document.addEventListener('mousemove', function(e) {
            const target = e.target;
            if (target && !target.closest('.commit-item') && !target.closest('.commit-context-menu')) {
                removeAllTooltips();
            }
        });
        
        // Also close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                removeContextMenu();
            }
        });
    }
    
    function renderCommitItem(commit, index) {
        // Extract author name, handling edge cases like "Name <email>" or multi-word names
        let author = commit.author;
        if (author.includes('<')) {
            // If there's an email like "Name <email>", extract just the name part
            author = author.split('<')[0].trim();
        }
        // Take first word for display brevity, but only if it exists
        author = author.split(/\s+/)[0] || author;
        
        // Parse branch/tag refs
        const refs = commit.refs ? commit.refs.split(',').map(r => r.trim()).filter(r => r) : [];
        const branchBadges = refs.map(ref => {
            let badgeClass = 'branch-badge';
            let displayName = ref;
            
            if (ref.includes('HEAD')) {
                badgeClass += ' head-badge';
                displayName = ref.replace('HEAD -> ', '');
            } else if (ref.startsWith('origin/')) {
                badgeClass += ' remote-badge';
            } else if (ref.startsWith('tag: ')) {
                badgeClass += ' tag-badge';
                displayName = ref.replace('tag: ', '');
            } else {
                badgeClass += ' local-badge';
            }
            
            return { badgeClass, displayName };
        });

        const row = createEl('div', 'commit-item');
        row.dataset.hash = commit.hash;
        row.dataset.index = String(index);
        row.addEventListener('click', () => viewCommit(commit.hash));

        const hash = createEl('span', 'commit-hash', commit.hash);
        hash.style.color = 'var(--vscode-descriptionForeground)';
        hash.style.fontFamily = 'monospace';
        hash.style.flexShrink = '0';
        hash.style.width = '80px';
        row.appendChild(hash);

        row.appendChild(createEl('span', 'commit-message', commit.message));

        branchBadges.forEach(badge => {
            row.appendChild(createEl('span', badge.badgeClass, badge.displayName));
        });

        row.appendChild(createEl('span', 'commit-author', author));
        return row;
    }



    function getStatusLabel(status) {
        const labels = {
            'M': 'Modified',
            'A': 'Added',
            'D': 'Deleted',
            'R': 'Renamed',
            'C': 'Copied',
            '?': 'Untracked',
            'U': 'Untracked'
        };
        return labels[status] || 'Changed';
    }

    // Commands
    function selectRepo() {
        vscode.postMessage({ command: 'selectRepository' });
    }

    function switchRepo(repoPath) {
        vscode.postMessage({ command: 'switchRepository', repoPath: repoPath });
    }

    function showMenu() {
        vscode.postMessage({ command: 'showMenu' });
    }

    function execCommand(commandId) {
        vscode.postMessage({ command: 'execCommand', commandId: commandId });
    }

    function openFile(path) {
        vscode.postMessage({ command: 'openFile', path: path });
    }

    function openDiff(path, staged) {
        vscode.postMessage({ command: 'openDiff', path: path, staged: staged });
    }

    function stageFile(path) {
        vscode.postMessage({ command: 'stageFile', path: path });
    }

    function unstageFile(path) {
        vscode.postMessage({ command: 'unstageFile', path: path });
    }

    function viewCommit(hash) {
        vscode.postMessage({ command: 'viewCommit', hash: hash });
    }

    function copyHash(hash) {
        vscode.postMessage({ command: 'copyHash', hash: hash });
    }

    function rewordCommit(hash) {
        vscode.postMessage({ command: 'rewordCommit', hash: hash });
    }

    function squashToSingle(hash) {
        vscode.postMessage({ command: 'squashToSingle', hash: hash });
    }

    function copyMessage(message) {
        vscode.postMessage({ command: 'copyMessage', message: message });
    }

    function navigateTo(menuId) {
        vscode.postMessage({ command: 'navigateTo', menuId: menuId });
    }

    function navigateBack() {
        vscode.postMessage({ command: 'navigateBack' });
    }

    function execMenuCommand(commandId) {
        vscode.postMessage({ command: 'execMenuCommand', commandId: commandId });
    }

    function navigateToView(viewType) {
        vscode.postMessage({ command: 'navigateToView', viewType: viewType });
    }

    function saveSetup() {
        const commitPrefix = document.getElementById('commitPrefix');
        const requireTests = document.getElementById('requireTests');
        
        if (!commitPrefix || !requireTests) {
            // eslint-disable-next-line no-console
            console.error('Setup form controls not found');
            return;
        }
        
        const config = {
            commitPrefix: commitPrefix.value,
            requireTests: requireTests.value
        };
        vscode.postMessage({ command: 'saveSetup', config: config });
    }

    window.selectRepo = selectRepo;
    window.switchRepo = switchRepo;
    window.showMenu = showMenu;
    window.execCommand = execCommand;
    window.openFile = openFile;
    window.openDiff = openDiff;
    window.stageFile = stageFile;
    window.unstageFile = unstageFile;
    window.viewCommit = viewCommit;
    window.copyHash = copyHash;
    window.rewordCommit = rewordCommit;
    window.squashToSingle = squashToSingle;
    window.copyMessage = copyMessage;
    window.navigateTo = navigateTo;
    window.navigateBack = navigateBack;
    window.execMenuCommand = execMenuCommand;
    window.navigateToView = navigateToView;
    window.saveSetup = saveSetup;
})();
