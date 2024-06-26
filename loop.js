const fs = require('fs');

let previousLineCount = null;

function countLines(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent.split('\n').length;
}

function checkFileChanges(filePath) {
  const currentLineCount = countLines(filePath);
  console.log(`Số dòng trong file ${currentLineCount}`);
  if (previousLineCount === null) {
    previousLineCount = currentLineCount;
    return true;
  }

  if (currentLineCount !== previousLineCount) {
    previousLineCount = currentLineCount;
    return true;
  }

  return false;
}

function monitorFile(filePath) {
  setInterval(() => {
    const hasChanged = checkFileChanges(filePath);
    console.log(`File đã thay đổi: ${hasChanged}`);
  }, 150000); // Kiểm tra mỗi 150000ms (2.5 phút)
}

const filePath = 'log.txt';
monitorFile(filePath);