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
    `java -jar antlr-4.13.1-complete.jar -Dlanguage=TypeScript -visitor ${__dirname}/libs/parser/src/lib/grammar/Sheet.g4 -o ${__dirname}/libs/parser/src/lib/grammar/`,
    (error) => {
      if (error) {
        console.error(`exec error: ${error}`);

        return;
      }
    }
  );
});
