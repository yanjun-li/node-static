const http = require('http');
const fs = require('fs');
const path = require('path');
const mimeType = require('./mime')
const url = require('url');
const querystring = require('querystring');
const zlib = require('zlib');

console.log(process.cwd());
// const compressReg = /css$|json$|js$/i;
const compressReg = /css$|json$|js$|html$/i;

function showDir(dirPath, res){
    fs.readdir(dirPath,(err, files) => {
        let html = '<ul>';
        if(err){
            console.log(err);
        }
        files.filter(file => {
            return !file.match(/^\./);
        }).forEach(element => {
            console.log();
            html += `<li><a href="/upload/${element}">${element}</a></li>`
        });
        html += '</ul>';
        // 注意要指定编码
        // res.setHeader('content-type','text/plain')
        res.setHeader('content-type','text/html;charset=UTF-8');
        res.end(html);
    })
}
const app = http.createServer((req, res) => {
    if(req.url === '/'){
        showDir(path.resolve(__dirname,'www'), res);
    } else if (req.url === '/favicon.ico') {
        const body = 'favicon.ico not found!';

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Foo', 'bar');

        res.writeHead(404, 'this is statusMsg',{
            'Content-Length': Buffer.byteLength(body),
            'Content-Type': 'text/plain'
        })
        // 注意写了Content-Length时，要在res中没有把body也发出去，浏览器会提示 ERR_CONTENT_LENGTH_MISMATCH， postman不会
        res.end(body);
    } else {
        // 获取真实path
        let filePath = req.url.replace('/upload/','');
        filePath = decodeURIComponent(filePath);
        let serverFilePath = path.resolve(__dirname,'www',filePath);
        
        // 使用stream读文件
        fs.stat(serverFilePath, (err, stat) => {
            if(err){
                console.log(err);
                if(err.code === 'ENOENT'){
                    let body = 'file not found';
                    res.writeHead(404, {
                        'Content-Length': Buffer.byteLength(body)
                    })
                    res.end(body);
                }
            }
            if(stat.isDirectory()){
                showDir(path.resolve(__dirname, 'www', filePath), res);
            }
            if(stat.isFile()){
                let raw = fs.createReadStream(serverFilePath);
                // 设置content-type
                let extName = path.extname(filePath).slice(1);
                let mime = mimeType[extName];
                let contentType = mime || 'text/plain';
                res.setHeader('Content-Type', contentType);
                // 判断开启gzip
                // 开启gzip
                let acceptEncoding = req.headers['accept-encoding'] || '';
                let compressMethod;
                let needCompress = compressReg.test(extName);
                if(needCompress && acceptEncoding.match(/\bgzip\b/)){
                    compressMethod = zlib.createGzip;
                    res.writeHead(200, 'ok', {
                        'Content-Encoding': 'gzip'
                    })
                } else if(needCompress && acceptEncoding.match(/\bdeflate\b/)){
                    res.writeHead(200, 'ok', {
                        'Content-Encoding': 'deflate'
                    })
                    compressMethod = zlib.createDeflate;
                }
                if(compressMethod){
                    raw.pipe(compressMethod()).pipe(res);
                } else {
                    raw.pipe(res);
                }
            }
        })
    }
});
const handler = (req, res) => {
    
}
app.listen(4000);