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
#log = logging.getLogger('werkzeug')
#log.setLevel(logging.ERROR)

starttimedetails = {}
networkdetails = {
    "1491195660000" : [{"interval":"1491195660000","uid": "062ccaf12f3639af08ac772594d50a2baccd8d02", "links": {"on_demand": [], "chord": [], "successor": ["0a2d302103cd45b978cf53124fa589535acbc738", "122421e94ca49ee41ffe6570d3c4b76d78088aa5"]}, "state": "connected", "GeoIP": " ", "macuidmapping": {"0a2d302103cd45b978cf53124fa589535acbc738": ["F276CCACD478", "00163EEA03AF", "00163E6FE1D7"], "122421e94ca49ee41ffe6570d3c4b76d78088aa5": ["627972E00677"], "062ccaf12f3639af08ac772594d50a2baccd8d02": ["5EDD340BAF35", "00163E30A232"]}, "unmanagednodelist": ["10.82.128.183", "10.82.128.3"], "node_name": "3", "mac": "5EDD340BAF35", "ip4": "10.82.128.35", "timestamp": 1490817481, "receivecount": "", "sendcount": "", "starttime": 1490817364, "name": "062ccaf12f3639af08ac772594d50a2baccd8d02"}, {"interval":"1491195660000","uid": "0a2d302103cd45b978cf53124fa589535acbc738", "links": {"on_demand": [], "chord": [], "successor": ["122421e94ca49ee41ffe6570d3c4b76d78088aa5", "062ccaf12f3639af08ac772594d50a2baccd8d02"]}, "state": "connected", "GeoIP": "70.171.32.182", "macuidmapping": {"0a2d302103cd45b978cf53124fa589535acbc738": ["F276CCACD478", "00163EEA03AF", "00163E6FE1D7"], "122421e94ca49ee41ffe6570d3c4b76d78088aa5": ["627972E00677"], "062ccaf12f3639af08ac772594d50a2baccd8d02": ["5EDD340BAF35", "00163E30A232"]}, "unmanagednodelist": ["10.82.128.100", "10.82.128.56"], "node_name": "1", "mac": "F276CCACD478", "location": {"latitude": "29.573099136353", "city": "Gainesville", "region": "FL", "longitude": "-82.407600402832", "country": "United States"}, "ip4": "10.82.128.15", "timestamp": 1490817481, "receivecount": "", "sendcount": "", "starttime": 1490817364, "name": "0a2d302103cd45b978cf53124fa589535acbc738"}, {"interval":"1491195660000","uid": "122421e94ca49ee41ffe6570d3c4b76d78088aa5", "links": {"on_demand": [], "chord": [], "successor": ["0a2d302103cd45b978cf53124fa589535acbc738", "062ccaf12f3639af08ac772594d50a2baccd8d02"]}, "state": "connected", "GeoIP": "70.171.32.182", "macuidmapping": {"0a2d302103cd45b978cf53124fa589535acbc738": ["F276CCACD478", "00163EEA03AF", "00163E6FE1D7"], "122421e94ca49ee41ffe6570d3c4b76d78088aa5": ["627972E00677"], "062ccaf12f3639af08ac772594d50a2baccd8d02": ["5EDD340BAF35", "00163E30A232"]}, "unmanagednodelist": [], "node_name": "2", "mac": "627972E00677", "location": {"latitude": "29.573099136353", "city": "Gainesville", "region": "FL", "longitude": "-82.407600402832", "country": "United States"}, "ip4": "10.82.128.25", "timestamp": 1490817481, "receivecount": "", "sendcount": "", "starttime": 1490817364, "name": "122421e94ca49ee41ffe6570d3c4b76d78088aa5"}],
    "1491595260000" : [{"interval":"1491595260000","uid": "062ccaf12f3639af08ac772594d50a2baccd8d02", "links": {"on_demand": [], "chord": [], "successor": ["0a2d302103cd45b978cf53124fa589535acbc738"]}, "state": "connected", "GeoIP": " ", "macuidmapping": {"0a2d302103cd45b978cf53124fa589535acbc738": ["F276CCACD478", "00163EEA03AF", "00163E6FE1D7"], "122421e94ca49ee41ffe6570d3c4b76d78088aa5": ["627972E00677"], "062ccaf12f3639af08ac772594d50a2baccd8d02": ["5EDD340BAF35", "00163E30A232"]}, "unmanagednodelist": ["10.82.128.183", "10.82.128.3"], "node_name": "3", "mac": "5EDD340BAF35", "ip4": "10.82.128.35", "timestamp": 1490817481, "receivecount": "", "sendcount": "", "starttime": 1490817364, "name": "062ccaf12f3639af08ac772594d50a2baccd8d02"}, {"interval":"1491595260000","uid": "0a2d302103cd45b978cf53124fa589535acbc738", "links": {"on_demand": [], "chord": [], "successor": ["062ccaf12f3639af08ac772594d50a2baccd8d02"]}, "state": "connected", "GeoIP": "70.171.32.182", "macuidmapping": {"0a2d302103cd45b978cf53124fa589535acbc738": ["F276CCACD478", "00163EEA03AF", "00163E6FE1D7"], "122421e94ca49ee41ffe6570d3c4b76d78088aa5": ["627972E00677"], "062ccaf12f3639af08ac772594d50a2baccd8d02": ["5EDD340BAF35", "00163E30A232"]}, "unmanagednodelist": ["10.82.128.100", "10.82.128.56"], "node_name": "1", "mac": "F276CCACD478", "location": {"latitude": "29.573099136353", "city": "Gainesville", "region": "FL", "longitude": "-82.407600402832", "country": "United States"}, "ip4": "10.82.128.15", "timestamp": 1490817481, "receivecount": "", "sendcount": "", "starttime": 1490817364, "name": "0a2d302103cd45b978cf53124fa589535acbc738"}],
    "1491195560000" : [{"interval":"1491195560000","uid": "062ccaf12f3639af08ac772594d50a2baccd8d02", "links": {"on_demand": [], "chord": [], "successor": []}, "state": "connecting", "GeoIP": " ", "macuidmapping": { "062ccaf12f3639af08ac772594d50a2baccd8d02": ["5EDD340BAF35", "00163E30A232"]}, "unmanagednodelist": ["10.82.128.183", "10.82.128.3"], "node_name": "3", "mac": "5EDD340BAF35", "ip4": "10.82.128.35", "timestamp": 1490817481, "receivecount": "", "sendcount": "", "starttime": 1490817364, "name": "062ccaf12f3639af08ac772594d50a2baccd8d02"}]
}

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

@app.route('/History/getTopologyHistoryData', methods=['GET', 'POST'])
@cross_origin()
def loadHistoryTemplate():
    starttime = str(request.query_string).split(",")
    outputdata = networkdetails
    responseMsg = {"response": outputdata}
    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    return resp


# History webservice functionality for a particular UID
@app.route('/History/getTopologyHistory', methods=['GET', 'POST'])
@cross_origin()
def loadhistory():
    return render_template('ipop_history.html')


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
        logging.error("Exception::"+str(err.message))
