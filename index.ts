// Mail adresine göre başka formların cevaplarından kişisel veriler çekilecek ve kullanıcının tekrar tekrar girmesine gerek olmayacak.

import * as path from 'path';
//const google = require('@googleapis/forms');
import * as google from '@googleapis/forms';
import { Collection, Db, MongoClient } from "mongodb"

const authClient = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const forms = google.forms({
  version: 'v1',
  auth: authClient,
});

async function FormOlustur(baslik: string): Promise<string> {
  const newForm = {
    info: {
      title: baslik
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

async function finishform(id:string, title:string, description: string, items: Array<google.forms_v1.Schema$Item>): Promise<google.forms_v1.Schema$Form> {
  let son: google.forms_v1.Schema$Request[] = [];
  son.push({
    updateFormInfo: {
      info: {
        title:title,
        description:description
      },
      updateMask:"*"
    }
  });
  items.forEach((e,i)=>{
    let temp: google.forms_v1.Schema$CreateItemRequest = {};
    temp.item = e;
    temp.location = {index:i};
    son.push({createItem: temp});
  })
  let res = await forms.forms.batchUpdate({
    formId:id,
    requestBody: {
      includeFormInResponse:true,
      requests: son,
    }
  });
  if(res.data.form)
    return res.data.form;
  else
    throw new Error("Form güncellenemedi")
}


let dbcl = new MongoClient("mongodb://127.0.0.1:27017");
let formkayit = dbcl.db("formkayit");

function JSONArrayToArray(answers: JSON): google.forms_v1.Schema$Answer[]{
  let keys = Object.keys(answers);
  let cevaplar: google.forms_v1.Schema$Answer[] = [];
  keys.forEach((e,i)=>{
    cevaplar.push((answers as any)[e]);
  })
  return cevaplar;
}

async function openOrCreateCollection(cname: string): Promise<Collection<Document>> {
  let cliste = await formkayit.listCollections().toArray();
  let bulunan = cliste.findIndex(v => v.name === cname);
  if(bulunan === -1) {
    return await formkayit.createCollection(cname);
  }else {
    return await formkayit.collection(cname);
  }
}

async function logRes(id:string) {
  let formlar:any = await openOrCreateCollection("form-"+id);
  let c = await forms.forms.responses.list({formId:id});
  if(c.data.responses) {
    await c.data.responses.forEach(async (v)=>{
      let f = await formlar.findOne(v);
      if(!f){
        let asıl: any = v;
        asıl.answers = JSONArrayToArray(asıl.answers);
        await formlar.insertOne(asıl);
      }
    })
  }
}

async function OncekindenBul(öncekiID: string, ortakSoruID: string, ortakAlanDeğeri: string, bulunacakAlanlarınIDleri: string[]): Promise<string[]> {
  let ÖncekiForm = await openOrCreateCollection("form-"+öncekiID)
  let buldum = await ÖncekiForm.findOne({
    answers: { $elemMatch: {
      questionId:ortakSoruID,
      textAnswers: {answers:[ortakAlanDeğeri]}
    }}
  });
  if(!buldum) {
    throw new Error("Buldum null geldi??")
  }else {
    let döndürülecekler: string[] = [];
    bulunacakAlanlarınIDleri.forEach((e)=>{
      if(buldum)
        döndürülecekler.push(buldum.answers.find((a:any) => a.questionId === e).textAnswers.answers[0])
    })
    return döndürülecekler;
  }
}

async function ÖncekindenBularakYaz(öncekiID: string, ortakSoruID: string, ortakAlanDeğeri: string, bulunacakAlanlarınIDleri: string[], yazılacağınID: string) {
  let formlar = await openOrCreateCollection("form-"+yazılacağınID)
  let c = await forms.forms.responses.list({formId:yazılacağınID});
  if(c.data.responses) {
    await c.data.responses.forEach(async (v)=>{
      let f = await formlar.findOne(v);
      if(!f){
        let asıl: any = v;
        asıl.answers = JSONArrayToArray(asıl.answers);
        let bulunanlar = await OncekindenBul(öncekiID, ortakSoruID, ortakAlanDeğeri, bulunacakAlanlarınIDleri);
        asıl.answers.forEach((e:any, i:number) => {
          let ind = bulunacakAlanlarınIDleri.findIndex(e.questionId);
          if(ind !== -1) {
            asıl.answers[i].textAnswers.answers[0] = bulunanlar[ind];
          }
        });
        await formlar.insertOne(asıl);
      }
    })
  }
}

async function main() {
  let id:string = await FormOlustur("Bu bir formdur");
  let itemler = [
    {
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
    {
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
    {
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
    {
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
    {
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
    }
  ]
  let birinciform = await finishform(id, "Bu bir formdur", "Bu bir açıklamadır", itemler);
  console.log("responderuri: "+ birinciform.responderUri);
  console.log("id: "+id);
  if(birinciform.items)
    console.log(birinciform.items[0])
  let başkaBirForm = [
    {
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
    {
      title:"Doğduğunuz il:",
      questionItem: {
        question: {
          required:false,
          textQuestion: {
              paragraph:false
          }
        }
      }
    },
    {
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
    {
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
    {
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
    }
  ];
  //let id2 = await FormOlustur("");
  //let uri2 = await finishform(id2, "Bu geçenkine bağlantılı bir form", "abc", başkaBirForm);
  await setInterval(async ()=>{
    await logRes(id);
  }, 4000)
}


if (module === require.main) {
  main().catch(console.error)
}
module.exports = FormOlustur;
