#!/usr/bin/env python

import time,traceback,socket,json,sys,logging
from flask import Flask, make_response,render_template,request
from flask_cors import CORS,cross_origin
from threading import Lock,Thread

app = Flask(__name__)
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

@app.route('/subgraph', methods=['GET', 'POST'])
@cross_origin()
def getGraph():
    nodelist = str(request.query_string).split(",")
    outputdata=[]
    outputdatanodelist = []
    for ele in nodelist:
        if ele in nodeData.keys():
            outputdata.append(nodeData[ele])
            outputdatanodelist.append(ele)
            for subele in nodeData[ele]["links"]["successor"]+nodeData[ele]["links"]["chord"]+nodeData[ele]["links"]["on_demand"]:
                if subele not in nodelist and subele not in outputdatanodelist:
                    temp = nodeData[subele]
                    temp["links"]["successor"] = []
                    temp["links"]["chord"]     = []
                    temp["links"]["on_demand"] = []
                    outputdata.append(temp)
                    outputdatanodelist.append(subele)
    responseMsg = {"response": outputdata}
    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    return resp


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
        		value["startime"] = starttimedetails[key]
        	nodeDetailsList.append(value)
        print(nodeDetailsList)
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
