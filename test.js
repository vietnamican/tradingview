const { symbols, modes } = require("./params.js")

console.log(symbols);

x = [];
symbols.forEach((symbol, index)=>{
    x.push({"symbol": symbol, "mode": modes[index]});
})

console.log(x);