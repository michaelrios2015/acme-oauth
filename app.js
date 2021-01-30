const express = require('express');
const app = express();

app.use(express.json());
app.engine('html', require('ejs').renderFile);

const { models: { User }} = require('./db');
const path = require('path');

app.get('/', (req, res)=> res.render(path.join(__dirname, 'index.html'), { GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID }));

app.get('/api/auth', async(req, res, next)=> {
    
    try {
        // console.log('------------/api/auth---------------------');
        // console.log(req.headers.authorization);
    res.send(await User.byToken(req.headers.authorization));
  }
  catch(ex){
    // console.log(req.headers.authorization);
    next(ex);
  }
});

app.get('/github/callback', async(req, res, next)=> {
    // console.log('------------/github/callback---------------------');
    // console.log(req.query.code);
    try {
    const token = await User.authenticate(req.query.code);
    // const jwToken = jwt.sign({ id: user.id }, process.env.JWT);
    
    console.log(token);
    res.send(`
      <html>
       <body>
       <script>
        window.localStorage.setItem('token', '${token}');
         window.document.location = '/';
       </script>
        </body>
      </html>
    `);
  }
  catch(ex){
    next(ex);
  }
});

app.use((err, req, res, next)=> {
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;