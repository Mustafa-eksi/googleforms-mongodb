import * as path from 'path';
//const google = require('@googleapis/forms');
import * as google from '@googleapis/forms';
import { MongoClient } from "mongodb"

const authClient = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const forms = google.forms({
  version: 'v1',
  auth: authClient,
});
async function runSample():Promise<string> {
  const newForm = {
    info: {
      title: 'Kişisel bilgilerinizi çalmama yardımcı olun!'
    },
    
  };
  const res = await forms.forms.create({
    requestBody: newForm,
  });
  if(!res.data.formId) {
    throw new Error("Formid null veya undefined geldi");
  }
  return res.data.formId;
}

async function finishform(id:string) {
  let res = await forms.forms.batchUpdate({
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
        },
        {
          createItem:{
            item:{
              title:"Bir sayı seç:",
              questionItem: {
                question: {
                  required:true,
                  choiceQuestion: {
                    type:'RADIO',
                    options: [{value:"1"}, {value:"2"}, {value:"3"}, {value:"4"}, {value:"5"}]
                  }
                }
              }
            },
            location:{
              index:2
            }
          }
        },
        {
          createItem:{
            item:{
              title:"Hangilerini seversin?",
              questionItem: {
                question: {
                  required:true,
                  choiceQuestion: {
                    type:'CHECKBOX',
                    options: [{value:"Kahve"}, {value:"Çay"}, {value:"Ayran"}]
                  }
                }
              }
            },
            location:{
              index:3
            }
          }
        },
        {
          createItem:{
            item:{
              title:"En sevdiğin renk:",
              questionItem: {
                question: {
                  required:true,
                  choiceQuestion: {
                    type:'DROP_DOWN',
                    options: [{value:"Kırmızı"}, {value:"Mavi"}, {value:"Yeşil"}, {value:"Diğer"}]
                  }
                }
              }
            },
            location:{
              index:4
            }
          }
        }
      ],
    }
  });
  console.log(res.data.form?.responderUri)
}


let dbcl = new MongoClient("mongodb://127.0.0.1:27017");
let formkayit = dbcl.db("formkayit");
let formlar = formkayit.collection('form');

async function logRes(id:string) {
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
  let id:string = await runSample();
  await finishform(id);
  await setInterval(async ()=>{
    await logRes(id);
  }, 4000)
}


if (module === require.main) {
  main().catch(console.error)
}
module.exports = runSample;
