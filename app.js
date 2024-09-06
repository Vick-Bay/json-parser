const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set storage engine for multer
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize multer
const upload = multer({ storage });

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to serve static files
app.use(express.static('uploads'));

// Function to parse the JSON data and extract the expected infolog output
const parseInfologData = (data) => {
    let result = '';
    const infologData = data.InfologData || [];
    let currentTaskName = '';
    let currentTaskId = '';

    infologData.forEach((entry, index) => {
        // Handle task names and IDs
        if (typeof entry === 'string') {
            currentTaskName = entry;
            currentTaskId = infologData[index + 1]; // ID is right after the task name
            result += `Infolog for task ${currentTaskName} (${currentTaskId})\n`;
        }

        // Handle logs inside tasks
        if (Array.isArray(entry)) {
            entry.forEach((log) => {
                if (typeof log[1] === 'string') {
                    result += `${log[1].split("\t").join("\n")}\n`;
                }
            });
        }
    });

    result += 'End of task log';
    return result;
};

// Route to render the upload form
app.get('/', (req, res) => {
    res.render('index', { parsedData: null, error: null });
});

// Route to handle file upload and JSON parsing
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const filePath = path.join(__dirname, 'uploads', req.file.filename);

    // Read the uploaded file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading file');
        }

        try {
            // Parse JSON data from the file
            const jsonData = JSON.parse(data);

            // Extract the infolog data
            const parsedData = parseInfologData(jsonData);

            // Render the result in the template
            res.render('index', { parsedData: parsedData, error: null });
        } catch (error) {
            // Log the error and return a detailed message
            console.error("Error parsing JSON:", error);
            res.render('index', { parsedData: null, error: 'Invalid JSON format in the file. Please ensure the file contains valid JSON.' });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
