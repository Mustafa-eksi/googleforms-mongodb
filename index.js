"use strict";
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
function runSample() {
    return __awaiter(this, void 0, void 0, function* () {
        const newForm = {
            info: {
                title: 'Kişisel bilgilerinizi çalmama yardımcı olun!'
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
function finishform(id) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let res = yield forms.forms.batchUpdate({
            formId: id,
            requestBody: {
                includeFormInResponse: true,
                requests: [
                    {
                        updateFormInfo: {
                            info: {
                                title: 'Kişisel bilgilerinizi çalmama yardımcı olun!',
                                description: "Merhaba bunu görüyorsan çoktan uyuya kalmışım demektir.",
                                documentTitle: "Zarttiri zort zort"
                            },
                            updateMask: "*"
                        }
                    },
                    {
                        createItem: {
                            item: {
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
                            location: {
                                index: 0
                            }
                        }
                    },
                    {
                        createItem: {
                            item: {
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
                            location: {
                                index: 1
                            }
                        }
                    },
                    {
                        createItem: {
                            item: {
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
                            location: {
                                index: 2
                            }
                        }
                    },
                    {
                        createItem: {
                            item: {
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
                            location: {
                                index: 3
                            }
                        }
                    },
                    {
                        createItem: {
                            item: {
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
                            },
                            location: {
                                index: 4
                            }
                        }
                    }
                ],
            }
        });
        console.log((_a = res.data.form) === null || _a === void 0 ? void 0 : _a.responderUri);
    });
}
let dbcl = new mongodb_1.MongoClient("mongodb://127.0.0.1:27017");
let formkayit = dbcl.db("formkayit");
let formlar = formkayit.collection('form');
function logRes(id) {
    return __awaiter(this, void 0, void 0, function* () {
        let c = yield forms.forms.responses.list({ formId: id });
        if (c.data.responses) {
            yield c.data.responses.forEach((v) => __awaiter(this, void 0, void 0, function* () {
                let f = yield formlar.findOne(v);
                if (!f) {
                    yield formlar.insertOne(v);
                }
            }));
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let id = yield runSample();
        yield finishform(id);
        yield setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield logRes(id);
        }), 4000);
    });
}
if (module === require.main) {
    main().catch(console.error);
}
module.exports = runSample;
