const { parseTalkCommand } = require('./src/utils/articleParser');

console.log('Testing parseTalkCommand:');
console.log('Input: ["to", "that", "guardian"]');
console.log('Output:', parseTalkCommand(["to", "that", "guardian"]));
console.log();
console.log('Input: ["guardian"]');
console.log('Output:', parseTalkCommand(["guardian"]));