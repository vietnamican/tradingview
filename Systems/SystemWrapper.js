module.exports = class SystemWrapper {

    constructor(mode, exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, resume_path) {
        this.mode = mode;
        this.exchange_str = exchange_str;
        this.exchange = exchange;
        this.symbol_str = symbol_str;
        this.timeframe_str = timeframe_str;
        this.chart = chart;
        this.indicators = indicators;
        this.resume_path = resume_path;
        this.init();

    }

    init() {
        if (this.mode === 'normal') {
            this.system = SystemADX(this, exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, resume_path);
            this.system.start();
        } else if (this.mode === 'inverse') {
            this.system = SystemADXInverse(this, exchange_str, exchange, symbol_str, timeframe_str, chart, indicators, resume_path)
            this.system.start();
        }
    }

    change_algorithm() {
        history = this.system.history;

        // check when last history is SL, inverse the algorithm (normal->inverse or inverse->normal)
        if (history.length < 2) {
            return;
        } else {
            len = history.length;
            if (history[len - 1] < 0 && history[len - 2] < 0) {
                if (this.mode === 'normal') {
                    this.mode = 'inverse';
                    this.init();
                } else if (this.mode === 'inverse') {
                    this.mode = 'normal';
                    this.init();
                }
            }
        }
    }
}
