const fs = require('fs');

const dirname = '/Users/michael/Documents/blockimmo-contracts/build/contracts';

fs.readdir(dirname, (err, filenames) => {
  if (err) throw err;

  filenames.forEach(filename => {
    fs.readFile(`${dirname}/${filename}`, 'utf-8', (e, content) => {
      if (e) throw e;

      const { contractName, abi } = JSON.parse(content);
      fs.writeFile(`${dirname}/${filename}`, JSON.stringify({ contractName, abi }), _e => {
        if (_e) throw _e;
      });
    });
  });
});
