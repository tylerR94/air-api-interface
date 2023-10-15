// The application expects a file named "contacts.csv" to contain the contacts to call.
// The application also expects that you will have the columns "name" and "phone" for all contacts, at the very least.
// All other columns will be incuded in the metadata object.

const fs = require('fs');

const csv = fs.readFileSync('contacts.csv', 'utf8');
const readlineSync = require('readline-sync');

// Parse the contents of the CSV file 
const rows = csv.split('\n');
const headers = rows[0].split(',');
const arrayOfObjects = rows.slice(1).map(row => {
  const values = row.split(',');
  const obj = {};
  obj.metadata = {};
  headers.forEach((header, index) => {
    if (header !== 'name' && header !== 'phone') {
      obj.metadata[header] = values[index];
    } else {
      obj[header] = values[index];
    }
  });
  if (!obj.name || !obj.phone) {
    console.log('Name and Phone are required fields, please amend your CSV to include these values for all contacts. Exiting...');
    return process.kill(process.pid, 'SIGINT');
  }

  return obj;
});

const makeCalls = (bearerToken, promptId, peopleToCall) => {
  // Injecting prompt id
  peopleToCall.forEach(obj => {
    obj.promptId = promptId;
  });


  let counter = 0;

  const url = 'https://chat.air.ai/api/v1/calls';
  peopleToCall.forEach(async (obj) => {
      const options = {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + bearerToken,
          },
          body: JSON.stringify(obj),
      };

      fetch(url, options)
          .then(response => response.json())
          .then(data => {
              counter++;
              console.log(`${obj.name} [${obj.phone}] called successfully!`)
          })
          .catch(error => console.log(error));
  });
};

const promptInput = async () => {
    console.log(
        '===========================================Main Menu==========================================\n',
    );

    // Get the bearer token necessary to make requests against our API
    const bearerToken = readlineSync.question('Please enter your Bearer Token: ');
    if (!bearerToken) { console.log('Bearer token required! Exiting.'); return process.kill(process.pid, 'SIGINT'); }

    // Get the prompt id, aka agent id, to initiate a call with
    const promptId = readlineSync.question('Please enter your prompt id: ');
    if (!promptId) { console.log('Prompt id required! Exiting.'); return process.kill(process.pid, 'SIGINT'); }

    // Present the user with the contacts in the CSV file and ask them to select a starting and ending row. We don't assume you want ALL contacts called at once
    console.log(`There are ${rows.length - 1 /* exclude header */} contacts in this CSV.`)
    
    let startingRow = readlineSync.question('Please enter the starting row (starting with 1), OR leave blank and we will use all contacts: ');
    // don't allow 0 input, we'll subtract start and ending rows by 1 before calling
    while (startingRow === '0') {
        startingRow = readlineSync.question('The starting row must be GREATER than zero or be nothing at all, please try again: ');
    }
    let endingRow;

    if (!startingRow) {
        // default to 1 for starting row, if none provided
        startingRow = 1;
        // if no starting row is provided, then use all contacts
        endingRow = arrayOfObjects.length;
    } else {
        endingRow = readlineSync.question('Please enter the ending row (starting with 1), OR leave blank and we will use the last row: ');

        // don't allow ending row to be less than starting row
        while (endingRow && parseInt(endingRow) < parseInt(startingRow)) {
            endingRow = readlineSync.question('The ending row must be GREATER than OR EQUAL to the starting row, please try again: ');
        }

        if (!endingRow) {
            endingRow = arrayOfObjects.length;
        }
    }
    startingRow = parseInt(startingRow);
    endingRow = parseInt(endingRow);

    console.log(`Calling contacts ${startingRow} through ${endingRow}...`);
    
    // arrays start at 0 obviously, but the user provided input based on the assumption that contact rows start at 1, not 0
    // so we need to subtract 1 from the user's input to match up array indices properly
    startingRow--;
    endingRow--;
    
    const peopleToCall = arrayOfObjects.slice(startingRow, endingRow + 1);
    makeCalls(bearerToken, promptId, peopleToCall);
};

promptInput();