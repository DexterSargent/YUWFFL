const fs = require('fs');
const path = require('path');

function countLines(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      count += countLines(fullPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      console.log(`${lines.toString().padStart(5)} ${fullPath}`);
      count += lines;
    }
  }
  return count;
}

const total = countLines(path.join(__dirname, 'src'));
console.log(`\nTotal lines: ${total}`);
