// The colors of the station triangles on the map are defined here, based
// on the network a station is part in the following way: network: 'color'
var stationColors = {
  IT: '#FFFFFF',
  IV: '#F340A8'
}

// The colors of the intensity contours are defined here in the following way:
// intensityValue: 'color'
var intColors = {
  1: '#FFFFFF',
  1.5: '#FFFFFF',
  2: '#ACD8E9',
  2.5: '#ACD8E9',
  3: '#ACD8E9',
  3.5: '#ACD8E9',
  4: '#83D0DA',
  4.5: '#83D0DA',
  5: '#7BC87F',
  5.5: '#7BC87F',
  6: '#F9F518',
  6.5: '#F9F518',
  7: '#FAC611',
  7.5: '#FAC611',
  8: '#FA8A11',
  8.5: '#FA8A11',
  9: '#F7100C',
  9.5: '#F7100C',
  10: '#C80F0A'
};


// The intensity colors are taken from https://github.com/usgs/earthquake-impact-utils/blob/master/impactutils/colors/cpalette.py as
// this is the script where shakemap takes it from

var intColors_USGS = {
  1: '#FFFFFF',
  2: '#BFCCFF',
  3: '#A0E6FF',
  4: '#80FFFF',
  5: '#7AFF93',
  6: '#FFFF00',
  7: '#FFC800',
  8: '#FF9100',
  9: '#FF0000',
  10: '#C80000'
};

// The weights of the intensity contours are defined here. They make lines
// thicker or thinner. Currently the weights are based on the remainder of
//  division of intensity value with 1, ergo key zero is for the whole numbers
// and 0.5 for halfsteps
var intWeights = {
  0: 4,
  0.5: 2
}

// The dashed property of the intensity contours are defined here. It makes lines
// dashed or not dashed, they are defined for use in Leaflet dashArray style property.
// Currently the weights are based on the remainder of division of intensity value
// with 1, ergo key zero is for the whole numbers and 0.5 for halfsteps
var lineStyle = {
  0: '0, 0',
  0.5: '10, 10'
}
