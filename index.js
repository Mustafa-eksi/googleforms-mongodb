"use strict";
// Mail adresine göre başka formların cevaplarından kişisel veriler çekilecek ve kullanıcının tekrar tekrar girmesine gerek olmayacak.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
//const google = require('@googleapis/forms');
const google = __importStar(require("@googleapis/forms"));
const mongodb_1 = require("mongodb");
const authClient = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive'],
});
const forms = google.forms({
    version: 'v1',
    auth: authClient,
});
function FormOlustur(baslik) {
    return __awaiter(this, void 0, void 0, function* () {
        const newForm = {
            info: {
                title: baslik
            },
        };
        const res = yield forms.forms.create({
            requestBody: newForm,
        });
        if (!res.data.formId) {
            throw new Error("Formid null veya undefined geldi");
        }
        return res.data.formId;
    });
}
function finishform(id, title, description, items) {
    return __awaiter(this, void 0, void 0, function* () {
        let son = [];
        son.push({
            updateFormInfo: {
                info: {
                    title: title,
                    description: description
                },
                updateMask: "*"
            }
        });
        items.forEach((e, i) => {
            let temp = {};
            temp.item = e;
            temp.location = { index: i };
            son.push({ createItem: temp });
        });
        let res = yield forms.forms.batchUpdate({
            formId: id,
            requestBody: {
                includeFormInResponse: true,
                requests: son,
            }
        });
        if (res.data.form)
            return res.data.form;
        else
            throw new Error("Form güncellenemedi");
    });
}
let dbcl = new mongodb_1.MongoClient("mongodb://127.0.0.1:27017");
let formkayit = dbcl.db("formkayit");
function JSONArrayToArray(answers) {
    let keys = Object.keys(answers);
    let cevaplar = [];
    keys.forEach((e, i) => {
        cevaplar.push(answers[e]);
    });
    return cevaplar;
}
function logRes(id) {
    return __awaiter(this, void 0, void 0, function* () {
        let formlar = formkayit.createCollection("form-" + id);
        let c = yield forms.forms.responses.list({ formId: id });
        if (c.data.responses) {
            yield c.data.responses.forEach((v) => __awaiter(this, void 0, void 0, function* () {
                let f = yield formlar.findOne(v);
                if (!f) {
                    let asıl = v;
                    asıl.answers = JSONArrayToArray(asıl.answers);
                    yield formlar.insertOne(asıl);
                }
            }));
        }
    });
}
function OncekindenBul(öncekiID, ortakSoruID, ortakAlanDeğeri, bulunacakAlanlarınIDleri) {
    return __awaiter(this, void 0, void 0, function* () {
        let ÖncekiForm = yield formkayit.createCollection("form-" + öncekiID);
        let buldum = yield ÖncekiForm.findOne({
            answers: { $elemMatch: {
                    questionId: ortakSoruID,
                    textAnswers: { answers: [ortakAlanDeğeri] }
                } }
        });
        if (!buldum) {
            throw new Error("Buldum null geldi??");
        }
        else {
            let döndürülecekler = [];
            bulunacakAlanlarınIDleri.forEach((e) => {
                if (buldum)
                    döndürülecekler.push(buldum.answers.find((a) => a.questionId === e).textAnswers.answers[0]);
            });
            return döndürülecekler;
        }
    });
}
function ÖncekindenBularakYaz(öncekiID, ortakSoruID, ortakAlanDeğeri, bulunacakAlanlarınIDleri, yazılacağınID) {
    return __awaiter(this, void 0, void 0, function* () {
        let formlar = yield formkayit.createCollection("form-" + yazılacağınID);
        let c = yield forms.forms.responses.list({ formId: yazılacağınID });
        if (c.data.responses) {
            yield c.data.responses.forEach((v) => __awaiter(this, void 0, void 0, function* () {
                let f = yield formlar.findOne(v);
                if (!f) {
                    let asıl = v;
                    asıl.answers = JSONArrayToArray(asıl.answers);
                    let bulunanlar = yield OncekindenBul(öncekiID, ortakSoruID, ortakAlanDeğeri, bulunacakAlanlarınIDleri);
                    asıl.answers.forEach((e, i) => {
                        let ind = bulunacakAlanlarınIDleri.findIndex(e.questionId);
                        if (ind !== -1) {
                            asıl.answers[i].textAnswers.answers[0] = bulunanlar[ind];
                        }
                    });
                    yield formlar.insertOne(asıl);
                }
            }));
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let id = yield FormOlustur("Bu bir formdur");
        let itemler = [
            {
                title: "İsminiz soyisminiz:",
                questionItem: {
                    question: {
                        required: true,
                        textQuestion: {
                            paragraph: false
                        }
                    }
                }
            },
            {
                title: "Doğduğunuz il:",
                questionItem: {
                    question: {
                        required: true,
                        textQuestion: {
                            paragraph: false
                        }
                    }
                }
            },
            {
                title: "Bir sayı seç:",
                questionItem: {
                    question: {
                        required: true,
                        choiceQuestion: {
                            type: 'RADIO',
                            options: [{ value: "1" }, { value: "2" }, { value: "3" }, { value: "4" }, { value: "5" }]
                        }
                    }
                }
            },
            {
                title: "Hangilerini seversin?",
                questionItem: {
                    question: {
                        required: true,
                        choiceQuestion: {
                            type: 'CHECKBOX',
                            options: [{ value: "Kahve" }, { value: "Çay" }, { value: "Ayran" }]
                        }
                    }
                }
            },
            {
                title: "En sevdiğin renk:",
                questionItem: {
                    question: {
                        required: true,
                        choiceQuestion: {
                            type: 'DROP_DOWN',
                            options: [{ value: "Kırmızı" }, { value: "Mavi" }, { value: "Yeşil" }, { value: "Diğer" }]
                        }
                    }
                }
            }
        ];
        let birinciform = yield finishform(id, "Bu bir formdur", "Bu bir açıklamadır", itemler);
        console.log("responderuri: " + birinciform.responderUri);
        console.log("id: " + id);
        if (birinciform.items)
            console.log(birinciform.items[0]);
        let başkaBirForm = [
            {
                title: "İsminiz soyisminiz:",
                questionItem: {
                    question: {
                        required: true,
                        textQuestion: {
                            paragraph: false
                        }
                    }
                }
            },
            {
                title: "Doğduğunuz il:",
                questionItem: {
                    question: {
                        required: false,
                        textQuestion: {
                            paragraph: false
                        }
                    }
                }
            },
            {
                title: "Bir sayı seç:",
                questionItem: {
                    question: {
                        required: true,
                        choiceQuestion: {
                            type: 'RADIO',
                            options: [{ value: "1" }, { value: "2" }, { value: "3" }, { value: "4" }, { value: "5" }]
                        }
                    }
                }
            },
            {
                title: "Hangilerini seversin?",
                questionItem: {
                    question: {
                        required: true,
                        choiceQuestion: {
                            type: 'CHECKBOX',
                            options: [{ value: "Kahve" }, { value: "Çay" }, { value: "Ayran" }]
                        }
                    }
                }
            },
            {
                title: "En sevdiğin renk:",
                questionItem: {
                    question: {
                        required: true,
                        choiceQuestion: {
                            type: 'DROP_DOWN',
                            options: [{ value: "Kırmızı" }, { value: "Mavi" }, { value: "Yeşil" }, { value: "Diğer" }]
                        }
                    }
                }
            }
        ];
        //let id2 = await FormOlustur("");
        //let uri2 = await finishform(id2, "Bu geçenkine bağlantılı bir form", "abc", başkaBirForm);
        yield setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield logRes(id);
        }), 4000);
    });
}
if (module === require.main) {
    main().catch(console.error);
}
module.exports = FormOlustur;
