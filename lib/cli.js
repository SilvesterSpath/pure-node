/*
 * CLI related tasks
 */

// Dependencies
const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
const os = require('os');
const v8 = require('v8');
const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');
const { stringify } = require('querystring');
const childProcess = require('child_process');

class _events extends events {}
const e = new _events();

// Instantiate the CLI module object
const cli = {};

// Input handlers
e.on('man', (str) => {
  cli.responders.help();
});

e.on('help', (str) => {
  cli.responders.help();
});

e.on('exit', (str) => {
  cli.responders.exit();
});

e.on('stats', (str) => {
  cli.responders.stats();
});

e.on('list users', (str) => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', (str) => {
  cli.responders.listLogs();
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

// Responders object
cli.responders = {};

// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Help / Man
// We don't need the 'string', because we don't need more information
cli.responders.help = () => {
  const commands = {
    exit: 'Kill the CLI (and the application)',
    man: 'This help page',
    help: 'Alias to "man" command',
    stats: 'Get statistics on the op system',
    'list users': 'Show all registered users',
    'more user info --(userId)': 'Show details of a specific user',
    'list checks --up --down':
      'Show a list of all the active checks in the system. The flags are optional',
    'more check info --(checkId)': 'Show details of a specified check',
    'list logs': 'Show a list of all the compressed log files available',
    'more log info --(fileName)': 'Show details of a specified log file',
  };

  // Show a header for the help page that is as wide as the screen
  cli.horizonatalLine();
  cli.centered('CLI MANUAL');
  cli.horizonatalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation, in white and yellow respectively
  for (const item in commands) {
    // this line is superfluous
    if (commands.hasOwnProperty(item)) {
      const value = commands[item];
      let line = `\x1b[33m${item}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();
  cli.horizonatalLine();
};

// Create vertical space
cli.verticalSpace = (lines) => {
  lines = typeof lines == 'number' && lines > 0 ? lines : 1;
  for (i = 0; i < lines; i++) {
    console.log('');
  }
};

// Horizontal line
cli.horizonatalLine = () => {
  // Get the available screen size
  const width = process.stdout.columns;

  let line = '';
  for (i = 0; i < width; i++) {
    line += '-';
  }
  console.log(line);
};

// Centered text on the screen
cli.centered = (str) => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : '';

  // Get the available screen size
  const width = process.stdout.columns;

  // Calculate the left padding there should be
  const leftPadding = Math.floor((width - str.length) / 2);

  // Put in left padded space before the string itself
  let line = '';
  for (i = 0; i < leftPadding; i++) {
    line += ' ';
  }
  line += str;
  console.log(line);
};

// Stats
cli.responders.stats = () => {
  // Compile an object of stats
  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
    'Peak Malloced memory': v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round(
      (v8.getHeapStatistics().used_heap_size /
        v8.getHeapStatistics().total_heap_size) *
        100
    ),
    'Available Heap Allocated (%)': (
      (v8.getHeapStatistics().total_heap_size /
        v8.getHeapStatistics().heap_size_limit) *
      100
    ).toFixed(3),
    Uptime: os.uptime() + ' Seconds',
  };

  // Create a header for the stats
  cli.horizonatalLine();
  cli.centered('SYSTEM STATISTICS');
  cli.horizonatalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation, in white and yellow respectively
  for (const item in stats) {
    // this line is superfluous
    if (stats.hasOwnProperty(item)) {
      const value = stats[item];
      let line = `\x1b[33m${item}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();
  cli.horizonatalLine();
};

// List users
cli.responders.listUsers = () => {
  _data.list('users', (err, data) => {
    if (!err && data && data.length > 0) {
      cli.verticalSpace();
      data.forEach((item, idx) => {
        /* console.log('user', idx + 1, 'phone: ', item); */
        _data.read('users', item, (err, data) => {
          if (!err && data) {
            const line = `Name: ${data.firstName} ${data.lastName} Phone: ${
              data.phone
            } Checks: ${data.checks?.length > 0 ? data.checks?.length : 0}`;
            console.log(line);
          }
        });
      });
    }
  });
};

// More user info
cli.responders.moreUserInfo = (str) => {
  const array = str.split('--');
  const id =
    typeof array[1] == 'string' && array[1].trim().length > 0
      ? array[1].trim()
      : false;

  if (id) {
    // Look up the user
    _data.read('users', id, (err, data) => {
      if (!err && data) {
        // Remove the hashed password
        delete data.hashedPassword;

        // Print the JSON with text highlighted
        cli.verticalSpace();
        console.dir(data, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

/* // List Checks
cli.responders.listChecks = (str) => {
  const array = str.split('--');
  const flag =
    typeof array[1] == 'string' && array[1].trim().length > 0
      ? array[1].trim()
      : false;

  // Look up the checks
  _data.list('checks', (err, data) => {
    if (!err && data && data.length > 0) {
      data.forEach((item, idx) => {
        _data.read('checks', item, (err, data) => {
          if (data.state == flag) {
            cli.verticalSpace();
            console.log(item);
          }
          if (!flag) {
            cli.verticalSpace();
            console.log(item);
          }
        });
      });
    }
  });
}; */

// List Checks
cli.responders.listChecks = (str) => {
  _data.list('checks', (err, data) => {
    if (!err && data && data.length > 0) {
      cli.verticalSpace();
      data.forEach((item) => {
        _data.read('checks', item, (err, data) => {
          const lowerCaseString = str.toLowerCase();

          // Get the state and default to down
          let state = typeof data.state == 'string' ? data.state : 'down';
          // Get the state and default to unkown
          let stateOrUnkown =
            typeof data.state == 'string' ? data.state : 'unkown';
          // If the user has specified the state, or not, include the check accordingly
          if (
            lowerCaseString.indexOf('--' + state) > -1 ||
            (lowerCaseString.indexOf('--down') == -1 &&
              lowerCaseString.indexOf('--up') == -1)
          ) {
            const line = `ID: ${data.id} ${data.method.toUpperCase()} ${
              data.protocol
            }://${data.url} ${stateOrUnkown}`;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More check info
cli.responders.moreCheckInfo = (str) => {
  // Get the id from the string
  const array = str.split('--');
  const id =
    typeof array[1] == 'string' && array[1].trim().length > 0
      ? array[1].trim()
      : false;

  if (id) {
    // Look up the check
    _data.read('checks', id, (err, data) => {
      if (!err && data) {
        // Print the JSON with text highlighted
        cli.verticalSpace();
        console.dir(data, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List logs
cli.responders.listLogs = () => {
  const ls = childProcess.spawn('ls', ['./.logs/']);
  ls.stdout.on('data', (data) => {
    // Explode into separate lines
    const dataStr = data.toString();
    const logFileNames = dataStr.split('\n');
    cli.verticalSpace();
    logFileNames.forEach((item) => {
      if (
        typeof item == 'string' &&
        item.length > 0 &&
        item.indexOf('-') > -1
      ) {
        console.log(item.trim().split('.')[0]);
        cli.verticalSpace();
      }
    });
  });
};

// More logs info
cli.responders.moreLogInfo = (str) => {
  // Get the log file name from the string
  const array = str.split('--');
  const fileName =
    typeof array[1] == 'string' && array[1].trim().length > 0
      ? array[1].trim()
      : false;

  if (fileName) {
    cli.verticalSpace();
    // Look up the check
    _logs.decompress(fileName, (err, data) => {
      if (!err && data) {
        // Split into lines
        const arr = data.split('\n');
        arr.forEach((item) => {
          const logObject = helpers.parseJsonToObject(item);
          if (logObject && stringify(logObject) !== '{}') {
            console.dir(logObject, { colors: true });
            cli.verticalSpace();
          }
        });
      }
    });
  }
};

// Input processor
cli.processInput = (str) => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : false;

  // Only process the input if the user actually wrote something, otherwise ignore
  if (str) {
    // Codify the unique strings that indentify the unique questions allowed to be asked
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info',
    ];

    // Go through the possible input and emit an event when a match is found
    let matchFound = false;
    let counter = 0;
    uniqueInputs.some((item) => {
      if (str.toLowerCase().indexOf(item) > -1) {
        matchFound = true;

        // Emit an event matching the unique input, and include the full string given by the user
        e.emit(item, str);
      }
    });

    // If no match is found, tell the user to try again
    if (!matchFound) {
      console.log('Try again');
    }
  }
};

// Init script
cli.init = () => {
  // Send the start message to the console, in dark blue
  console.log('\x1b[34m%s\x1b[0m', `The CLI is running`);

  // Start the interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>:',
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on('line', (str) => {
    // Send to the input processor
    cli.processInput(str);

    // Re-initialize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the CLI, kill the associated process
  _interface.on('close', () => {
    process.exit(0);
  });
};

// Export module
module.exports = cli;
