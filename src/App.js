import React, { Component } from 'react';
import './App.css';
import AWS_CONFIG from './env'
import AWS from 'aws-sdk';
import WidgetDefinition from './components/WidgetDefinition'
import * as _ from 'lodash';

import Widget from './components/widgets';

AWS.config.update(AWS_CONFIG); 

class App extends Component {
  constructor(props){
    super(props);
    this.state = { 
    cw: new AWS.CloudWatch({apiVersion: '2010-08-01'}),
    dashBoardData: {}
    }
  }

  setTempCredentials = (tempCredentials) => {
    this.setState({
      ...this.state,
      cw: new AWS.CloudWatch({credentials:tempCredentials})
    })
  }


  componentWillMount(){
    console.log("Hello")
    fetch("http://169.254.169.254/latest/meta-data/iam/info")
      .then(response => {
        console.log(response)
        response.json()})
      .then(data => {
        console.log(data)
        this.setState({ InstanceProfileArn: data.InstanceProfileArn, isLoading: false })
        let roleArn = `${data.InstanceProfileArn}`;
        console.log("Assuming role: "+roleArn);

        let sts = new AWS.STS() ;
        sts.assumeRole({RoleArn: roleArn, RoleSessionName: 'SnapshotGraphs'}, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {           // successful response
                console.log(JSON.stringify(data))
                let tempCredentials = new AWS.Credentials(data.Credentials.AccessKeyId, 
                                                          data.Credentials.SecretAccessKey, 
                                                          data.Credentials.SessionToken)
                this.setTempCredentials(tempCredentials);
            }
        });

      });
    // let cloudWatch = tempCredentials ? new AWS.CloudWatch({credentials:tempCredentials}) : new AWS.CloudWatch();
    // let roleArn = `arn:aws:iam::${accountId}:role/${role}`;
    // console.log("Assuming role: "+roleArn);

    // let sts = new AWS.STS() ;
    // sts.assumeRole({RoleArn: roleArn, RoleSessionName: 'SnapshotGraphs'}, function(err, data) {
    //     if (err) console.log(err, err.stack); // an error occurred
    //     else {           // successful response
    //         console.log(JSON.stringify(data))
    //         let tempCredentials = new AWS.Credentials(data.Credentials.AccessKeyId, 
    //                                                   data.Credentials.SecretAccessKey, 
    //                                                   data.Credentials.SessionToken)
    //         this.setTempCredentials(tempCredentials);
    //     }
    // });
  }



  getWidget = (widgetDefinition, callback, tempCredentials) => {
    
    let cloudWatch = tempCredentials ? new AWS.CloudWatch({credentials:tempCredentials}) : new AWS.CloudWatch();

     cloudWatch.getMetricWidgetImage(widgetDefinition, function (err, data) {
     if (err) console.log(err, err.stack); // an error occurred
        else {
            console.log(data.MetricWidgetImage);           // successful response
            var response = {
                statusCode: 200,
                headers: {
                'Content-Type' : 'image/png',
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods' : 'POST, GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers' : 'x-api-key'
                },
                body: new Buffer(data.MetricWidgetImage).toString('base64')
    };
            callback(err, response);
        }
    });

}

  // componentWillMount(){
  //   let that = this;
  //   this.state.cw.getDashboard({"DashboardName": "gg"}, function(err, data) {
  //     if (err) {
  //       console.log("Error", err);
  //     } else {
  //       console.log(data.DashboardBody)
  //       let dataJson = JSON.parse(data.DashboardBody)
  //       that.setState({
  //         dashBoardData: dataJson.widgets
  //     });
  //     }
  //   } );
  // }



  createWidgets = () => {
    let widgets = []
    console.log(WidgetDefinition)
    console.log(this.state.dashBoardData.length)
    for (let i = 0; i < this.state.dashBoardData.length; i++) {
      let localWidgetDefinition = _.cloneDeep(WidgetDefinition);
      localWidgetDefinition.MetricWidget["metrics"] = this.state.dashBoardData[i].properties.metrics
      if(this.state.dashBoardData[i].properties.title){
        localWidgetDefinition.MetricWidget["title"] = this.state.dashBoardData[i].properties.title
      }
      // console.log(localWidgetDefinition)
      widgets.push(

          <Widget key={i} cw={this.state.cw} params={localWidgetDefinition}></Widget>
      )
    }
    return widgets;
  }
  
  render() {
    return (
      <>
      {this.state.dashBoardData && this.createWidgets()}
      </>
    );
  }
}

export default App;
