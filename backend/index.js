"use strict";
const express = require('express');
const helmet = require('helmet');
const app = express();
const fs = require('fs');
const ContractLoader = require('./modules/contractLoader.js');
var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(helmet());
var cors = require('cors')
app.use(cors())
let contracts;
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://0.0.0.0:8545'));

let transactions = {}

const DESKTOPMINERACCOUNT = 3 //index in geth

let accounts
web3.eth.getAccounts().then((_accounts)=>{
  accounts=_accounts
  console.log("ACCOUNTS",accounts)
})

const NETWORK = parseInt(fs.readFileSync("../deploy.network").toString().trim())
if(!NETWORK){
  console.log("No deploy.network found exiting...")
  process.exit()
}
console.log("NETWORK:",NETWORK)

console.log("LOADING CONTRACTS")
contracts = ContractLoader(["Proxy"],web3);

app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/")
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({hello:"world"}));

});

app.get('/miner', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/miner")
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({address:accounts[DESKTOPMINERACCOUNT]}));
});

app.get('/txs/:account', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/txs/"+req.params.account)
  let thisTxsKey = req.params.account.toLowerCase()
  console.log("Getting Transactions for ",thisTxsKey)
  let allTxs = transactions[thisTxsKey]
  let recentTxns = []
  for(let a in allTxs){
    let age = Date.now() - allTxs[a].time
    if(age<120000){
      recentTxns.push(allTxs[a])
    }
  }
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(allTxs));
});

app.post('/tx', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/tx",req.body)
  console.log("RECOVER:",req.body.message,req.body.sig)
  let account = web3.eth.accounts.recover(req.body.message,req.body.sig)
  console.log("RECOVERED:",account)
  if(account.toLowerCase()==req.body.parts[1].toLowerCase()){
    console.log("Correct sig... relay transaction to contract... might want more filtering here, but just blindly do it for now")

    //console.log(contracts.BouncerProxy)
    let contract = new web3.eth.Contract(contracts.Proxy._jsonInterface,req.body.parts[0])
    console.log("Forwarding tx to ",contract._address," with local account ",accounts[3])

    let txparams = {
      from: accounts[DESKTOPMINERACCOUNT],
      gas: req.body.gas,
      gasPrice:Math.round(4 * 1000000000)
    }
    //first get the hash to see if there is already a tx in motion
    let hash = await contract.methods.getHash(req.body.parts[1],req.body.parts[2],req.body.parts[3],req.body.parts[4]).call()
    console.log("HASH:",hash)


    //const result = await clevis("contract","forward","BouncerProxy",accountIndexSender,sig,accounts[accountIndexSigner],localContractAddress("Example"),"0",data,rewardAddress,reqardAmount)
    console.log("TX",req.body.sig,req.body.parts[1],req.body.parts[2],req.body.parts[3],req.body.parts[4])
    console.log("PARAMS",txparams)
    contract.methods.forward(req.body.sig,req.body.parts[1],req.body.parts[2],req.body.parts[3],req.body.parts[4]).send(
      txparams ,(error, transactionHash)=>{
        console.log("TX CALLBACK",error,transactionHash)
        res.set('Content-Type', 'application/json');
        res.end(JSON.stringify({transactionHash:transactionHash}));
        let fromAddress = req.body.parts[1].toLowerCase()
        if(!transactions[fromAddress]){
          transactions[fromAddress] = []
        }
        if(transactions[fromAddress].indexOf(transactions)<0){
          transactions[fromAddress].push({hash:transactionHash,time:Date.now(),metatx:true,miner:accounts[DESKTOPMINERACCOUNT]})
        }
      }
    )
    .on('error',(err,receiptMaybe)=>{
      console.log("TX ERROR",err,receiptMaybe)
    })
    .on('transactionHash',(transactionHash)=>{
      console.log("TX HASH",transactionHash)
    })
    .on('receipt',(receipt)=>{
      console.log("TX RECEIPT",receipt)
    })
    /*.on('confirmation', (confirmations,receipt)=>{
      console.log("TX CONFIRM",confirmations,receipt)
    })*/
    .then((receipt)=>{
      console.log("TX THEN",receipt)
    })

  }
});

app.listen(9999);
console.log(`http listening on 9999`);
