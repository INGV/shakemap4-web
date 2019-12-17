#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed May  9 10:07:32 2018

@author: dario
"""
import os
import socketserver
import webbrowser
import json
import sys
#import pandas as pd
#from xml.etree import ElementTree as ET

try:
    import http.server
except ImportError:
        import SimpleHTTPServer

#def add_event_infos(events):
#    table = []
#    for ID in events:
#        try:
#            file = ET.parse('data/' + ID + '/current/event.xml')
#            input_data = file.getroot()
#            
#            depth = input_data.find('depth').attrib.get('value')
#            lat = input_data.find('latitude').attrib.get('value')
#            lon = input_data.find('longitude').attrib.get('value')
#            netid = "INGV"
#            mag = input_data.find('magnitude').attrib.get('value')
#            locstring = input_data.find('location').attrib.get('value')
#            time = input_data.find('origin_time').attrib.get('value')
#        except IOError:
#            print(f"No event.xml file for event {ID}")
#


def events_to_json():
    """ Use the names of the directories in data folder as event list """
    events = [x for x in os.listdir('./data/') if os.path.isdir('data/' + x)]
    
#    event_table = add_event_infos(events)
    
    filename = 'events.json'
    if os.path.exists(filename):
        os.remove(filename)
        
    with open(filename, 'w') as outfile:
        json.dump(events, outfile)

def run_server():
    PORT = 7400
    webbrowser.open('http://localhost:7400/')
    
    Handler = http.server.SimpleHTTPRequestHandler
    
    httpd = socketserver.TCPServer(('', PORT), Handler)
    print('serving at port', PORT)
    httpd.serve_forever()
#    with socketserver.TCPServer(("", PORT), Handler) as httpd:
#        print("serving at port", PORT)
#        httpd.serve_forever()

def main():
    events_to_json()
    run_server()
    
if __name__ == "__main__":
    main()
    
    
