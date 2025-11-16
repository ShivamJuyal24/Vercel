const express = require('express');
const httpProxy = require('http-proxy');
const app = express();
const PORT =8000;
const basepath = 'https://vercel-object-storage.s3.eu-north-1.amazonaws.com/__outputs';

const proxy = httpProxy.createProxyServer({});
app.use((req,res)=>{
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];
    const resolveto = `${basepath}/${subdomain}`
    return proxy.web(req,  res, { target: resolveto, changeOrigin:true }, (e) => {
        console.error('Proxy error:', e);
        res.status(502).send('Bad Gateway');
    });
})

proxy.on('proxyReq',(proxyReq, req, res) => {
    const url = req.url;
    if(url ==='/'){
        proxyReq.path += 'index.html';
    }
    return proxyReq;
});

app.listen(PORT,()=> console.log(`Server is running on port ${PORT}`));