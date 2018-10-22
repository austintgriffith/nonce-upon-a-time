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
        console.log("EVENT!!!",anEvent)
        lines.push(
          <div key={e}>
            <Address
              {...this.state}
              config={{
                showBalance: false,
                showAddress: false
              }}
              address={anEvent.sender}
            />
            <span style={{paddingLeft:10}}>
              {anEvent.line}
            </span>
          </div>
        )
      }

      if(contracts){
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
                console.log("EVENT DATA:",eventData)
                this.setState({events:allEvents})
              }}
            />
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
