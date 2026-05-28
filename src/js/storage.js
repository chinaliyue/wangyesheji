/**
 * 交易大师控制台 - 存储管理模块
 * 处理 localStorage 的持久化、导出导入等操作
 */

class StorageManager {
    constructor() {
        this.storageKey = 'alpha_station_core_data';
        this.saveStatusId = 'save-status';
    }

    /**
     * 组装完整的数据 payload
     * @returns {Object} 包含所有数据的对象
     */
    assemblePayload() {
        // 收集主题面板数据
        const themesData = [];
        document.querySelectorAll('#themes-container .panel').forEach(p => {
            const id = p.getAttribute('data-theme-id');
            const text = document.getElementById('content-' + id).innerText;
            themesData.push({ id, text });
        });

        // 收集持仓数据
        const portfolioData = [];
        document.querySelectorAll('#portfolio-tbody tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length >= 5) {
                portfolioData.push({
                    symbol: inputs[0].value,
                    dir: inputs[1].value,
                    lots: inputs[2].value,
                    openPrice: inputs[3].value,
                    curPrice: inputs[4].value
                });
            }
        });

        // 收集历史记录数据
        const logsData = [];
        document.querySelectorAll('#logs-tbody tr').forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 5) {
                const profitAttr = tr.getAttribute('data-profit');
                const balanceAttr = tr.getAttribute('data-balance');
                logsData.push({
                    time: tds[0].innerText,
                    symbol: tds[1].innerText,
                    dir: tds[2].innerText,
                    lots: tds[3].innerText,
                    profit: profitAttr ? parseFloat(profitAttr) : 0,
                    balance: balanceAttr ? parseFloat(balanceAttr) : null
                });
            }
        });

        return {
            version: '7.0-refactored',
            timestamp: Date.now(),
            themes: themesData,
            portfolio: portfolioData,
            logs: logsData
        };
    }

    /**
     * 自动保存到 localStorage
     */
    autoSave() {
        const payload = this.assemblePayload();
        localStorage.setItem(this.storageKey, JSON.stringify(payload));
        this.triggerSaveStatus();
    }

    /**
     * 触发保存状态显示
     */
    triggerSaveStatus() {
        const statusEl = document.getElementById(this.saveStatusId);
        if (statusEl) {
            statusEl.innerText = '⚡ 实时保存';
            statusEl.style.color = 'var(--accent-green)';
            setTimeout(() => {
                statusEl.innerText = '💾 持久缓存已锁死';
                statusEl.style.color = 'var(--accent-gold)';
            }, 1000);
        }
    }

    /**
     * 应用 payload 到 UI
     * @param {Object} payload - 数据对象
     */
    applyPayloadToUI(payload) {
        // 恢复主题面板
        if (payload.themes) {
            payload.themes.forEach(t => {
                const el = document.getElementById('content-' + t.id);
                if (el) {
                    el.innerText = t.text;
                    this.formatTurtleFormula(el);
                }
            });
        }

        // 恢复持仓
        if (payload.portfolio && app.positionManager) {
            app.positionManager.loadPositions(payload.portfolio);
        }

        // 恢复历史记录
        if (payload.logs && app.historyManager) {
            app.historyManager.loadLogs(payload.logs);
        }

        // 重新渲染图表
        if (app.chartManager) {
            app.chartManager.render();
        }
    }

    /**
     * 从 localStorage 加载数据
     * @returns {boolean} 是否成功加载
     */
    loadFromStorage() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return false;
        
        try {
            const payload = JSON.parse(raw);
            this.applyPayloadToUI(payload);
            return true;
        } catch (e) {
            console.error('Failed to load from storage:', e);
            return false;
        }
    }

    /**
     * 导出数据为 JSON 文件
     */
    exportData() {
        const payload = this.assemblePayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `AlphaStation_v7_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * 从 JSON 文件导入数据
     * @param {File} file - JSON 文件
     */
    importJSON(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.applyPayloadToUI(data);
                this.autoSave();
                alert('✅ 快照恢复成功');
            } catch (err) {
                console.error('JSON parse error:', err);
                alert('❌ 解析失败：' + err.message);
            }
        };
        reader.readAsText(file);
    }

    /**
     * 格式化海龟公式显示
     * @param {HTMLElement} block - 内容块元素
     */
    formatTurtleFormula(block) {
        if (block.innerHTML.includes('头寸单位')) {
            block.innerHTML = block.innerHTML.replace(
                /(头寸单位 [：\s=]+)([^单\n]+)/g, 
                '<div class="formula-box">$2</div>'
            );
        }
    }

    /**
     * 切换主题编辑模式
     * @param {string} themeId - 主题 ID
     */
    toggleThemeEdit(themeId) {
        const block = document.getElementById('content-' + themeId);
        const panel = block.closest('.panel');
        const btn = panel.querySelector('.action-badge-btn');
        
        if (!block.querySelector('textarea')) {
            // 进入编辑模式
            block.innerHTML = `<textarea class="editable-textarea" oninput="app.storageManager.autoSave()">${block.innerText}</textarea>`;
            btn.innerText = '💾 保存';
            btn.classList.add('saving');
        } else {
            // 保存并退出编辑模式
            let val = block.querySelector('textarea').value;
            block.innerText = val;
            this.formatTurtleFormula(block);
            btn.innerText = '📝 修改';
            btn.classList.remove('saving');
            this.autoSave();
        }
    }
}

// 导出为全局对象
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

// 支持 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
