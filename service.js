"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = require("http");
var child_process_1 = require("child_process");
var contract_loc = '/root/protobet/protobet.tz';
var port = 7000;
var btoa = function (x) { return new Buffer(x).toString('base64'); };
var bet_map = {};
var alphanet = function (args, no_client) {
    if (no_client === void 0) { no_client = false; }
    if (!no_client)
        args.unshift('client');
    console.log('running alphanet ' + args);
    return new Promise(function (resolve) {
        var alphanet = child_process_1.spawn('alphanet', args, { stdio: [process.stdin, 'pipe', 'pipe'] });
        var data = '';
        alphanet.stdout.on('data', function (x) {
            data += x;
        });
        alphanet.stdout.on('err', function (x) {
            data += x;
        });
        alphanet.on('close', function (x) {
            resolve({ content: data, err: x });
        });
    });
};
alphanet('list known contracts'.split(' ')).then(function (x) {
    x.content.split('\r\n').forEach(function (line) {
        var line_arr = line.trim().split(': ');
        if (line_arr.length > 1)
            if (line_arr[0].indexOf('BET_') === 0) {
                alphanet(('get storage for ' + line_arr[0]).split(' ')).then(function (storage) {
                    if (!storage.err) {
                        bet_map[line_arr[0]] = {
                            storage: storage.content
                        };
                    }
                });
            }
    });
});
var server = http_1.createServer(function (req, response) {
    response.setHeader('Connection', 'Transfer-Encoding');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Transfer-Encoding', 'chunked');
    response.setHeader('Access-Control-Allow-Origin', '*');
    console.log("Request to " + req.url);
    var output = function (x) { return response.end(JSON.stringify(x)); };
    var router = {
        '/': function (params) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    output({ hellow: 'world' });
                    return [2 /*return*/];
                });
            });
        },
        '/gen': function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var key_name, gen_key_result, list_result, key_map;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key_name = btoa((new Date()).toISOString());
                            return [4 /*yield*/, alphanet(['gen', 'keys', key_name])];
                        case 1:
                            gen_key_result = _a.sent();
                            if (gen_key_result.err) {
                                output(gen_key_result);
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, alphanet(['list', 'known', 'contracts'])];
                        case 2:
                            list_result = _a.sent();
                            if (list_result.err) {
                                output(list_result);
                                return [2 /*return*/];
                            }
                            key_map = {};
                            list_result.content.split('\r\n').forEach(function (line) {
                                var line_arr = line.trim().split(': ');
                                if (line_arr.length > 1)
                                    key_map[line_arr[0]] = line_arr[1];
                            });
                            output(Object.assign(gen_key_result, {
                                key_name: key_name,
                                key: key_map[key_name]
                            }));
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/get_balance': function (key_name) {
            return __awaiter(this, void 0, void 0, function () {
                var balance;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, alphanet(("get balance for " + key_name).split(' '))];
                        case 1:
                            balance = _a.sent();
                            output(balance);
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/add_balance': function (key_name) {
            return __awaiter(this, void 0, void 0, function () {
                var acct_name, free_account, transfer, check_balance;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            acct_name = btoa((new Date()).toISOString());
                            return [4 /*yield*/, alphanet(("originate free account " + acct_name + " for " + key_name).split(' '))];
                        case 1:
                            free_account = _a.sent();
                            if (free_account.err) {
                                output(free_account);
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, alphanet(("transfer 99999 from " + acct_name + " to " + key_name).split(' '))];
                        case 2:
                            transfer = _a.sent();
                            if (transfer.err) {
                                output(transfer);
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, alphanet(("get balance for " + key_name).split(' '))];
                        case 3:
                            check_balance = _a.sent();
                            output(check_balance);
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/create_bet': function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var input, init_storage, bet_name, args, bet_contract;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = JSON.parse(decodeURIComponent(params));
                            if (!(input.choice instanceof Array))
                                input.choice = [input.choice];
                            init_storage = "(Right (Pair (Map ) (Pair (Map ) (Pair (Pair \"" + input.be.replace(/\.\d{3}/, '') + "\" \"" + input.ve.replace(/\.\d{3}/, '') + "\") \"" + input.title + "|" + input.choice.join('|') + "\"))))";
                            console.log(init_storage);
                            bet_name = 'BET_' + btoa(input.title);
                            args = ("originate contract " + bet_name + " for " + input.key_name + " transferring 2.01 from " + input.key_name + " running container:" + contract_loc + " -init").split(' ').concat(init_storage);
                            return [4 /*yield*/, alphanet(args)];
                        case 1:
                            bet_contract = _a.sent();
                            if (!bet_contract.err)
                                bet_map[bet_name] = { storage: init_storage };
                            output(Object.assign(bet_contract, { storage: init_storage }));
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/bet': function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var input, contract_arg, args, bet_result, storage_result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = JSON.parse(decodeURIComponent(params));
                            contract_arg = "(Left (Left (Pair \"" + input.key + "\" " + input.op_choice + ")))";
                            args = ("transfer " + input.op_amount + " from " + input.key_name + " to " + input.contract_name + " -arg").split(' ').concat(contract_arg);
                            return [4 /*yield*/, alphanet(args)];
                        case 1:
                            bet_result = _a.sent();
                            if (bet_result.err) {
                                output(bet_result);
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, alphanet(("get storage for " + input.contract_name).split(' '))];
                        case 2:
                            storage_result = _a.sent();
                            if (!storage_result.err)
                                bet_map[input.contract_name] = { storage: storage_result.content };
                            output(Object.assign(bet_result, { storage: storage_result }));
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/vote': function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var input, contract_arg, args, vote_result, storage_result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            input = JSON.parse(decodeURIComponent(params));
                            contract_arg = "(Left (Right (Pair " + input.op_choice + " \"" + input.key + "\")))";
                            args = ("transfer 0 from " + input.key_name + " to " + input.contract_name + " -arg").split(' ').concat(contract_arg);
                            return [4 /*yield*/, alphanet(args)];
                        case 1:
                            vote_result = _a.sent();
                            if (vote_result.err) {
                                output(vote_result);
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, alphanet(("get storage for " + input.contract_name).split(' '))];
                        case 2:
                            storage_result = _a.sent();
                            if (!storage_result.err)
                                bet_map[input.contract_name] = { storage: storage_result.content };
                            output(Object.assign(vote_result, { storage: storage_result }));
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/settle': function (contract_name) {
            return __awaiter(this, void 0, void 0, function () {
                var contract_arg, settlement, storage_result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            contract_arg = '(Right Unit)';
                            return [4 /*yield*/, alphanet(("transfer 0 from my_account to " + contract_name + " -arg").split(' ').concat(contract_arg))];
                        case 1:
                            settlement = _a.sent();
                            if (!!settlement.err) return [3 /*break*/, 3];
                            return [4 /*yield*/, alphanet(("get storage for " + contract_name).split(' '))];
                        case 2:
                            storage_result = _a.sent();
                            if (!storage_result.err)
                                bet_map[contract_name] = { storage: storage_result.content };
                            _a.label = 3;
                        case 3:
                            // const forget = await alphanet(`forget contract ${contract_name}`.split(' '))
                            // if (forget.err){
                            //   output(forget)
                            //   return
                            // }
                            output(settlement);
                            return [2 /*return*/];
                    }
                });
            });
        },
        '/bet_lst': function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    output(bet_map);
                    return [2 /*return*/];
                });
            });
        }
    };
    var _a = (req.url || '').split('?'), path = _a[0], params = _a[1];
    if (path in router) {
        router[path](params);
    }
    else {
        output({});
    }
});
server.listen(port);
console.log("Listening on port " + port);
