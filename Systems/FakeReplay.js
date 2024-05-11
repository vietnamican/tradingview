const fs = require('fs');
const csv = require('csv-parser');

module.exports = class TradingSystem {
    chart = null;
    indicators = [];
    constructor(chart_file, indicator_files) {
        this.chart = chart;
        this.indicators = indicators;
    }
    loadChart(chart_file) {
        fs.createReadStream(chart_file)
            .pipe(csv())
            .on('data', (row) => {
                console.log(row);
            })
            .on('end', () => {
                console.log('Read end');
            });
    }
}