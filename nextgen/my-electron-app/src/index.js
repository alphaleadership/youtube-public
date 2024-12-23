const { ipcRenderer } = require('electron');
const { app, BrowserWindow, ipcMain,dialog } = require('electron');
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { exec } = require('child_process');


const web = express();
const http = require('http').Server(web);
const io = require('socket.io')(http);

const d = require('./db.js');
const base = './file';
const db = new d(base);
db.readDatabase()
db.save()
db.database.map((item)=>{item.yid})
web.set('view engine', 'ejs');




function build() {
  try {
    get('https://cdn.socket.io/4.4.1/socket.io.js', './src/client-dist/socket.io.js')
    .then(() => console.log('downloaded file no issues...'))
    .catch((e) => console.error('error while downloading', e));
  get('https://cdn.socket.io/4.4.1/socket.io.js.map', './src/client-dist/socket.io.js.map')
    .then(() => console.log('downloaded file no issues...'))
    .catch((e) => console.error('error while downloading', e));
  get('https://github.com/yt-dlp/yt-dlp/releases/download/2023.02.17/yt-dlp.exe', 'ytdlp.exe')
    .then(() => console.log('downloaded file no issues...'))
    .catch((e) => console.error('error while downloading', e));
  } catch (error) {
    
  }

  try {
    
    fs.mkdirSync("./src/client-dist")
    fs.mkdirSync('./src/views');
    fs.mkdirSync('./src/log');
    fs.mkdirSync(base);
  } catch (error) {
    console.log(error);
  }
}

try {
  fs.writeFileSync(
    './views/index.ejs',
    `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Streaming With Node</title>
     <script src="renderer.js"></script>
    <style>
      body {
        max-width: 100%;
        height: 100vh;
        background-color: rgb(247, 243, 243);
        display: flex;
        margin: auto;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
  <form id="commandForm">
    <label for="commandInput">Enter Parameter:</label>
    <input type="text" id="commandInput" name="commandInput" required>
    <button type="submit">Execute</button>
  </form>
    <ul>
      <% results.forEach(function(result){ %>
          <a href="/watch?id=<%= result.yid %>">
            <img src="https://img.youtube.com/vi/<%=result.yid %>/hqdefault.jpg" alt="Thumbnail for YouTube video">
          </a>
      <% }); %>
    </ul>
  </body>
</html>

 

`
  );
  fs.writeFileSync(
    './views/view.ejs',
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Streaming With Node</title>
    <style>
      body {
        max-width: 100%;
        height: 100vh;
        background-color: rgb(14, 14, 14);
        display: flex;
        margin: auto;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <video id="videoPlayer" width="70%" controls autoplay muted="false">
      <source src="/video/?id=<%= code %>" type="video/mp4" />
    </video>
    <a href="http://127.0.0.1:8000>retour a la page principale </a>
  </body>
</html>`
  );
} catch (error) {
  console.log(error);
}

web.listen(8000, function () {
  console.log('Listening on port 8000!');
});

//const download = require('./ytb');
console.log('boot now');

function get(url, dest) {
  return new Promise((resolve, reject) => {
    // Check file does not exist yet before hitting network
    fs.access(dest, fs.constants.F_OK, (err) => {
      if (err === null) reject('File already exists');

      const request = https.get(url, (response) => {
        if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest, { flags: 'wx' });
          file.on('finish', () => resolve());
          file.on('error', (err) => {
            file.close();
            if (err.code === 'EEXIST') reject('File already exists');
            else fs.unlink(dest, () => reject(err.message)); // Delete temp file
          });
          response.pipe(file);
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // Recursively follow redirects, only a 200 will resolve.
          get(response.headers.location, dest).then(() => resolve());
        } else {
          reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
        }
      });
    });
  });
}
web.get("/", function (req, res) {
  db.readDatabase()
db.save()


console.log(db.database)
  res.render('index', {
    results: db.database
    
})
})
web.get("/watch", function (req, res) {
  console.log(req.query)
  res.render('view', {
    code: req.query.id,
    videos:db.database
    
});
});
web.get("/renderer.js",function (req, res) {
  res.statusCode=200
  res.send(fs.readFileSync("./src/renderer.js"))
})
web.get("/video", function (req, res) {
  // Ensure there is a range given for the video
  const range = req.headers.range;
  if (!range) {
    res.status(400).send("Requires Range header");
  }
  console.log(db.getFile( req.query.id))
  const videoPath =base+"/"+ db.getFile( req.query.id).fileName
  console.log(videoPath)
  console.log(req.query.id)
  const videoSize = fs.statSync(videoPath).size;

  const CHUNK_SIZE = 10 ** 6; // 1MB
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  // Create headers
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers);

  // create video read stream for this particular chunk
  const videoStream = fs.createReadStream(videoPath, { start, end });

  // Stream the video chunk to the client
  videoStream.pipe(res);
});
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    
  }
);
ipcMain.on('execute-command', (e, arg) => {
  const  parameter  = arg;
  console.log(arg)
  var msg =""
 
    const command = `ytdlp -vU --remux mp4 ${parameter} --write-playlist-metafiles --parse-metadata "playlist_title:.+ - (?P<folder_name>Videos|Shorts|Live)$" -o "./file/%(channel|)s-%(folder_name|)s-%(title)s [%(id)s].%(ext)s" 
`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        msg=`exec error: ${error}`;
        console.log(msg)
        return ;
      }
     msg=`stdout: ${stdout}`;
      msg+=`stderr: ${stderr}`;
      console.log(msg)
    });
    return msg
  
});
  mainWindow.loadURL("http://localhost:8000");

  mainWindow.on('closed', () => {
   delete mainWindow
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

