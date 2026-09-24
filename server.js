const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'50mb'}));

let ads = [];

app.get('/', (req,res)=> res.send('TRC Ads Server Live'));

app.get('/api/ads', (req,res)=>{
  const status = req.query.status;
  if(status) return res.json(ads.filter(a=>a.status===status));
  res.json(ads);
});

app.post('/api/ads', (req,res)=>{
  const ad = {id:Date.now().toString(), status:'pending', ...req.body, createdAt:new Date().toISOString()};
  ads.push(ad);
  res.json({success:true, ad});
});

app.post('/api/ads/:id/approve', (req,res)=>{
  const ad = ads.find(a=>a.id===req.params.id);
  if(ad){ ad.status='approved'; return res.json({success:true, ad});}
  res.status(404).json({error:'Not found'});
});

app.get('/api/health',(req,res)=>res.json({ok:true, count:ads.length}));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log('Running on '+PORT));
