#!/usr/bin/env python

import time,traceback,socket,json,yaml,sys,logging
from flask import Flask, make_response
from flask_cors import CORS
from threading import Lock,Thread

app = Flask(__name__)
CORS(app)
global nodeData
nodeData = {}
global isLocked
isLocked = False

def listener(ipv4, recv_port):
        logging.info("Listener starting....")
        # initialize receiver socket
        recv_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        recv_sock.bind((ipv4, recv_port))
        while True:
           data = recv_sock.recv(8192)
           lock.acquire()
           isLocked = True
           msg = yaml.safe_load(data)
           msg["uptime"]=int(time.time())
           nodeData[msg["uid"]] = msg
           lock.release()
           isLocked = False


@app.route('/nodedata', methods=['GET', 'POST'])
def nodedata():
        count = 0
        while len(nodeData)==0:
	    lock.acquire()
            if count ==0:
                thread_listener.start()
            count+=1
	    lock.release()
        while isLocked==True:
            count = count
        lock.acquire()
        responseMsg = {"response": nodeData}
        lock.release()
        resp = make_response(json.dumps(responseMsg))
        resp.headers['Content-Type'] = "application/json"
        resp.headers['Access-Control-Allow-Origin'] = "*"
        logging.info(json.dumps(nodeData))
        return resp



def main():
    app.run(debug=True,threaded=True)

if __name__ == "__main__":
    ipv4 = sys.argv[1]
    port = int(sys.argv[2])
    logging.basicConfig(filename="/home/vyassu/server.log",level=logging.INFO,format='%(asctime)s %(message)s')
    try:
        global lock
        lock = Lock()
        thread_listener = Thread(target=listener,args=(ipv4,port))
        global count
        main()
    except:
        logging.error(traceback.format_exc())
        print(traceback.format_exc())
        thread_listener.join(100)
        sys.exit()

    

