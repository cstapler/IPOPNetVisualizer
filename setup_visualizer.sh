#!/bin/bash
sudo apt-get install -y mongodb
python -m pip install virtualenv
python -m virtualenv venv
source ./venv/bin/activate
python -m pip install -r requirements.txt
nohup python aggr.py &> aggr.log &
sleep 2s
nohup python centVis.py &> centVis.log &
