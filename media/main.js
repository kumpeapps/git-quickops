// Main script for webview
(function() {
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'update':
                renderView(message.data);
                break;
        }
    });

    function renderView(data) {
        if (data.error) {
            document.getElementById('content').innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
                    <div>${data.error}</div>
                </div>
            `;
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
        }
    }
    
    function renderRepositories(data) {
        let html = `
            <div class="section-header" style="padding: 12px; border-bottom: 1px solid var(--vscode-list-focusOutlineOffset);">
                <span style="font-size: 13px; font-weight: 600;">REPOSITORIES</span>
            </div>
            <div style="padding: 4px;">
        `;
        
        data.repos.forEach(repo => {
            const isSelected = repo.path === data.selectedRepo;
            html += `
                <div class="nav-item clickable ${isSelected ? 'selected' : ''}" onclick="switchRepo('${escapeHtml(repo.path)}')" style="${isSelected ? 'background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground);' : ''}">
                    <span class="nav-icon">${isSelected ? '✓' : '📁'}</span>
                    <div style="flex: 1;">
                        <div class="nav-label">${escapeHtml(repo.name)}</div>
                        <div class="nav-description" style="font-size: 11px;">${escapeHtml(repo.path)}</div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        document.getElementById('content').innerHTML = html;
    }

    function renderNavigation(data) {
        let html = '';

        if (data.showBackButton) {
            html += `
                <div class="section-header" style="padding: 12px; border-bottom: 1px solid var(--vscode-list-focusOutlineOffset); display: flex; align-items: center; gap: 8px;">
                    <span class="nav-icon clickable" onclick="navigateBack()" style="cursor: pointer;">←</span>
                    <span style="font-size: 13px; font-weight: 600;">MENU</span>
                </div>
            `;
        } else {
            html += `
                <div class="section-header" style="padding: 12px; border-bottom: 1px solid var(--vscode-list-focusOutlineOffset);">
                    <span style="font-size: 13px; font-weight: 600;">MENU</span>
                </div>
            `;
        }

        html += `<div style="padding: 4px;">`;

        if (data.menuItems && data.menuItems.length > 0) {
            data.menuItems.forEach(item => {
                const hasSubmenu = item.hasSubmenu || false;
                const hasView = item.view !== undefined;
                const icon = item.icon || '•';
                let clickHandler;
                if (hasView) {
                    clickHandler = `navigateToView('${escapeHtml(item.view)}')`;
                } else if (hasSubmenu) {
                    clickHandler = `navigateTo('${escapeHtml(item.menuId)}')`;
                } else {
                    clickHandler = `execMenuCommand('${escapeHtml(item.command)}')`;
                }
                html += `
                    <div class="nav-item clickable" onclick="${clickHandler}">
                        <span class="nav-icon">${icon}</span>
                        <span class="nav-label">${escapeHtml(item.label)}</span>
                        ${hasSubmenu ? '<span style="margin-left: auto;">→</span>' : ''}
                    </div>
                `;
            });
        } else {
            html += `<div style="padding: 12px; color: var(--vscode-descriptionForeground);">No menu items</div>`;
        }

        html += `</div>`;
        document.getElementById('content').innerHTML = html;
    }

    function renderChanges(data) {
        let html = '';
        
        if (data.staged.length === 0 && data.unstaged.length === 0) {
            html = `
                <div class="empty-state">
                    <div style="font-size: 32px; margin-bottom: 8px;">✓</div>
                    <div>No changes</div>
                    <div style="font-size: 11px; margin-top: 4px;">Working tree clean</div>
                </div>
            `;
        } else {
            if (data.staged.length > 0) {
                html += `
                    <div class="section">
                        <div class="section-header">
                            <span class="section-icon">☁</span>
                            <span>STAGED CHANGES</span>
                            <span style="margin-left: auto;">${data.staged.length}</span>
                        </div>
                        ${data.staged.map(f => renderFileItem(f, true)).join('')}
                    </div>
                `;
            }
            
            if (data.unstaged.length > 0) {
                html += `
                    <div class="section">
                        <div class="section-header">
                            <span class="section-icon">≠</span>
                            <span>CHANGES</span>
                            <span style="margin-left: auto;">${data.unstaged.length}</span>
                        </div>
                        ${data.unstaged.map(f => renderFileItem(f, false)).join('')}
                    </div>
                `;
            }
        }
        
        document.getElementById('content').innerHTML = html;
    }

    function renderFileItem(file, staged) {
        const statusChar = file.status === '?' ? '?' : file.status;
        const statusClass = file.status === '?' ? 'U' : file.status;
        const statusLabel = getStatusLabel(file.status);
        const action = staged ? 'unstageFile' : 'stageFile';
        const actionLabel = staged ? 'Unstage' : 'Stage';
        
        return `
            <div class="file-item" onclick="openDiff('${escapeHtml(file.path)}', ${staged})">
                <span class="file-status ${statusClass}" title="${statusLabel}">${statusChar}</span>
                <span class="file-name">${escapeHtml(file.path)}</span>
                <div class="file-actions">
                    <button class="file-action-btn" onclick="event.stopPropagation(); ${action}('${escapeHtml(file.path)}')">${actionLabel}</button>
                </div>
            </div>
        `;
    }

    function renderCommits(data) {
        if (!data.commits || data.commits.length === 0) {
            document.getElementById('content').innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 32px; margin-bottom: 8px;">ℹ</div>
                    <div>No commits</div>
                </div>
            `;
            return;
        }

        const html = `
            <div class="commits-container" style="position: relative;">
                ${data.commits.map((commit, index) => renderCommitItem(commit, index, 0)).join('')}
            </div>
        `;
        
        document.getElementById('content').innerHTML = html;
        setupCommitTooltips(data.commits);
    }
    
    function renderSetup(data) {
        const html = `
            <div class="section-header" style="padding: 12px; border-bottom: 1px solid var(--vscode-list-focusOutlineOffset); display: flex; align-items: center; gap: 8px;">
                <span class="nav-icon clickable" onclick="navigateBack()" style="cursor: pointer;">←</span>
                <span style="font-size: 13px; font-weight: 600;">SETUP</span>
            </div>
            <div style="padding: 16px;">
                <form id="setupForm" onsubmit="event.preventDefault(); saveSetup();">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px;">Commit Prefix</label>
                        <input 
                            type="text" 
                            id="commitPrefix" 
                            value="${escapeHtml(data.config.commitPrefix)}"
                            placeholder="e.g., [{{branch}}] or {{ticket}}: "
                            style="width: 100%; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;"
                        />
                        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
                            Use {{branch}} or {{ticket}} as placeholders
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px;">Require Tests Before Commit</label>
                        <select 
                            id="requireTests"
                            style="width: 100%; padding: 4px 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;"
                        >
                            <option value="disabled">Disabled</option>
                            <option value="warn">Warn if tests fail</option>
                            <option value="prevent">Prevent commit if tests fail</option>
                        </select>
                        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
                            Runs tests before committing when enabled
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        style="padding: 6px 14px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; cursor: pointer;"
                        onmouseover="this.style.background='var(--vscode-button-hoverBackground)'"
                        onmouseout="this.style.background='var(--vscode-button-background)'"
                    >
                        Save Configuration
                    </button>
                </form>
            </div>
        `;
        document.getElementById('content').innerHTML = html;
        
        // Set the dropdown value after rendering to ensure it's properly selected
        const requireTestsDropdown = document.getElementById('requireTests');
        if (requireTestsDropdown) {
            requireTestsDropdown.value = data.config.requireTests || 'disabled';
        }
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
                const index = parseInt(this.getAttribute('data-index'));
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
                setTimeout(() => {
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
    
    function drawCommitGraph(commits, maxCols, rowHeight, colWidth) {
        const svg = document.querySelector('.commits-graph');
        if (!svg) {
            console.log('SVG element not found');
            return;
        }
        
        console.log('Drawing graph for', commits.length, 'commits, maxCols:', maxCols);
        
        // Track column positions based on git graph output
        const dotPositions = [];
        const columnColors = {}; // Map column index to color
        const colors = ['#f14c4c', '#3794ff', '#e2c08d', '#89d185', '#b180d7', '#ea5c00'];
        
        // First pass: find all dot positions and assign colors
        commits.forEach((commit, idx) => {
            const graphStr = commit.graphRaw || '';
            let col = 0;
            
            // Find the commit dot position - look for * or o
            const circleIdx = graphStr.indexOf('*');
            const hollowIdx = graphStr.indexOf('o');
            const dotIdx = circleIdx >= 0 ? circleIdx : (hollowIdx >= 0 ? hollowIdx : -1);
            
            if (dotIdx >= 0) {
                col = Math.floor(dotIdx / 2);
            }
            
            // Assign color to this column if we haven't seen it before
            if (!(col in columnColors)) {
                columnColors[col] = colors[Object.keys(columnColors).length % colors.length];
            }
            
            const x = colWidth * (col + 0.5) + 8;
            const y = idx * rowHeight + rowHeight / 2;
            
            dotPositions.push({ x, y, col, idx, color: columnColors[col], graphStr });
        });
        
        console.log('Dots:', dotPositions.length, ', Colors:', Object.keys(columnColors).length);
        
        // Draw lines based on git graph structure
        const lineColor = '#888';
        let lineCount = 0;
        
        for (let i = 0; i < dotPositions.length - 1; i++) {
            const current = dotPositions[i];
            const next = dotPositions[i + 1];
            const graphStr = current.graphStr || '';
            
            // Parse each column for line characters
            for (let col = 0; col < maxCols && col * 2 < graphStr.length; col++) {
                const x = colWidth * (col + 0.5) + 8;
                const y = current.y;
                const nextY = next.y;
                
                const ch = graphStr[col * 2] || ' ';
                
                if (ch === '|') {
                    // Vertical line - continue straight down
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x);
                    line.setAttribute('y1', y);
                    line.setAttribute('x2', x);
                    line.setAttribute('y2', nextY);
                    line.setAttribute('stroke', lineColor);
                    line.setAttribute('stroke-width', '1.5');
                    svg.appendChild(line);
                    lineCount++;
                } else if (ch === '/') {
                    // Branch line going left (coming from left column below)
                    const nextCol = next.col;
                    const nextX = nextCol === col - 1 ? x - colWidth : x;
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    const d = `M ${x} ${y} Q ${(x + nextX) / 2} ${(y + nextY) / 2} ${nextX} ${nextY}`;
                    line.setAttribute('d', d);
                    line.setAttribute('stroke', lineColor);
                    line.setAttribute('stroke-width', '1.5');
                    line.setAttribute('fill', 'none');
                    svg.appendChild(line);
                    lineCount++;
                } else if (ch === '\\') {
                    // Merge line going right (going to right column below)
                    const nextCol = next.col;
                    const nextX = nextCol === col + 1 ? x + colWidth : x;
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    const d = `M ${x} ${y} Q ${(x + nextX) / 2} ${(y + nextY) / 2} ${nextX} ${nextY}`;
                    line.setAttribute('d', d);
                    line.setAttribute('stroke', lineColor);
                    line.setAttribute('stroke-width', '1.5');
                    line.setAttribute('fill', 'none');
                    svg.appendChild(line);
                    lineCount++;
                }
            }
        }
        
        console.log('Lines drawn:', lineCount);
        
        // Draw dots - use color based on column/branch
        dotPositions.forEach((pos) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', pos.color);
            circle.setAttribute('stroke', 'none');
            svg.appendChild(circle);
        });
        
        console.log('Dots drawn:', dotPositions.length);
    }

    function renderCommitItem(commit, index, maxCols) {
        const author = commit.author.split(' ')[0];
        
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
            
            return `<span class="${badgeClass}">${escapeHtml(displayName)}</span>`;
        }).join('');
        
        return `
            <div class="commit-item" onclick="viewCommit('${commit.hash}')" data-hash="${commit.hash}" data-index="${index}">
                <span class="commit-hash" style="color: var(--vscode-descriptionForeground); font-family: monospace; flex-shrink: 0; width: 80px;">${commit.hash}</span>
                <span class="commit-message">${escapeHtml(commit.message)}</span>
                ${branchBadges}
                <span class="commit-author">${escapeHtml(author)}</span>
            </div>
        `;
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Commands
    window.selectRepo = function() {
        vscode.postMessage({ command: 'selectRepository' });
    };

    window.switchRepo = function(repoPath) {
        vscode.postMessage({ command: 'switchRepository', repoPath: repoPath });
    };

    window.showMenu = function() {
        vscode.postMessage({ command: 'showMenu' });
    };

    window.execCommand = function(commandId) {
        vscode.postMessage({ command: 'execCommand', commandId: commandId });
    };

    window.openFile = function(path) {
        vscode.postMessage({ command: 'openFile', path: path });
    };

    window.openDiff = function(path, staged) {
        vscode.postMessage({ command: 'openDiff', path: path, staged: staged });
    };

    window.stageFile = function(path) {
        vscode.postMessage({ command: 'stageFile', path: path });
    };

    window.unstageFile = function(path) {
        vscode.postMessage({ command: 'unstageFile', path: path });
    };

    window.viewCommit = function(hash) {
        vscode.postMessage({ command: 'viewCommit', hash: hash });
    };

    window.copyHash = function(hash) {
        vscode.postMessage({ command: 'copyHash', hash: hash });
    };

    window.rewordCommit = function(hash) {
        vscode.postMessage({ command: 'rewordCommit', hash: hash });
    };

    window.squashToSingle = function(hash) {
        vscode.postMessage({ command: 'squashToSingle', hash: hash });
    };

    window.copyMessage = function(message) {
        vscode.postMessage({ command: 'copyMessage', message: message });
    };

    window.switchRepo = function(repoPath) {
        vscode.postMessage({ command: 'switchRepository', repoPath: repoPath });
    };

    window.navigateTo = function(menuId) {
        vscode.postMessage({ command: 'navigateTo', menuId: menuId });
    };

    window.navigateBack = function() {
        vscode.postMessage({ command: 'navigateBack' });
    };

    window.execMenuCommand = function(commandId) {
        vscode.postMessage({ command: 'execMenuCommand', commandId: commandId });
    };

    window.navigateToView = function(viewType) {
        vscode.postMessage({ command: 'navigateToView', viewType: viewType });
    };

    window.saveSetup = function() {
        const config = {
            commitPrefix: document.getElementById('commitPrefix').value,
            requireTests: document.getElementById('requireTests').value
        };
        vscode.postMessage({ command: 'saveSetup', config: config });
    };
})();
