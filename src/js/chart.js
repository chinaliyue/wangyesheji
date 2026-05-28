/**
 * 交易大师控制台 - 权益曲线图表模块
 * 负责渲染资产净值曲线、计算 KPI 指标等
 */

class ChartManager {
    constructor() {
        this.svgLineId = 'svg-line';
        this.svgAreaId = 'svg-area';
        this.svgPeakTextId = 'svg-peak-text';
        this.kpiCountId = 'kpi-count';
        this.kpiWinrateId = 'kpi-winrate';
        this.kpiDrawdownId = 'kpi-drawdown';
        this.kpiTotalReturnId = 'kpi-total-return';
        this.logsTbodyId = 'logs-tbody';
        
        // 存储当前图表数据点
        this.chartPoints = [];
        this.chartTimes = [];
        this.balanceRange = { minB: 0, maxB: 0 };
    }

    /**
     * 获取元素
     */
    getElement(id) {
        return document.getElementById(id);
    }

    /**
     * 渲染权益曲线和 KPI 指标
     */
    render() {
        const rows = Array.from(this.getElement(this.logsTbodyId).querySelectorAll('tr'));
        
        if (rows.length === 0) {
            this.clearChart();
            return;
        }
        
        // 解析记录数据
        let records = [];
        for (let tr of rows) {
            const timeCell = tr.cells[0];
            const profitAttr = tr.getAttribute('data-profit');
            const balanceAttr = tr.getAttribute('data-balance');
            const profitVal = parseFloat(profitAttr) || 0;
            const balanceVal = balanceAttr !== null ? parseFloat(balanceAttr) : NaN;
            let timeStr = timeCell ? timeCell.innerText.trim() : '';
            
            records.push({ 
                time: timeStr, 
                profit: profitVal, 
                balance: balanceVal 
            });
        }
        
        // 按时间升序排序（旧到新）
        records.sort((a, b) => DateTimeUtils.toTimestamp(a.time) - DateTimeUtils.toTimestamp(b.time));
        
        // 构建余额序列
        let balanceSeries = [];
        let timeSeries = [];
        let profitsForWin = [];
        let hasBalance = records.some(r => !isNaN(r.balance));
        
        if (hasBalance) {
            for (let rec of records) {
                if (!isNaN(rec.balance)) {
                    balanceSeries.push(rec.balance);
                    timeSeries.push(rec.time);
                    profitsForWin.push(rec.profit);
                }
            }
            
            // 补齐起始点
            if (balanceSeries.length && records.length && isNaN(records[0].balance) && !isNaN(records[0].profit)) {
                let firstKnown = balanceSeries[0];
                let cumuBefore = records.slice(0, records.findIndex(r => !isNaN(r.balance)))
                    .reduce((s, r) => s + r.profit, 0);
                let impliedStart = firstKnown - cumuBefore;
                if (!isNaN(impliedStart)) { 
                    balanceSeries.unshift(impliedStart); 
                    timeSeries.unshift(records[0].time); 
                }
            }
        } else {
            // 无余额数据时使用累计盈亏
            let cumulative = 0;
            for (let rec of records) {
                cumulative += rec.profit;
                balanceSeries.push(cumulative);
                timeSeries.push(rec.time);
                profitsForWin.push(rec.profit);
            }
            if (balanceSeries.length) { 
                balanceSeries.unshift(0); 
                timeSeries.unshift(records[0]?.time || '起始'); 
            }
        }
        
        if (balanceSeries.length === 0) return;
        
        // 保存图表数据供点击使用
        this.chartPoints = [...balanceSeries];
        this.chartTimes = [...timeSeries];
        
        // 计算 KPI 指标
        this.calculateAndRenderKPIs(balanceSeries, profitsForWin);
        
        // 渲染 SVG 图表
        this.renderSVGChart(balanceSeries, timeSeries);
    }

    /**
     * 计算并渲染 KPI 指标
     */
    calculateAndRenderKPIs(balanceSeries, profitsForWin) {
        const finalBalance = balanceSeries[balanceSeries.length - 1];
        const initialBalance = balanceSeries[0];
        const totalNet = finalBalance - initialBalance;
        
        const winCount = profitsForWin.filter(p => p > 0).length;
        const totalTrades = profitsForWin.length;
        const winRate = totalTrades ? (winCount / totalTrades * 100).toFixed(1) : '0.0';
        
        // 计算最大回撤
        let peak = balanceSeries[0];
        let maxDrawdown = 0;
        for (let i = 1; i < balanceSeries.length; i++) {
            if (balanceSeries[i] > peak) peak = balanceSeries[i];
            let dd = peak - balanceSeries[i];
            if (dd > maxDrawdown) maxDrawdown = dd;
        }
        
        // 更新 KPI 显示
        this.getElement(this.kpiCountId).innerText = totalTrades;
        this.getElement(this.kpiWinrateId).innerText = winRate + '%';
        this.getElement(this.kpiDrawdownId).innerText = '$' + maxDrawdown.toFixed(2);
        
        const totalReturnEl = this.getElement(this.kpiTotalReturnId);
        totalReturnEl.innerHTML = (totalNet >= 0 ? '+' : '') + '$' + totalNet.toFixed(2);
        totalReturnEl.className = 'kpi-value ' + ProfitCalculator.getProfitClass(totalNet);
    }

    /**
     * 渲染 SVG 图表
     */
    renderSVGChart(balanceSeries, timeSeries) {
        const svgW = 1200, svgH = 300;
        
        let minB = Math.min(...balanceSeries);
        let maxB = Math.max(...balanceSeries);
        let range = maxB - minB;
        
        if (range === 0) range = 1;
        let padding = range * 0.1;
        minB -= padding; 
        maxB += padding; 
        range = maxB - minB;
        
        let stepX = svgW / (balanceSeries.length - 1 || 1);
        
        // 构建路径字符串
        let pathStr = `M 0 ${svgH - ((balanceSeries[0] - minB) / range) * svgH}`;
        for (let i = 1; i < balanceSeries.length; i++) {
            let x = i * stepX;
            let y = svgH - ((balanceSeries[i] - minB) / range) * svgH;
            pathStr += ` L ${x} ${y}`;
        }
        
        // 更新 SVG 元素
        this.getElement(this.svgLineId).setAttribute('d', pathStr);
        this.getElement(this.svgAreaId).setAttribute('d', pathStr + ` L ${svgW} ${svgH} L 0 ${svgH} Z`);
        this.getElement(this.svgPeakTextId).innerHTML = 
            `最终权益余额：$${balanceSeries[balanceSeries.length - 1].toFixed(2)}  |  起始：$${balanceSeries[0].toFixed(2)}`;
        
        this.balanceRange = { minB, maxB };
    }

    /**
     * 清空图表显示
     */
    clearChart() {
        this.getElement(this.kpiCountId).innerText = '0';
        this.getElement(this.kpiWinrateId).innerText = '0.0%';
        this.getElement(this.kpiDrawdownId).innerText = '$0.00';
        this.getElement(this.kpiTotalReturnId).innerText = '$0.00';
        
        this.getElement(this.svgLineId).setAttribute('d', 'M 0 150 L 1200 150');
        this.getElement(this.svgAreaId).setAttribute('d', 'M 0 150 L 1200 150 L 1200 300 L 0 300 Z');
        this.getElement(this.svgPeakTextId).innerHTML = '基准本金原点：$0.00';
        
        this.chartPoints = [];
        this.chartTimes = [];
    }

    /**
     * 设置图表点击交互
     */
    setupClickInteraction(tooltipId, svgId) {
        const svg = this.getElement(svgId);
        const tooltip = this.getElement(tooltipId);
        
        svg.addEventListener('click', (e) => {
            if (!this.chartPoints || !this.chartPoints.length) { 
                tooltip.style.display = 'none'; 
                return; 
            }
            
            const rect = svg.getBoundingClientRect();
            const scaleX = 1200 / rect.width;
            const clickX = (e.clientX - rect.left) * scaleX;
            
            if (clickX < 0 || clickX > 1200) { 
                tooltip.style.display = 'none'; 
                return; 
            }
            
            let index = Math.round((clickX / 1200) * (this.chartPoints.length - 1));
            index = Math.min(Math.max(0, index), this.chartPoints.length - 1);
            
            const balanceVal = this.chartPoints[index];
            const timeLabel = this.chartTimes[index] || '未知时间';
            
            tooltip.innerHTML = `📌 ${timeLabel}<br>💰 账户余额：$${balanceVal.toFixed(2)}`;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY - 30) + 'px';
            
            setTimeout(() => { tooltip.style.display = 'none'; }, 4000);
        });
        
        // 点击其他地方隐藏 tooltip
        document.body.addEventListener('click', (e) => { 
            if (!svg.contains(e.target)) {
                tooltip.style.display = 'none'; 
            }
        });
    }
}

// 导出为全局对象
if (typeof window !== 'undefined') {
    window.ChartManager = ChartManager;
}

// 支持 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}
