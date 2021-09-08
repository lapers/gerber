const path = require('path');
const express = require('express');
const multer = require('multer');
const getPort = require('get-port');
const open = require('open');
const fs = require('fs');
const gerber = require('./src/gerber.js');

(async function() {
    const app = express();
    const port = await getPort({ port: 8009 });
    const host = `http://127.0.0.1:${port}`;

    // #### GET requests ####
    
    var path_root = path.join(__dirname, 'www/');
    app.get('/', (req, res) => {
        res.sendFile(path.join(path_root, 'index.html'));
    });
    
    var path_js = path.join(path_root, 'js/');
    app.get('/js/:file', (req, res) => {
        var file = req.params.file;
        
        res.contentType('application/javascript');
        res.sendFile(path.join(path_js, file));
    });
    
    var path_css = path.join(path_root, 'css/');
    app.get('/css/:file', (req, res) => {
        var file = req.params.file;
        
        res.contentType('application/stylesheet');
        res.sendFile(path.join(path_css, file));
    });
    
    // #### POST requests ####
    
    app.post('/parse', async (req, res) => {
        parse(req, res, (gerberStructure) => {
            res.status(200).send(JSON.stringify(gerberStructure));
        })
    });
    
    app.post('/draw', async (req, res) => {
        parse(req, res, (gerberStructure) => {
            const image = require('./src/image.js');
        
            res.status(200).send(image.base64(gerberStructure));
        })
    });
    
    // #### SERVER ####

    console.log(`[INFO] Wait for server start...`);
    app.listen(port, async () => {
        console.log(`[INFO] Server stared at ${host}`);
        //await open(`${host}/`);
    });

})();

// #### request.file to json ####

const maxFileSize = 1 * 1024 * 1024; // 1 MB max
const upload = multer({ dest: '/tmp', limits: { fileSize: maxFileSize } }).single('data');
function parse(req, res, onSuccess) {
    upload (req, res, (err) => {
        if (err) {
            res.status(413).send(err.code);
            return;
        }
        
        let filepath = req.file.path;
        try {
            var data = fs.readFileSync(req.file.path, 'utf8');
            const gerberStructure = gerber.parseGerberString(data);
            
            console.log(`[INFO] ${filepath} objects parsed: ${gerberStructure['objects_count']}`);
            onSuccess(gerberStructure);
        } catch(err) {
            res.status(500).send(err.message);
            console.error(`[ERROR] file ${filepath} ${err.message}`);
        } finally {
            fs.unlink(filepath, (err) => {
                if (err) throw err;
                console.log(`[INFO] ${filepath} deleted`);
            });
        }
    });
}
