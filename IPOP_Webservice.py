#!/usr/bin/env python

import time,json,sys,logging
from flask import Flask, make_response,render_template,request, flash, redirect,url_for
from flask_cors import CORS,cross_origin
from threading import Lock,Thread

py_ver = sys.version_info[0]
app = Flask(__name__)
app.secret_key = 'IPOP UI'
CORS(app)

#Initializing Global variables
global nodeData,isLocked,lock
nodeData = {}
isLocked = False
lock = Lock()
stopnodelist = []

timeout = 15
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

starttimedetails = {}

# Receives data from IPOP Controllers
@app.route('/insertdata',methods=['GET', 'POST'])
@cross_origin()
def listener():
    try:
        lock.acquire()
        isLocked = True
        msg = request.json
        uid = msg["uid"]
        if uid not in nodeData.keys():
            starttimedetails.update({uid:msg["uptime"]})
        nodeData[uid] = msg
        nodeData[uid]["lastupdatetime"] = int(time.time())
        lock.release()
    except:
        lock.release()
    isLocked = False
    return "200"

#Displays the IPOP Homepage
@app.route('/IPOP')
@cross_origin()
def homepage():
    resp =  render_template('ipop_mainpage.html')
    return resp

#Displays page for Sub-Graph
@app.route('/subgraphtemplate')
@cross_origin()
def getGraphTemplate():
    resp =  render_template('ipop_subgraphdetails.html')
    return resp

#Displays page for Node details via URL
@app.route('/subgraphdetailstemplate')
@cross_origin()
def getGraphDetailsTemplate():
    resp =  render_template('ipop_nodedetails.html')
    return resp

# Sets node adjacency list
def setNodeData(nodeName,nodelist,runningnodelist):
    temp={}
    # Checks whether the node exits in the dictionary
    if nodeName in nodeData.keys():
        temp = dict(nodeData[nodeName])
        if nodeData[nodeName]["state"] !="stopped":
            temp["links"]["successor"] = list(set(temp["links"]["successor"])&set(nodelist)&set(runningnodelist))
            temp["links"]["chord"]     = list(set(temp["links"]["chord"])&set(nodelist)&set(runningnodelist))
            temp["links"]["on_demand"] = list(set(temp["links"]["on_demand"])&set(nodelist)&set(runningnodelist))
        else:
            #Node not in running state set successor,chord and ondemand to empty list
            temp["links"]["successor"] = []
            temp["links"]["chord"]     = []
            temp["links"]["on_demand"] = []
        temp["starttime"] = starttimedetails[nodeName]
    return temp

# Gets list of all running and stopped nodes
def getNodeStatus():
    stoppedNodes,runningNodes = [],[]
    for key,value in nodeData.items():
        if int(time.time())- value["lastupdatetime"] > timeout:
            value["state"] == "stopped"
            stoppedNodes.append(str(key+" - "+value["node_name"]))
        else:
            runningNodes.append(key)
            nodedetail = str(key+" - "+value["node_name"])
            if nodedetail in stopnodelist:
                stopnodelist.remove(nodedetail)
    return stoppedNodes,runningNodes

# Gets the node details for Sub-Graph functionality
def getNodeDetails(nodelist):
    outputdata=[]
    outputdatanodelist = []
    stoppednode,runningnode = getNodeStatus()

    #Iterates across the input node list from UI
    for node in nodelist:
        outputdata.append(setNodeData(node,runningnode,nodeData.keys()))
        outputdatanodelist.append(node)
        #gets all the adjacent running nodes
        nodeadjelelist = list(set(nodeData[node]["links"]["successor"]+nodeData[node]["links"]["chord"]+nodeData[node]["links"]\
            ["on_demand"])&set(runningnode))
        #Iterating across all running nodes
        for adjele in nodeadjelelist:
            adjeledata = setNodeData(adjele,nodelist,nodeData.keys())
            # check if the node detail already in the response JSON
            if len(adjeledata)!=0 and outputdatanodelist.count(adjele)==0:
                outputdata.append(adjeledata)
    return outputdata

# Sub-Graph Webservice functionality
@app.route('/subgraph', methods=['GET', 'POST'])
@cross_origin()
def getGraph():
    nodelist = str(request.query_string).split(",")
    try:
        lock.acquire()
        outputdata = getNodeDetails(nodelist)
        lock.release()
    except Exception as err:
        lock.release()
        logging.error("Exception in Sub graph node details:"+str(err))
    responseMsg = {"response": outputdata}

    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    return resp

# Sub-Graph webservice functionality for a particular UID
@app.route('/subgraphdetails', methods=['GET', 'POST'])
@cross_origin()
def getURIGraph():
    nodelist = str(request.query_string).split(",")
    try:
        lock.acquire()
        outputdata = getNodeDetails(nodelist)
        lock.release()
    except Exception as err:
        lock.release()
        logging.error("Exception in Sub graph node details:"+str(err))
    responseMsg = {"response": outputdata}
    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    flash(json.dumps(outputdata))
    return redirect(url_for('getGraphDetailsTemplate'))

# Main Visualizer webservice
@app.route('/nodedata', methods=['GET', 'POST'])
@cross_origin()
def nodedata():
    # Wait till lock is released
    while isLocked==True:
        pass
    nodeDetailsList = []                                                    # Stores node details that are in running state
    try:
        lock.acquire()
        stoppedNodes,runningnodes = getNodeStatus()
        #Iterate across all the nodes in the dictionary
        for key,value in sorted(nodeData.items(),key= lambda x : x[0]):
            eledata = setNodeData(key,nodeData.keys(),nodeData.keys())
            if len(eledata) !=0:
                nodeDetailsList.append(eledata)
        responseMsg = {
            "response": {
                            "runningnodes": nodeDetailsList,
                            "stoppednodes": stopnodelist
                        }
            }
        lock.release()
        resp = make_response(json.dumps(responseMsg))
        resp.headers['Content-Type'] = "application/json"
        return resp
    except Exception as err:
        lock.release()
        logging.info("Exception occured in nodedata function.")
        logging.error("Exception::"+str(err))

def main(ipv4):
    app.run(host=ipv4,port=8080,threaded=True)                             # Start the IPOP webserver

def cleanNodeDetails():
    while True:
        time.sleep(45)
        try:
            lock.acquire()
            stoppedNodes, runningnodes = getNodeStatus()
            for nodeele in stoppedNodes:
                nodeuid,nodename = nodeele.split(" - ")
                if nodeuid in nodeData.keys():
                    del nodeData[nodeuid]
                    stopnodelist.append(nodeele)
            lock.release()
        except Exception as err:
            lock.release()
            logging.error("Exception while cleaning nodedata"+str(err.message))

# Creating module level thread to clean the Node details dictionary
clean_node_details_thread = Thread(target=cleanNodeDetails)
clean_node_details_thread.start()

if __name__ == "__main__":
    if len(sys.argv)>1:
        ipv4 = sys.argv[1]
    else:
        ipv4 = '0.0.0.0'
    try:
        main(ipv4)
    except Exception as err:
        log.error("Exception::"+str(err.message))
