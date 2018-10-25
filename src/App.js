import React, { Component } from 'react';
import './App.css';
import { Dapparatus, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address, Button } from "dapparatus"
import Web3 from 'web3';


const METATX = {
  endpoint:"http://0.0.0.0:9999/",
  contract:require("./contracts/Proxy.address.js"),
  //accountGenerator: "//account.metatx.io",
}
const WEB3_PROVIDER = 'http://0.0.0.0:8545'


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: false,
      account: false,
      gwei: 4,
    }
  }
  handleInput(e){
    let update = {}
    update[e.target.name] = e.target.value
    this.setState(update)
  }
  render() {
    let {web3,account,contracts,tx,gwei,block,avgBlockTime,etherscan} = this.state
    let connectedDisplay = []
    let contractsDisplay = []
    if(web3){
      connectedDisplay.push(
       <Gas
         key="Gas"
         onUpdate={(state)=>{
           console.log("Gas price update:",state)
           this.setState(state,()=>{
             console.log("GWEI set:",this.state)
           })
         }}
       />
      )

      connectedDisplay.push(
        <ContractLoader
         key="ContractLoader"
         config={{DEBUG:true}}
         web3={web3}
         require={path => {return require(`${__dirname}/${path}`)}}
         onReady={(contracts,customLoader)=>{
            console.log("contracts loaded",contracts)
            this.setState({contracts:contracts},async ()=>{
                console.log("====!! Loading dyamic contract "+METATX.contract)
                let metaContract = customLoader("Proxy",METATX.contract)//new this.state.web3.eth.Contract(require("./contracts/BouncerProxy.abi.js"),this.state.address)
                console.log("====!! metaContract:",metaContract)
                this.setState({metaContract:metaContract})
            })
         }}
        />
      )

      connectedDisplay.push(
        <Transactions
          key="Transactions"
          config={{DEBUG:false}}
          account={account}
          gwei={gwei}
          web3={web3}
          block={block}
          avgBlockTime={avgBlockTime}
          etherscan={etherscan}
          metaAccount={this.state.metaAccount}
          metaContract={this.state.metaContract}
          metatx={METATX}
          balance={this.state.balance} /* so we can metatx if balance 0 */
          metaTxParts = {(proxyAddress,fromAddress,toAddress,value,txData,nonce)=>{
            return [
              proxyAddress,
              fromAddress,
              toAddress,
              web3.utils.toTwosComplement(value),
              txData,
              web3.utils.toTwosComplement(nonce),
            ]
          }}
          onReady={(state)=>{
            console.log("Transactions component is ready:",state)
            this.setState(state)
          }}
          onReceipt={(transaction,receipt)=>{
            // this is one way to get the deployed contract address, but instead I'll switch
            //  to a more straight forward callback system above
            console.log("Transaction Receipt",transaction,receipt)
          }}
        />
      )

      let lines = []

      for(let e in this.state.events){
        let anEvent =  this.state.events[e]

        let metaAddress = ""
        console.log("comparing",anEvent,this.state.metaContract)
        if(anEvent.sender.toLowerCase() == this.state.metaContract._address.toLowerCase()){
          console.log("SENDER IS METAACCOUNT, SEARCH FOR ACCOUNT IN FORWARDS!")
          for(let f in this.state.MetaForwards){
            if(this.state.MetaForwards[f].destination==contracts.Stories._address){
              console.log("FOUND ONE GOING TO THIS CONTRACT:",this.state.MetaForwards[f].data,this.state.MetaForwards[f].signer)
              if(this.state.MetaForwards[f].data.indexOf("0xebaac771")>=0){
                console.log("this is the 'write' function...")
                let parts = this.state.MetaForwards[f].data.substring(10)
                let writeString = this.state.web3.eth.abi.decodeParameter('string',parts)
                console.log("writeString",writeString)
                if(writeString == anEvent.line){
                  console.log("MATCH!")
                  metaAddress=this.state.MetaForwards[f].signer
                }
              }
            }
          }
        }
        let accountToPay = anEvent.sender
        let extraBlockie = ""
        if(metaAddress){
          accountToPay = metaAddress
          extraBlockie = (
            //metaAddress
            <div style={{position:"absolute",left:0,top:0}}>
              <Blockie config={{size:1.9}} address={metaAddress}/>
            </div>
          )
        }

        lines.push(
          <div key={e}style={{position:"relative"}}>
            <Blockie config={{size:2.5}} address={anEvent.sender}/>
            {extraBlockie}
            <span style={{paddingLeft:10}}>
              {anEvent.line}
            </span>
          </div>
        )
      }

      if(contracts){
        let metaEventLoader = ""
        if(this.state.metaContract){
          metaEventLoader = (
            <Events
              config={{hide:true}}
                contract={this.state.metaContract}
                eventName={"Forwarded"}
                block={this.state.block}
                onUpdate={(eventData,allEvents)=>{
                  console.log("Forwarded",eventData)
                  this.setState({MetaForwards:allEvents.reverse()})
                }}
            />
          )
        }

        contractsDisplay.push(
          <div key="UI" style={{padding:30}}>
            <h1>
              Nonce Upon A Time...
            </h1>
            {lines}
            <input
                style={{verticalAlign:"middle",width:800,margin:6,marginTop:20,maxHeight:20,padding:5,border:'2px solid #ccc',borderRadius:5}}
                type="text" name="writeText" value={this.state.writeText} onChange={this.handleInput.bind(this)}
            />
            <Button size="2" onClick={()=>{
                this.setState({doingTransaction:true})
                tx(contracts.Stories.write(this.state.writeText),(receipt)=>{
                  console.log("TX CALLED BACK",receipt)
                  this.setState({doingTransaction:false,writeText:""})
                })
              }}>
              Write
            </Button>
            <Events
              config={{hide:true}}
              contract={contracts.Stories}
              eventName={"Write"}
              block={block}
              onUpdate={(eventData,allEvents)=>{
                //console.log("EVENT DATA:",eventData)
                this.setState({events:allEvents})
              }}
            />
            {metaEventLoader}
          </div>
        )
      }

    }
    return (
      <div className="App">
        <Dapparatus
          config={{
            DEBUG:false,
            requiredNetwork:['Unknown','Rinkeby'],
          ///  metatxAccountGenerator: false
          }}
          metatx={METATX}
          fallbackWeb3Provider={new Web3.providers.HttpProvider(WEB3_PROVIDER)}
          onUpdate={(state)=>{
           console.log("metamask state update:",state)
           if(state.web3Provider) {
             state.web3 = new Web3(state.web3Provider)
             this.setState(state)
           }
          }}
        />
        {connectedDisplay}
        {contractsDisplay}
      </div>
    );
  }
}

export default App;
