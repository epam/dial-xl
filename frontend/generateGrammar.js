const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const sourceFilePath = path.resolve(
  __dirname,
  '../backend/parser/src/main/antlr/com/epam/deltix/quantgrid/parser/Sheet.g4'
);
const destinationFilePath = path.resolve(
  __dirname,
  'libs/parser/src/lib/grammar/Sheet.g4'
);

fs.copyFile(sourceFilePath, destinationFilePath, (err) => {
  if (err) throw err;

  exec(
    `antlr4ts -visitor ${__dirname}/libs/parser/src/lib/grammar/Sheet.g4 -o ${__dirname}/libs/parser/src/lib/grammar/`
  );
});
