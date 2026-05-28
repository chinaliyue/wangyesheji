/**
 * 交易大师控制台 - 历史记录管理模块
 * 处理交易历史的添加、渲染、导入导出等操作
 */

class HistoryManager {
    constructor() {
        this.tbodyId = 'logs-tbody';
        this.storageKey = 'alpha_station_logs';
    }

    /**
     * 获取 tbody 元素
     * @returns {HTMLElement} tbody 元素
     */
    getTbody() {
        return document.getElementById(this.tbodyId);
    }

    /**
     * 添加交易记录到历史（最新在上方）
     * @param {string} symbol - 商品代码
     * @param {string} direction - 方向 (BUY/SELL)
     * @param {number|string} lots - 手数
     * @param {number} profit - 盈亏金额
     * @param {string|null} balance - 余额（可选）
     */
    addToHistory(symbol, direction, lots, profit, balance = null) {
        const tbody = this.getTbody();
        const timeStr = DateTimeUtils.nowToString();
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-profit', profit);
        
        // 计算新余额
        let newBalance = balance;
        if (newBalance === null) {
            const lastBalance = this.getLastBalance();
            if (lastBalance !== null) {
                newBalance = lastBalance + profit;
            }
        }
        
        if (newBalance !== null && !isNaN(newBalance)) {
            tr.setAttribute('data-balance', newBalance);
        }
        
        const profitClass = ProfitCalculator.getProfitClass(profit);
        const directionClass = ProfitCalculator.getDirectionClass(direction);
        const profitDisplay = ProfitCalculator.formatAmount(profit);
        
        tr.innerHTML = `
            <td>${timeStr}</td>
            <td><strong>${symbol}</strong></td>
            <td class="${directionClass}">${direction}</td>
            <td>${lots}</td>
            <td class="${profitClass}">${profitDisplay}</td>
        `;
        
        // 插入到最前面（最新在上）
        tbody.insertBefore(tr, tbody.firstChild);
        
        // 重新渲染权益曲线
        if (typeof app !== 'undefined' && app.chartManager) {
            app.chartManager.render();
        }
        
        this.saveToStorage();
    }

    /**
     * 手动添加记录（从输入框）
     */
    addManualLog() {
        const sym = document.getElementById('log-symbol').value.toUpperCase();
        const dir = document.getElementById('log-dir').value;
        const profitVal = parseFloat(document.getElementById('log-profit').value) || 0;
        const lotsVal = document.getElementById('log-lots').value;
        
        this.addToHistory(sym, dir, lotsVal, profitVal);
    }

    /**
     * 清空所有历史记录
     */
    clearLogs() {
        if (confirm('确定清空所有本地历史交易流水吗？')) {
            this.getTbody().innerHTML = '';
            if (typeof app !== 'undefined' && app.chartManager) {
                app.chartManager.render();
            }
            this.saveToStorage();
        }
    }

    /**
     * 获取历史记录中的最后余额
     * @returns {number|null} 最后余额或 null
     */
    getLastBalance() {
        const rows = Array.from(this.getTbody().querySelectorAll('tr'));
        for (let row of rows) {
            const bal = row.getAttribute('data-balance');
            if (bal !== null && !isNaN(parseFloat(bal))) {
                return parseFloat(bal);
            }
        }
        return null;
    }

    /**
     * 获取所有历史记录数据
     * @returns {Array} 历史记录数组
     */
    getAllLogs() {
        const logs = [];
        const rows = this.getTbody().querySelectorAll('tr');
        
        rows.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 5) {
                const profitAttr = tr.getAttribute('data-profit');
                const balanceAttr = tr.getAttribute('data-balance');
                logs.push({
                    time: tds[0].innerText,
                    symbol: tds[1].innerText,
                    dir: tds[2].innerText,
                    lots: tds[3].innerText,
                    profit: profitAttr ? parseFloat(profitAttr) : 0,
                    balance: balanceAttr ? parseFloat(balanceAttr) : null
                });
            }
        });
        
        return logs;
    }

    /**
     * 批量加载历史记录数据
     * @param {Array} logs - 历史记录数组
     */
    loadLogs(logs) {
        const tbody = this.getTbody();
        tbody.innerHTML = '';
        
        // 存储时按时间升序，恢复时反转保持最新在上
        logs.slice().reverse().forEach(l => {
            const tr = document.createElement('tr');
            const profitVal = parseFloat(l.profit) || 0;
            
            tr.setAttribute('data-profit', profitVal);
            if (l.balance !== null && !isNaN(l.balance)) {
                tr.setAttribute('data-balance', l.balance);
            }
            
            const profitClass = ProfitCalculator.getProfitClass(profitVal);
            const directionClass = ProfitCalculator.getDirectionClass(l.dir);
            const profitDisplay = ProfitCalculator.formatAmount(profitVal);
            
            tr.innerHTML = `
                <td>${l.time}</td>
                <td><strong>${l.symbol}</strong></td>
                <td class="${directionClass}">${l.dir}</td>
                <td>${l.lots}</td>
                <td class="${profitClass}">${profitDisplay}</td>
            `;
            
            tbody.appendChild(tr);
        });
        
        if (typeof app !== 'undefined' && app.chartManager) {
            app.chartManager.render();
        }
    }

    /**
     * 保存到 localStorage
     */
    saveToStorage() {
        const logs = this.getAllLogs();
        localStorage.setItem(this.storageKey, JSON.stringify(logs));
        
        if (typeof app !== 'undefined' && app.storageManager) {
            app.storageManager.triggerSaveStatus();
        }
    }

    /**
     * 从 localStorage 加载
     * @returns {Array} 历史记录数组
     */
    loadFromStorage() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse logs from storage:', e);
            return [];
        }
    }

    /**
     * 处理导入的数据（二维数组格式）
     * @param {Array<Array>} dataArray - 二维数组数据
     */
    processImportedData(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            alert('❌ 未找到任何数据');
            return;
        }
        
        // 智能查找表头行
        let headerRowIndex = -1;
        let headers = [];
        
        for (let i = 0; i < dataArray.length; i++) {
            const row = dataArray[i];
            if (!row || row.length === 0) continue;
            
            const rowStr = row.join(' ').toLowerCase();
            
            // 跳过明显的非表头行
            if (rowStr.includes('=====') || rowStr.includes('工作表') || rowStr.includes('report') || rowStr.includes('account:')) continue;
            if (row.length < 3) continue;
            
            // 检查是否包含关键表头词汇
            const hasTime = row.some(cell => {
                const c = (cell || '').toLowerCase();
                return c.includes('time') || c.includes('date') || c.includes('时间') || c.includes('close') || c.includes('open');
            });
            
            const hasSymbol = row.some(cell => {
                const c = (cell || '').toLowerCase();
                return c.includes('symbol') || c.includes('品种') || c.includes('商品') || c.includes('product') || c.includes('ticker');
            });
            
            if (hasTime && hasSymbol) {
                headerRowIndex = i;
                headers = row.map(h => (h || '').replace(/['"]/g, '').trim().toLowerCase());
                break;
            }
            
            // 备用方案
            if (row.some(cell => (cell || '').toLowerCase() === 'symbol' || (cell || '').toLowerCase() === 'time')) {
                headerRowIndex = i;
                headers = row.map(h => (h || '').replace(/['"]/g, '').trim().toLowerCase());
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            headerRowIndex = 0;
            headers = dataArray[0].map(h => (h || '').replace(/['"]/g, '').trim().toLowerCase());
        }
        
        // 映射列索引
        const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('date') || h.includes('时间') || h.includes('close') || h.includes('结算'));
        const symbolIdx = headers.findIndex(h => h.includes('symbol') || h.includes('品种') || h.includes('商品') || h.includes('product') || h.includes('ticker'));
        const directionIdx = headers.findIndex(h => h.includes('direction') || h.includes('type') || h.includes('方向') || h.includes('buy/sell') || h.includes('action'));
        const lotsIdx = headers.findIndex(h => h.includes('lot') || h.includes('volume') || h.includes('数量') || h.includes('size') || h.includes('hand'));
        const profitIdx = headers.findIndex(h => h.includes('profit') || h.includes('pnl') || h.includes('盈亏') || h.includes('gain') || h.includes('loss') || h.includes('net'));
        const balanceIdx = headers.findIndex(h => h.includes('balance') || h.includes('余额') || h.includes('equity'));
        
        if (timeIdx === -1 || symbolIdx === -1) {
            const debugInfo = `无法识别必要列（时间、品种）。\n\n检测到的表头:\n${headers.join(', ')}\n\n请确保 Excel 文件包含类似以下列名:\n- Time/Date/时间/平仓时间\n- Symbol/品种/商品`;
            console.error(debugInfo);
            alert('❌ ' + debugInfo);
            return;
        }
        
        const tbody = this.getTbody();
        tbody.innerHTML = '';
        let importedCount = 0;
        
        for (let i = headerRowIndex + 1; i < dataArray.length; i++) {
            const row = dataArray[i];
            
            if (!row || row.length === 0 || row[0]?.startsWith('=====') || row[0]?.startsWith('工作表')) continue;
            
            const maxIdx = Math.max(timeIdx, symbolIdx, profitIdx !== -1 ? profitIdx : 0, lotsIdx !== -1 ? lotsIdx : 0);
            if (row.length <= maxIdx) continue;
            
            let timeStr = row[timeIdx] || '';
            
            // 处理 Excel 日期格式
            if (typeof timeStr === 'number') {
                timeStr = DateTimeUtils.parseExcelDate(timeStr);
            }
            
            let symbol = (row[symbolIdx] || '').toString().toUpperCase();
            let rawDir = directionIdx !== -1 ? (row[directionIdx] || 'BUY') : 'BUY';
            let direction = Validator.normalizeDirection(rawDir);
            
            let lotsRaw = lotsIdx !== -1 ? (row[lotsIdx] || '0.01') : '0.01';
            if (typeof lotsRaw === 'number') lotsRaw = lotsRaw.toString();
            
            let netProfit = 0;
            if (profitIdx !== -1 && row[profitIdx] !== undefined) {
                const profitVal = row[profitIdx];
                if (typeof profitVal === 'string') {
                    netProfit = parseFloat(profitVal.replace(/[^\d.-]/g, '')) || 0;
                } else if (typeof profitVal === 'number') {
                    netProfit = profitVal;
                }
            }
            
            let balance = NaN;
            if (balanceIdx !== -1 && row[balanceIdx] !== undefined) {
                const balVal = row[balanceIdx];
                if (typeof balVal === 'string') {
                    balance = parseFloat(balVal.replace(/[^\d.-]/g, ''));
                } else if (typeof balVal === 'number') {
                    balance = balVal;
                }
            }
            
            if (!symbol || (profitIdx !== -1 && isNaN(netProfit) && balanceIdx === -1)) continue;
            
            const tr = document.createElement('tr');
            tr.setAttribute('data-profit', netProfit);
            if (!isNaN(balance)) tr.setAttribute('data-balance', balance);
            
            const profitClass = ProfitCalculator.getProfitClass(netProfit);
            const directionClass = ProfitCalculator.getDirectionClass(direction);
            const profitDisplay = ProfitCalculator.formatAmount(netProfit);
            
            tr.innerHTML = `
                <td>${timeStr}</td>
                <td><strong>${symbol}</strong></td>
                <td class="${directionClass}">${direction}</td>
                <td>${lotsRaw}</td>
                <td class="${profitClass}">${profitDisplay}</td>
            `;
            
            tbody.appendChild(tr);
            importedCount++;
        }
        
        if (importedCount === 0) {
            alert('⚠️ 未解析到有效交易数据。请检查文件格式。');
        } else {
            if (typeof app !== 'undefined' && app.chartManager) {
                app.chartManager.render();
            }
            this.saveToStorage();
            alert(`✅ 成功导入 ${importedCount} 笔交易记录！`);
        }
    }
}

// 导出为全局对象
if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager;
}

// 支持 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}
