#!/usr/bin/env python

import time, json, sys, logging, urllib2, json
from flask import Flask, make_response, render_template, request, flash, redirect, url_for
from flask_cors import CORS, cross_origin
from pymongo import MongoClient
from threading import Lock, Thread

batchdelay = 5

py_ver = sys.version_info[0]
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
app.secret_key = 'IPOP VIS'
CORS(app)

#Initializing Global variables
lock = Lock()
statkeys = ('uid', 'name', 'node_name', 'mac', 'ip4', 'starttime', 'GeoIP')
dkeys = ('links', 'timestamp', 'macuidmapping', 'state', 'sendcount', 'receivecount', 'unmanagednodelist')
mc = MongoClient()
mc.drop_database('ipop_db')
ipopdb = mc.ipop_db
nodeData = ipopdb.nd
tempbatch = {}

# Receives data from IPOP Controllers
@app.route('/insertdata',methods=['GET', 'POST'])
@cross_origin()
def listener():
    msg = request.json
    #print "inserting", msg
    lock.acquire()
    tempbatch[msg["uid"]] = msg
    # update uptime with aggregator timezone
    lock.release()
    return "200"

def getloc(geoip):
    locdata = {}
    try:
        #{u'status': u'success', u'data': {u'geo': {u'city': u'Gainesville', u'dma_code': u'592', u'ip': u'70.171.32.182', u'region': u'FL', u'isp': u'Cox Communications Inc. ', u'area_code': u'352', u'continent_code': u'NA', u'datetime': u'2017-03-29 15:02:00', u'latitude': u'29.573099136353', u'host': u'70.171.32.182', u'postal_code': u'32608', u'longitude': u'-82.407600402832', u'country_code': u'US', u'country_name': u'United States', u'timezone': u'America/New_York', u'asn': u'AS22773', u'rdns': u'ip70-171-32-182.ga.at.cox.net'}}, u'description': u'Data successfully received.'}
        resp = urllib2.urlopen("https://tools.keycdn.com/geo.json?host=" + geoip)
        geod = json.loads(resp.read())
        if geod['status'] == 'success':
            geod = geod['data']['geo']
            locdata['city'] = geod['city']
            locdata['region'] = geod['region']
            locdata['latitude'] = geod['latitude']
            locdata['longitude'] = geod['longitude']
            locdata['country'] = geod['country_name']
    except Exception, e:
        print "Error in getloc: ", e
        return {}
    return locdata

def batchtimer():
    global tempbatch # need to process the batch
    while True:
        time.sleep(batchdelay) # wait for batchdelay seconds
        lock.acquire()  # acquire lock and atomically swap with empty dict
        tempbatch, toprocess = {}, tempbatch
        lock.release()
        currtime = int(time.time()) # all the timestamps are modified to currtime - to change TZ and set a common time ref
        for msg in toprocess.itervalues():
            msg["starttime"] = msg["timestamp"] = currtime # set starttime for setOnInsert, if upsert, only push history
            res = nodeData.update_one({"uid":msg["uid"]}, {"$push":{"history":{dk:msg[dk] for dk in dkeys}}, "$setOnInsert":{sk:msg[sk] for sk in statkeys}}, upsert=True)
            if res.upserted_id != None and len(msg["GeoIP"].strip()) > 0: # upsert took place
                # update location
                res = nodeData.update_one({"uid":msg["uid"]}, {"$set":{"location":getloc(msg["GeoIP"])}})

def main(ipv4):
    bthread = Thread(target=batchtimer)
    bthread.start()
    app.run(host=ipv4,port=8888,threaded=True)                             # Start the IPOP webserver

if __name__ == "__main__":
    if len(sys.argv)>1:
        ipv4 = sys.argv[1]
    else:
        ipv4 = '0.0.0.0'
        #print("Server IP details required!!")
        #print("Enter Server IP::")
        #if py_ver == 2:
        #    ipv4 = str(raw_input())
        #else:
        #    ipv4 = str(input())
    try:
        main(ipv4)
    except Exception as err:
        log.error("Exception::" + str(err.message))
