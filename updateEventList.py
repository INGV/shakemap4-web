# -*- coding: utf-8 -*-
import os
import json
import dateutil.parser
import argparse, sys

def get_event_ids ():
    """
        Get event IDs from the list of folders in data folder
    """
    root='./data'
    dirlist = [ item for item in os.listdir(root) if os.path.isdir(os.path.join(root, item)) ]
    return dirlist

def separate_time_date(time):
    """
        Get time and date as separate variables from the time in ISO8601 format
    """
    dateTime = dateutil.parser.parse(time)
    year = dateTime.year
    month = dateTime.month
    day = dateTime.day
    hour = dateTime.hour
    minute = dateTime.minute
    second = dateTime.second

    return (year, month, day, hour, minute, second)

def overlay_to_json(event_id):
    info_file_path = './data/' + event_id + '/current/products/intensity_overlay.pngw'
    with open(info_file_path, 'r') as overlay:
        overlay_file = overlay.readlines()

    overlay_file = list(map(str.strip, overlay_file))
    overlay_file = list(map(float, overlay_file))

    js_file = {
            'dx': overlay_file[0],
            'dy': overlay_file[3],
            'upper_left_x': overlay_file[4],
            'upper_left_y': overlay_file[5]
        }

    with open('./data/' + event_id + '/current/products/overlay.json', 'w') as outfile:
            json.dump(js_file, outfile)

    return None

def get_bBox_dict():
    if (os.path.isfile('bBox.txt')):
        with open('bBox.txt') as json_file:
            bBox = json.load(json_file)[0]
        return bBox
    else:
        return False

def get_products_list(event_id):
    """
        Get the list of products generated for an event and write them to file
    """
    with open('productsDownloadList.json') as json_file:
        productMeta = json.load(json_file)

    products_path = './data/' + event_id + '/current/products/'

    fileList = [ item for item in os.listdir(products_path) if os.path.isfile(os.path.join(products_path, item)) ]

    productsList = []

    for product in productMeta:
        if product['name'] in fileList:
            productsList.append(product)


    with open(products_path + 'productList.json', 'w') as outfile:
        json.dump(productsList, outfile)

    return None

def get_parameters (event_id, bBox):
    """
        Get the event parameters from the info.json file of an event
    """
    info_file_path = './data/' + event_id + '/current/products/info.json'
    with open(info_file_path) as f:
        info_file = json.load(f)

    year, month, day, hour, minute, second = separate_time_date(info_file['input']['event_information']['origin_time'])

    parameter_dict = {
            'id': event_id,
            'description': info_file['input']['event_information']['event_description'],
            'day': day,
            'month': month,
            'year': year,
            'hour': hour,
            'minute': minute,
            'second': second,
            'latitude': round(float(info_file['input']['event_information']['latitude']), 2),
            'longitude': round(float(info_file['input']['event_information']['longitude']), 2),
            'magnitude': round(float(info_file['input']['event_information']['magnitude']), 1),
            'depth': round(float(info_file['input']['event_information']['depth']), 1)
            }

    if (bBox == False):
        bBox = {"minLat": -90.0, "maxLat": 90.0, "minLon": -180.0, "maxLon" : 180.0}


    if ( parameter_dict['latitude'] < bBox["minLat"] or parameter_dict['latitude'] > bBox["maxLat"] or
        parameter_dict['longitude'] < bBox["minLon"] or parameter_dict['longitude'] > bBox["maxLon"]):
        return False
    else:
        return parameter_dict

def write_list_to_file(event_list):
    """
        Write event information to file.
    """
    ## This next line is written so the file is saved as a javascript variable
    ## so the ajax call in the website could be avoided
    with open('events.js', 'w') as f:
        print('var events =', file=f)
    with open('events.js', 'a') as outfile:
        json.dump(event_list, outfile)

def write_version_file():
    yaml_file_path = 'publiccode.yml'
    with open(yaml_file_path, 'r') as yaml:
        yaml_file = yaml.readlines()

    versionElement = [s for s in yaml_file if "softwareVersion" in s][0][:-1]

    versionElement = versionElement.replace('software', 'Website ')

    with open('softwareVersion.js', 'w') as f:
        print('var softwareVersion = "' + versionElement +
        '";document.getElementById("footer_text").innerHTML = softwareVersion;', file=f)

    return

def do_for_all_events(bBox):
    event_list = []
    for event in get_event_ids():
        print('Processing event:' + event)

        ## Try to read the info.json file to put the events in a list for the website to read
        try:
            eventParameters = get_parameters(event, bBox)
            if (eventParameters != False):
                event_list.append(eventParameters)
        except Exception as e:
            print('Following error occurred for event ' + event + ':')
            print(e)

        ## Try to extract overlay parameters and put them into a json file, so the website can read it
        try:
            overlay_to_json(event)
        except Exception as e:
            print('No intensity overlay file for event:' + event)
            print(e)

        ## Try to get products list and put them into a json file, so the website can read it
        try:
            get_products_list(event)
        except Exception as e:
            print('Product file list error for event ' + event + ':')
            print(e)

    write_list_to_file(event_list)
    write_version_file()

def update_event_list(eventParameters, event_id):
    with open('events.js', 'r') as f:
        events_list = json.loads(f.readlines()[1])

    events_list = [eventParameters if x['id']==str(event_id) else x for x in events_list]

    write_list_to_file(events_list)


def do_for_one_event(event_id, bBox):
    print('Processing event: ' + event_id)
            ## Try to read the info.json file to put the events in a list for the website to read
    try:
        eventParameters = get_parameters(event_id, bBox)
        if (eventParameters != False):
            update_event_list(eventParameters, event_id)
    except Exception as e:
        print('Following error occurred for event ' + event_id + ':')
        print(e)

    ## Try to extract overlay parameters and put them into a json file, so the website can read it
    try:
        overlay_to_json(event_id)
    except Exception as e:
        print('No intensity overlay file for event:' + event_id)
        print(e)

    try:
        get_products_list(event_id)
    except Exception as e:
        print('Product file list error for event ' + event_id + ':')
        print(e)


def main(event_id):
    bBox = get_bBox_dict()
    if event_id == False:
        do_for_all_events(bBox)
    else:
        do_for_one_event(event_id, bBox)

if __name__ == "__main__":
    parser=argparse.ArgumentParser()

    parser.add_argument('--eventid', help='Provide the event ID under the script argument --eventid of the event for which the parameters or files have been changed. To run the script for all events write --eventid="all"')

    if len(sys.argv[:]) < 2:
        print('Error: No event ID has been provided. To run the script for all the events write eventid="all" as the argument')
    else:
        if (args.eventid == 'all'):
            main(False)
        else:
            main(args.eventid)
