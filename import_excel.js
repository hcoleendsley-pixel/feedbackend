const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();

// Get the filename from the command line arguments
const filename = process.argv[2];

if (!filename) {
  console.error('Error: Please provide the Excel filename as an argument.');
  console.log('Example: node import_excel.js activecrpd.xlsx');
  process.exit(1); // Exit the script if no filename is given
}

// Connect to the database
const db = new sqlite3.Database('./officers.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

function importExcelData() {
  try {
    console.log(`Reading Excel file: ${filename}`);
    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in the Excel file.`);

    // Start a database transaction
    db.serialize(() => {
      // Clear old data from the officers table
      db.run(`DELETE FROM officers`, function(err) {
        if (err) {
          console.error('Error clearing old data:', err.message);
          return;
        }
        console.log('Successfully cleared old officer data.');
      });
      
      // Prepare the statement for inserting new data
      const stmt = db.prepare(`INSERT INTO officers (first_name, last_name, job_title) VALUES (?, ?, ?)`);

      // Loop through each row of the Excel data and insert it
      let importedCount = 0;
      data.forEach((row) => {
        const firstName = row['First Name'];
        const lastName = row['Last Name'];
        const jobTitle = row['Job Title'];
        
        if (firstName && lastName) {
            stmt.run(firstName, lastName, jobTitle);
            importedCount++;
        }
      });

      // Finalize the statement after the loop is done
      stmt.finalize((err) => {
        if (err) {
          console.error('Error finalizing statement:', err.message);
        } else {
          console.log(`\n✅ Successfully imported ${importedCount} officers into the database!`);
        }
        
        // IMPORTANT: Close the database connection here, after everything is done
        db.close((err) => {
          if (err) {
            console.error('Error closing the database:', err.message);
          } else {
            console.log('Closed the database connection.');
          }
        });
      });
    });

  } catch (error) {
    console.error('An error occurred during the import process:', error.message);
    db.close(); // Ensure DB is closed on error too
  }
}

// Run the import function
importExcelData();

