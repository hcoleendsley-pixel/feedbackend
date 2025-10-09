const { Pool } = require('pg');
const xlsx = require('xlsx');
const path = require('path');

// This is the main function that runs the entire process
async function setupAndImport() {
    // Check for the database URL and filename from the command line arguments
    if (process.argv.length < 4) {
        console.error('Usage: node import-to-cloud.js <DATABASE_URL> <EXCEL_FILE_PATH>');
        process.exit(1);
    }
    const connectionString = process.argv[2];
    const excelFilePath = process.argv[3];

    console.log('Connecting to the cloud database...');
    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Step 1: Create tables if they don't already exist
        console.log('Creating tables (if they dont exist)...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS officers (
                id SERIAL PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                job_title TEXT NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                officer_id INTEGER REFERENCES officers(id),
                rating INTEGER NOT NULL,
                feedback_text TEXT,
                is_anonymous BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);
        console.log('✅ Tables are ready.');

        // Step 2: Read the local Excel file
        console.log(`Reading data from "${excelFilePath}"...`);
        const workbook = xlsx.readFile(path.resolve(excelFilePath));
        const sheetName = workbook.SheetNames[0];
        const officers = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`Found ${officers.length} officers in the Excel file.`);

        // Step 3: Clear any old data from the officers table
        console.log('Clearing old officer data from the cloud database...');
        await pool.query('DELETE FROM officers;');

        // Step 4: Insert all the new officer data
        console.log('Importing new officer data...');
        let importedCount = 0;
        for (const officer of officers) {
            // Use keys that match your Excel file's column headers
            const firstName = officer['First Name'];
            const lastName = officer['Last Name'];
            const jobTitle = officer['Job Title'];

            if (firstName && lastName) {
                await pool.query(
                    'INSERT INTO officers (first_name, last_name, job_title) VALUES ($1, $2, $3)',
                    [firstName, lastName, jobTitle]
                );
                importedCount++;
            }
        }
        console.log(`✅ Successfully imported ${importedCount} officers into the cloud database!`);

    } catch (err) {
        console.error('\n❌ An error occurred:');
        console.error(err);
    } finally {
        // Step 5: Close the connection to the database
        await pool.end();
        console.log('Disconnected from the database.');
    }
}

// Run the function
setupAndImport();
