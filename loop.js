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
    return false;
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
  }, 1000); // Kiểm tra mỗi 60000ms (1 phút)
}

const filePath = 'nohup.out';
monitorFile(filePath);