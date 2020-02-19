# -*- coding: utf-8 -*-
import os
import json
import dateutil.parser

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

    # with open('./data/' + event_id + '/current/products/overlay.js', 'w') as f:
    #         print('var overlayCoords =', file=f)
    with open('./data/' + event_id + '/current/products/overlay.json', 'w') as outfile:
            json.dump(js_file, outfile)

    return None

def get_products_list(event_id):
    """
        Get the list of products generated for an event and write them to file
    """
    with open('productsDownloadList.json') as json_file:
        productMeta = json.load(json_file)
    
    products_path = './data/' + event_id + '/current/products/'

    fileList = [ item for item in os.listdir(products_path) if os.path.isfile(os.path.join(products_path, item)) ]

    productsList = []
    for fileName in fileList:
        fileMeta = next((x for x in productMeta if x['name']==fileName),
                     {'name': fileName, 'desc': '-', 'cat': '-'}
                     )
        product_dict = {
                'file': fileName,
                'desc': fileMeta['desc'],
                'cat': fileMeta['cat']
                }
        productsList.append(product_dict)
        
#    with open(products_path + 'productList.js', 'w') as f:
#        print('var productsList =', file=f)
    with open(products_path + 'productList.json', 'w') as outfile:
        json.dump(productsList, outfile)

    return None

def get_parameters (event_id):
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
            'latitude': info_file['input']['event_information']['latitude'],
            'longitude': info_file['input']['event_information']['longitude'],
            'magnitude': info_file['input']['event_information']['magnitude'],
            'depth': info_file['input']['event_information']['depth']
            }


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

def main():
    event_list = []
    products_list = []
    for event in get_event_ids():
        print('Processing event:' + event)

        ## Try to read the info.json file to put the events in a list for the website to read
        try:
            event_list.append(get_parameters(event))
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

if __name__ == "__main__":
    main()
