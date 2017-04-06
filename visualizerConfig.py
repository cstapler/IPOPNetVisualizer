#!/usr/bin/env python

import logging

conf = {
    'dbname': 'ipopdb',
    'colname': 'nd',
}

aggr_conf = {
    'ip': '0.0.0.0',
    'port': 8080,
    'batchdelay': 15,
    'clear_on_start': True,
    'log_level': logging.INFO,
    'log_filename':'aggr.log',
}

vis_conf = {
    'ip': '0.0.0.0',
    'port': 8888,
    'timeout': 45,
    'log_level': logging.INFO,
    'log_filename':'centVis.log',
}
