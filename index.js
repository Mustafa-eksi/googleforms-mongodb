'use strict';

const path = require('path');
const google = require('@googleapis/forms');
const { MongoClient } = require("mongodb");
const authClient = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const forms = google.forms({
  version: 'v1',
  auth: authClient,
});
async function runSample() {
  const newForm = {
    info: {
      title: 'Kişisel bilgilerinizi çalmama yardımcı olun!'
    },
    
  };
  const res = await forms.forms.create({
    requestBody: newForm,
  });
  console.log(res.data);
  return res.data.formId;
}

async function finishform(id) {
  console.log(await forms.forms.batchUpdate({
    formId:id,
    requestBody: {
      includeFormInResponse:true,
      requests:[
        {
          updateFormInfo: {
            info: {
              title: 'Kişisel bilgilerinizi çalmama yardımcı olun!',
              description:"Merhaba bunu görüyorsan çoktan uyuya kalmışım demektir.",
              documentTitle:"Zarttiri zort zort"
            },
            updateMask:"*"
          }
        },
        {
          createItem:{
            item:{
              title:"İsminiz soyisminiz:",
              questionItem: {
                question: {
                  required:true,
                  textQuestion: {
                      paragraph:false
                  }
                }
              }
            },
            location:{
              index:0
            }
          }
        },
        {
          createItem:{
            item:{
              title:"Doğduğunuz il:",
              questionItem: {
                question: {
                  required:true,
                  textQuestion: {
                      paragraph:false
                  }
                }
              }
            },
            location:{
              index:1
            }
          }
        }
      ],
    }
  }));
}


const dbcl = new MongoClient("mongodb://localhost:27017");
const formkayit = dbcl.db("formkayit");
const formlar = formkayit.collection('form');

async function logRes(id) {
  let c = await forms.forms.responses.list({formId:id});
  if(c.data.responses) {
    await c.data.responses.forEach(async (v)=>{
      let f = await formlar.findOne(v);
      if(!f){
        await formlar.insertOne(v);
      }
    })
  }
}

async function main() {
  let id = await runSample();
  await finishform(id);
  await setInterval(async ()=>{
    await logRes(id);
  }, 4000)
}


if (module === require.main) {
  main().catch(console.error)
}
module.exports = runSample;
