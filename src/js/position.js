/**
 * 交易大师控制台 - 持仓管理模块
 * 处理持仓的添加、平仓、更新等操作
 */

class PositionManager {
    constructor() {
        this.tbodyId = 'portfolio-tbody';
        this.storageKey = 'alpha_station_positions';
    }

    /**
     * 获取 tbody 元素
     * @returns {HTMLElement} tbody 元素
     */
    getTbody() {
        return document.getElementById(this.tbodyId);
    }

    /**
     * 添加持仓行
     * @param {Object} data - 持仓数据
     * @param {string} data.symbol - 商品代码
     * @param {string} data.dir - 方向 (BUY/SELL)
     * @param {string|number} data.lots - 手数
     * @param {string|number} data.openPrice - 开仓价
     * @param {string|number} data.curPrice - 当前价
     */
    addPosition(data = null) {
        const tbody = this.getTbody();
        const tr = document.createElement('tr');
        
        const defaultData = data || { 
            symbol: 'EURUSD', 
            dir: 'BUY', 
            lots: '0.01', 
            openPrice: '1.10000', 
            curPrice: '1.10200' 
        };
        
        const directionClass = Validator.getDirectionClass(defaultData.dir);
        
        tr.innerHTML = `
            <td><input type="text" class="editable-cell" value="${defaultData.symbol}" style="font-weight:bold;"></td>
            <td><input type="text" class="editable-cell ${directionClass}" value="${defaultData.dir}"></td>
            <td><input type="text" class="editable-cell" value="${defaultData.lots}"></td>
            <td><input type="text" class="editable-cell" value="${defaultData.openPrice}"></td>
            <td><input type="text" class="editable-cell" value="${defaultData.curPrice}"></td>
            <td><button class="btn btn-sm" onclick="app.positionManager.closePosition(this)">🔒 平仓记录</button></td>
        `;
        
        tbody.appendChild(tr);
        this.saveToStorage();
    }

    /**
     * 平仓操作：计算盈亏，添加到历史记录，删除持仓行
     * @param {HTMLElement} btn - 平仓按钮元素
     */
    closePosition(btn) {
        const row = btn.closest('tr');
        const inputs = row.querySelectorAll('input');
        
        if (inputs.length < 5) return;
        
        const symbol = inputs[0].value.trim().toUpperCase();
        const direction = Validator.normalizeDirection(inputs[1].value);
        const lots = parseFloat(inputs[2].value) || 0.01;
        const openPrice = parseFloat(inputs[3].value);
        const curPrice = parseFloat(inputs[4].value);
        
        if (!Validator.isValidNumber(openPrice) || !Validator.isValidNumber(curPrice)) {
            alert('请填写有效的开仓价和当前现价');
            return;
        }
        
        // 估算盈亏
        let estimated = ProfitCalculator.estimateProfit(symbol, direction, lots, openPrice, curPrice);
        
        // 弹出确认框，允许用户修改盈亏
        let userProfit = prompt(`平仓盈亏 (USD):`, estimated.toFixed(2));
        if (userProfit === null) return; // 取消平仓
        
        let finalProfit = parseFloat(userProfit);
        if (!Validator.isValidNumber(finalProfit)) finalProfit = estimated;
        
        // 添加到历史记录
        app.historyManager.addToHistory(symbol, direction, lots, finalProfit);
        
        // 删除持仓行
        row.remove();
        this.saveToStorage();
    }

    /**
     * 从表格中获取所有持仓数据
     * @returns {Array} 持仓数据数组
     */
    getAllPositions() {
        const positions = [];
        const rows = this.getTbody().querySelectorAll('tr');
        
        rows.forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length >= 5) {
                positions.push({
                    symbol: inputs[0].value,
                    dir: inputs[1].value,
                    lots: inputs[2].value,
                    openPrice: inputs[3].value,
                    curPrice: inputs[4].value
                });
            }
        });
        
        return positions;
    }

    /**
     * 批量加载持仓数据
     * @param {Array} positions - 持仓数据数组
     */
    loadPositions(positions) {
        const tbody = this.getTbody();
        tbody.innerHTML = '';
        positions.forEach(p => this.addPosition(p));
    }

    /**
     * 保存到 localStorage
     */
    saveToStorage() {
        const positions = this.getAllPositions();
        localStorage.setItem(this.storageKey, JSON.stringify(positions));
        
        // 触发全局保存事件
        if (typeof app !== 'undefined' && app.storageManager) {
            app.storageManager.triggerSaveStatus();
        }
    }

    /**
     * 从 localStorage 加载
     * @returns {Array} 持仓数据数组
     */
    loadFromStorage() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse positions from storage:', e);
            return [];
        }
    }
}

// 导出为全局对象
if (typeof window !== 'undefined') {
    window.PositionManager = PositionManager;
}

// 支持 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PositionManager;
}
