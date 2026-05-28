/**
 * 交易大师控制台 - 工具函数模块
 * 提供盈亏估算、数据格式化等通用工具函数
 */

const ProfitCalculator = {
    /**
     * 根据商品、方向、手数和价格计算预估盈亏
     * @param {string} symbol - 交易商品代码
     * @param {string} direction - 交易方向 (BUY/SELL)
     * @param {number} lots - 手数
     * @param {number} openPrice - 开仓价
     * @param {number} currentPrice - 当前价
     * @returns {number} 预估盈亏金额
     */
    estimateProfit(symbol, direction, lots, openPrice, currentPrice) {
        const dirMulti = (direction.toUpperCase() === 'BUY') ? 1 : -1;
        const priceDiff = (currentPrice - openPrice) * dirMulti;
        
        // 默认合约规模 100000 (标准手)
        let contractSize = 100000;
        
        // 对黄金美元 (XAUUSD) 做特殊调整
        if (symbol.toUpperCase().includes('GOLD') || symbol.toUpperCase() === 'XAUUSD') {
            contractSize = 100;  // 0.01 手 每美元波动 1 美元
        }
        
        // 对 US30 等指数也调整
        if (symbol.toUpperCase().includes('US30') || symbol.toUpperCase().includes('US500')) {
            contractSize = 1;   // 1 手 1 点 1 美元
        }
        
        return Math.round(priceDiff * lots * contractSize * 100) / 100;
    },

    /**
     * 格式化金额为带符号的字符串
     * @param {number} amount - 金额
     * @returns {string} 格式化后的金额字符串
     */
    formatAmount(amount) {
        const sign = amount >= 0 ? '+' : '';
        return `${sign}$${amount.toFixed(2)}`;
    },

    /**
     * 获取盈亏对应的 CSS 类名
     * @param {number} profit - 盈亏值
     * @returns {string} CSS 类名 (up-color 或 down-color)
     */
    getProfitClass(profit) {
        return profit >= 0 ? 'up-color' : 'down-color';
    },

    /**
     * 获取方向对应的 CSS 类名
     * @param {string} direction - 方向 (BUY/SELL)
     * @returns {string} CSS 类名
     */
    getDirectionClass(direction) {
        return direction.toUpperCase() === 'BUY' ? 'up-color' : 'down-color';
    }
};

/**
 * 日期时间工具
 */
const DateTimeUtils = {
    /**
     * 格式化为 ISO 字符串 (不含 T 和毫秒)
     * @returns {string} 格式化后的时间字符串
     */
    nowToString() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    },

    /**
     * 解析 Excel 日期序列号
     * @param {number} excelDate - Excel 日期序列号
     * @returns {string} 格式化后的日期字符串
     */
    parseExcelDate(excelDate) {
        const unixDate = (excelDate - 25569) * 86400 * 1000;
        return new Date(unixDate).toISOString().replace('T', ' ').substring(0, 19);
    },

    /**
     * 将时间字符串转换为时间戳用于排序
     * @param {string} timeStr - 时间字符串
     * @returns {number} 时间戳
     */
    toTimestamp(timeStr) {
        return new Date(timeStr).getTime();
    }
};

/**
 * 数据验证工具
 */
const Validator = {
    /**
     * 验证是否为有效的数字
     * @param {any} value - 待验证的值
     * @returns {boolean} 是否有效
     */
    isValidNumber(value) {
        return value !== null && value !== undefined && !isNaN(parseFloat(value));
    },

    /**
     * 验证交易方向
     * @param {string} direction - 方向字符串
     * @returns {boolean} 是否有效
     */
    isValidDirection(direction) {
        const dir = direction?.toUpperCase();
        return dir === 'BUY' || dir === 'SELL';
    },

    /**
     * 标准化交易方向
     * @param {string} direction - 原始方向字符串
     * @returns {string} 标准化的方向 (BUY/SELL)
     */
    normalizeDirection(direction) {
        const dir = direction?.toString().toUpperCase();
        if (dir === 'BUY' || dir === 'SELL') return dir;
        return 'BUY'; // 默认值
    }
};

// 导出为全局对象（浏览器环境）
if (typeof window !== 'undefined') {
    window.ProfitCalculator = ProfitCalculator;
    window.DateTimeUtils = DateTimeUtils;
    window.Validator = Validator;
}

// 支持 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ProfitCalculator,
        DateTimeUtils,
        Validator
    };
}
