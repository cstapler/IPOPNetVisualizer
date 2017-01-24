#!/usr/bin/env python

import time,traceback,socket,json,sys,logging
from flask import Flask, make_response,render_template,request, flash, redirect,url_for
from flask_cors import CORS,cross_origin
from threading import Lock,Thread

app = Flask(__name__)
app.secret_key = 'IPOP UI'
CORS(app)
global nodeData
nodeData = {}
global isLocked
isLocked = False
global lock
lock = Lock()

timeout = 15
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
starttimedetails = {}
previoustimedetails = {}

@app.route('/insertdata',methods=['GET', 'POST'])
@cross_origin()
def listener():
	lock.acquire()
	isLocked = True
	msg = request.json
	uid = msg["uid"]
	if uid not in nodeData.keys():
		starttimedetails.update({uid:msg["uptime"]})	
	nodeData[uid] = msg
	lock.release()
	isLocked = False
	return "200"

@app.route('/IPOP')
@cross_origin()
def homepage():
        ##logging.getLogger('flask_cors').level = logging.DEBUG
    resp =  render_template('D3U.html')
    return resp

@app.route('/subgraphtemplate')
@cross_origin()
def getGraphTemplate():
        ##logging.getLogger('flask_cors').level = logging.DEBUG
    resp =  render_template('ipopsubgraphui.html')
    return resp

@app.route('/subgraphdetailstemplate')
@cross_origin()
def getGraphDetailsTemplate():
    resp =  render_template('ipopsubgraph_ui.html')
    return resp

def getNodeDetails(nodelist):
    outputdata=[]
    outputdatanodelist = []
    temp={}
    for ele in nodeData.keys():
        elelinklist = nodeData[ele]["links"]["successor"]+nodeData[ele]["links"]["chord"]+nodeData[ele]["links"]["on_demand"]
        if ele in nodelist:
            nodeData[ele]["starttime"] = starttimedetails[ele]
            outputdata.append(nodeData[ele])
            outputdatanodelist.append(ele)

            for subele in elelinklist:
                if subele not in nodelist and subele not in outputdatanodelist:
                    temp = nodeData[subele]
                    temp["links"]["successor"] = list(set(temp["links"]["successor"])&set(nodelist))
                    temp["links"]["chord"]     = list(set(temp["links"]["chord"])&set(nodelist))
                    temp["links"]["on_demand"] = list(set(temp["links"]["on_demand"])&set(nodelist))
                    temp["starttime"] = starttimedetails[subele]
                    outputdata.append(temp)
                    outputdatanodelist.append(subele)
        else:
            if len(list(set(nodelist)&set(elelinklist)))!=0 :
                temp = nodeData[ele]
                temp["links"]["successor"] = list(set(temp["links"]["successor"])&set(nodelist))
                temp["links"]["chord"]     = list(set(temp["links"]["chord"])&set(nodelist))
                temp["links"]["on_demand"] = list(set(temp["links"]["on_demand"])&set(nodelist))
                temp["starttime"] = starttimedetails[ele]
                outputdata.append(temp)
                outputdatanodelist.append(ele)
    return outputdata



@app.route('/subgraph', methods=['GET', 'POST'])
@cross_origin()
def getGraph():
    nodelist = str(request.query_string).split(",")
    outputdata = getNodeDetails(nodelist)
    responseMsg = {"response": outputdata}
    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    return resp

@app.route('/subgraphdetails', methods=['GET', 'POST'])
@cross_origin()
def getURIGraph():
    nodelist = str(request.query_string).split(",")
    #print(nodelist)
    outputdata = getNodeDetails(nodelist)
    responseMsg = {"response": outputdata}
    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    flash(json.dumps(outputdata))
    return redirect(url_for('getGraphDetailsTemplate'))


@app.route('/nodedata', methods=['GET', 'POST'])
@cross_origin()
def nodedata():
        while isLocked==True:
            pass
        lock.acquire()
        nodeDetailsList = []
        for key,value in sorted(nodeData.items(),key= lambda x : x[0]):
        	if int(time.time())-value["uptime"] > timeout:
        		value["state"] = "stopped"
        	else:
        		value["starttime"] = starttimedetails[key]
        		nodeDetailsList.append(value)
        responseMsg = {"response": nodeDetailsList}
        lock.release()
        resp = make_response(json.dumps(responseMsg))
        resp.headers['Content-Type'] = "application/json"
        return resp



def main(ipv4):
    app.run(host=ipv4,port=8080,threaded=True)


if __name__ == "__main__":

    ipv4 = sys.argv[1]
    main(ipv4)
    logging.basicConfig(filename="./server.log",level=logging.INFO,format='%(asctime)s %(message)s')
