#!/usr/bin/env python

import time, json, sys, logging
from flask import Flask, make_response, render_template, request, flash, redirect, url_for
from flask_cors import CORS, cross_origin
from pymongo import MongoClient
from collections import defaultdict

statkeys = ('uid', 'name', 'node_name', 'mac', 'ip4', 'GeoIP', 'starttime', 'location')

py_ver = sys.version_info[0]
app = Flask(__name__)
app.secret_key = 'IPOP UI'
CORS(app)

#Initializing Global variables
mc = MongoClient()
# mc.drop_database('ipop_db') - aggregator drops it on start
ipopdb = mc.ipop_db
nodeData = ipopdb.nd

timeout = 15
stoptimeout = 45 # not used anymore
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

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
def filterlinks(linkslist, set1):
    linkslist['successor'] = list(set(linkslist['successor']) & set1)
    linkslist['chord'] = list(set(linkslist['chord']) & set1)
    linkslist['on_demand'] = list(set(linkslist['on_demand']) & set1)
    return linkslist

def getNodeHistory(starttime, endtime):
    print starttime, endtime
    pip = [{'$project':{'uid':1, 'mac':1, 'node_name':1, 'ip4':1, 'name':1, 'GeoIP':1, 'location':1, 'starttime':1, 'history':{'$filter':{'input':'$history', 'as':'histitem', 'cond':{'$and':[{'$gte':['$$histitem.timestamp', starttime]}, {'$lte':['$$histitem.timestamp', endtime]}]}}}}}, {'$match':{'history':{'$exists':True}}}]
    outp = defaultdict(list)
    for node in nodeData.aggregate(pip):
        ndinfo = {sk:node[sk] for sk in statkeys}
        for tt in node['history']:
            insinfo = ndinfo.copy()
            insinfo.update(tt)
            insinfo['interval'] = str(tt['timestamp'])
            outp[tt['timestamp']].append(insinfo)
    return dict(outp)


# Gets list of all running and stopped nodes
def getNodeStatus(filterNodes=None, attime=None):
    stoppedNodes, currNodes = [], [] # list of stopped node info strings, list of current node dicts
    sNset, rNset, cLset = set(), set(), set() # stoppedNodes, runningNodes, currentLinks
    # Functionality to retrieve state at given time, not used!
    #if attime != None: # query for state at particular time (no subnode functionality)
    #    reftime = attime - timeout
    #    pip = [{'$project':{'uid':1, 'mac':1, 'node_name':1, 'ip4':1, 'name':1, 'GeoIP':1, 'location':1, 'history':{'$filter':{'input':'$history', 'as':'histitem', 'cond':{'$lte':['$$histitem.timestamp', reftime]}}}}}, {'$project':{'history':{'$arrayElemAt':['$history', -1]}, 'uid':1, 'mac':1, 'node_name':1, 'ip4':1, 'name':1}}, {'$match':{'history':{'$exists':True}}}]
    #    for node in nodeData.aggregate(pip):
    #        node.update(node['history']) # update node main info with history 
    #        del node['history'], node['_id']
    #        if node['timestamp'] < reftime: # if the last report had timed out, change state
    #            node['state'] = 'stopped' 
    #            # stopped node links are not considered as active links, but should we show them in graph?
    #            # stoppedNodes.append(str(node['uid'] + ' - ' + node['node_name']))
    #            sNset.add(node['uid'])
    #        else: # add to current running node set and update current active links set
    #            rNset.add(node['uid'])
    #            cLset.update(set(node['links']['on_demand'] + node['links']['chord'] + node['links']['successor']))
    #        currNodes.append(node)
    #    # remove all stopped nodes that are not in current active links 
    #    torem = sNset - cLset
    #    currNodes = filter(lambda cn: cn['uid'] not in torem, currNodes)
    if filterNodes == None: # query for current state
        reftime = int(time.time()) - timeout
        for node in nodeData.find({}, {'history':{'$slice':-1}}):
            node.update(node['history'][0]) # update history with history[0] - flatten the dict inside a singleton list
            del node['history'], node['_id']
            if node['timestamp'] < reftime: # if the last report had timed out, change state
                node['state'] = 'stopped' 
                # stopped node links are not considered as active links, but should we show them in graph?
                # stoppedNodes.append(str(node['uid'] + ' - ' + node['node_name']))
                sNset.add(node['uid'])
            else: # add to current running node set and update current active links set
                rNset.add(node['uid'])
                cLset.update(set(node['links']['on_demand'] + node['links']['chord'] + node['links']['successor']))
            currNodes.append(node)
        # remove all stopped nodes that are not in current active links 
        torem = sNset - cLset
        currNodes = filter(lambda cn: cn['uid'] not in torem, currNodes)
    else: # query for subgraph at current state
        nlist = filterNodes
        pip = [{'$project':{'history':{'$arrayElemAt':['$history', -1]}, 'uid':1, 'mac':1, 'node_name':1, 'ip4':1, 'name':1, 'starttime':1, 'location':1, 'GeoIP':1}},
                {'$project':{'history':1, 'tsize':{'$add':[{'$size':{'$setIntersection':['$history.links.successor', nlist]}}, {'$size':{'$setIntersection':['$history.links.chord', nlist]}}, {'$size':{'$setIntersection':['$history.links.on_demand', nlist]}}]}, 'uidmatch':{'$in':['$uid', nlist]}, 'uid':1, 'mac':1, 'node_name':1, 'ip4':1, 'name':1, 'starttime':1, 'location':1, 'GeoIP':1}},
                {'$match':{'$or':[{'uidmatch':{'$eq':True}}, {'tsize':{'$gt':0}}]}}
                ]
        reftime = int(time.time()) - timeout
        for node in nodeData.aggregate(pip):
            node.update(node['history'])
            del node['history'], node['_id']
            if node['timestamp'] < reftime:
                node['state'] = 'stopped'
                sNset.add(node['uid'])
            else:
                rNset.add(node['uid'])
            currNodes.append(node)
        filterset = set(filterNodes)
        for ni in range(len(currNodes)):
            if currNodes[ni]['uidmatch']:
                currNodes[ni]['links'] = filterlinks(currNodes[ni]['links'], rNset)
            else:
                currNodes[ni]['links'] = filterlinks(currNodes[ni]['links'], filterset)
            del currNodes[ni]['uidmatch'], currNodes[ni]['tsize']
    return stoppedNodes, sorted(currNodes, key = lambda n:n['uid'])


# Sub-Graph Webservice functionality
@app.route('/subgraph', methods=['GET', 'POST'])
@cross_origin()
def getGraph():
    nodelist = str(request.query_string).split(",")
    try:
        _, outputdata = getNodeStatus(nodelist)
    except Exception as err:
        logging.error("Exception in Sub graph node details:"+str(err))
    responseMsg = {"response": outputdata}
    resp = make_response(json.dumps(responseMsg))
    resp.headers['Content-Type'] = "application/json"
    return resp

# History Webservice functionality
@app.route('/History/getTopologyHistoryData', methods=['GET', 'POST'])
@cross_origin()
def loadHistoryTemplate():
    #print request.args, request.form
    timest = int(request.args['starttime']) # an epoch timestamp is sent
    timeend = int(request.args['endtime'])
    #try:
    outputdata = getNodeHistory(timest, timeend)
    #except Exception as err:
    #    logging.error("Exception in history node details:"+str(err))
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
    try:
        stoppedNodes, nodeDetailsList = getNodeStatus()
        responseMsg = {"response":{
                            "runningnodes": nodeDetailsList,
                            "stoppednodes": stoppedNodes
                            } }
        resp = make_response(json.dumps(responseMsg))
        resp.headers['Content-Type'] = "application/json"
        return resp
    except Exception as err:
        logging.info("Exception occured in nodedata function.")
        logging.error("Exception::"+str(err))

def main(ipv4):
    app.run(host=ipv4,port=8080,threaded=True)                             # Start the IPOP webserver

if __name__ == "__main__":
    if len(sys.argv)>1:
        ipv4 = sys.argv[1]
    else:
        ipv4 = '0.0.0.0'
    try:
        main(ipv4)
    except Exception as err:
        log.error("Exception::"+str(err.message))
